import {
    TaskDefinition,
    window,
    commands,
    Disposable,
    ExtensionContext,
    StatusBarAlignment,
    StatusBarItem,
    TextDocument,
    workspace,
    OutputChannel,
    ShellExecution,
    Task,
    TaskScope,
    Terminal,
    FileSystemWatcher,
    RelativePattern,
    WorkspaceConfiguration,
    ConfigurationTarget
} from 'vscode';
import * as ChildProcess from 'child_process';
import * as Path from 'path';
import * as Fs from 'fs';

class TypeScriptCompilerFileWatcher {
    private filename: string;
    private pattern: RelativePattern;
    private watcher: FileSystemWatcher;
    private eventType: string;

    private constructor() {
    }

    public watch(fn: Function) {
        var self = this;

        if (self.filename) self.watcher = workspace.createFileSystemWatcher(self.filename);
        else if (self.pattern) self.watcher = workspace.createFileSystemWatcher(self.pattern);

        self.watcher.onDidCreate(function (event) {
            self.eventType = 'created';
            if (fn) fn({ filename: event.fsPath, eventType: self.eventType });
        });
        self.watcher.onDidChange(function (event) {
            self.eventType = 'changed';
            if (fn) fn({ filename: event.fsPath, eventType: self.eventType });
        });
        self.watcher.onDidDelete(function (event) {
            self.eventType = 'deleted';
            if (fn) fn({ filename: event.fsPath, eventType: self.eventType });
        })
    }

    public dispose() {
        this.watcher.dispose();
    }

    public static fromFile(file: string): TypeScriptCompilerFileWatcher {
        var tfw = new TypeScriptCompilerFileWatcher();
        tfw.filename = Path.normalize(file);

        return tfw;
    }

    public static FromPattern(pattern: RelativePattern): TypeScriptCompilerFileWatcher {
        var tfw = new TypeScriptCompilerFileWatcher();
        tfw.pattern = pattern;

        return tfw;
    }
}

class TypeScriptCompilerStatusChannel {
    private statusItem: StatusBarItem;

    public constructor() {
        if (!this.statusItem) this.statusItem = window.createStatusBarItem(StatusBarAlignment.Right);
    }

    public updateStatus(shortText: string, longTooltip: string, color: string) {
        this.statusItem.tooltip = longTooltip;
        this.statusItem.text = shortText;
        this.statusItem.color = color;
        this.statusItem.show();
    }

    public dispose() {
        if (this.statusItem) this.statusItem.dispose();
    }
}

class TypeScriptCompiler {

    private watchers: { [id: string]: TypeScriptCompilerFileWatcher } = {};
    private statusChannel: TypeScriptCompilerStatusChannel;
    private output: OutputChannel;
    private tsconfig: string;
    private tsconfigCompileOnSave: boolean = true;
    private configurations = {
        alertOnError: 'alertOnError',
        alertTSConfigChanges: 'alertTSConfigChanges'
    }

    public constructor() {
        var self = this;

        self.statusChannel = new TypeScriptCompilerStatusChannel();
        self.statusChannel.updateStatus('$(zap) TS [...]', 'TypeScript Auto Compiler - warming up...', 'white');

        if (!self.output) self.output = window.createOutputChannel("TypeScript Auto Compiler");

        workspace.findFiles('**/tsconfig.json').then((files) => {
            if (!files || files.length == 0) return;
            self.setTsConfigFile(files[0].fsPath);
        })

        {
            let pattern = new RelativePattern(workspace.workspaceFolders[0], '**/*.ts');
            let watcher = TypeScriptCompilerFileWatcher.FromPattern(pattern);
            watcher.watch(e => {
                if (e.filename) self.compile(e.filename)
            });
            self.watchers[pattern.pattern] = watcher;
        }

        {
            let pattern = new RelativePattern(workspace.workspaceFolders[0], '**/tsconfig.json');
            let watcher = TypeScriptCompilerFileWatcher.FromPattern(pattern);
            watcher.watch(e => {
                if (e.eventType == 'created') self.setTsConfigFile(e.filename);
                else if (e.eventType == 'deleted') self.setTsConfigFile(null);

                if (e.eventType == 'changed') {
                    self.updatesTsConfigBuildOnSaveOptions();
                    self.compile(e.filename);
                } 
            });
            self.watchers[pattern.pattern] = watcher;
        }

        self.statusChannel.updateStatus('$(eye) TS [ON]',
            'TypeScript Auto Compiler is ON - Watching file changes.', 'white');
    }

    public dispose() {
        this.statusChannel.dispose();
        this.output.dispose();

        [].forEach.call(this.watchers, watch => {
            watch.dispose();
        });
    }

    private readConfiguration(key, defaultValue?: string): string {
        // Reading existing configurations for extensions
        var configurationNode = workspace.getConfiguration(`vscode.tsc.compiler`);
        return configurationNode.get(key, defaultValue);
    }

    private setConfiguration(key, value) {
        var configurationNode = workspace.getConfiguration(`vscode.tsc.compiler`);
        return configurationNode.update(key, value, ConfigurationTarget.Workspace);
    }

    private updatesTsConfigBuildOnSaveOptions() {
        if (this.tsconfig != null) {
            const contents = Fs.readFileSync(this.tsconfig).toString();
            const configs = JSON.parse(contents);
            
            if (configs && configs.compileOnSave != null) {
                this.tsconfigCompileOnSave = configs.compileOnSave as boolean;
            }
        } else {
            this.tsconfigCompileOnSave = true;
        }
    }

    private setTsConfigFile(filename?: string) {
        var msg: string;

        const alertTSConfig = this.readConfiguration(this.configurations.alertTSConfigChanges, 'always');

        if (filename) {
            this.tsconfig = filename;
            msg = 'Found tsconfig.json file at \'' + this.tsconfig + '\'. File will be used for TypeScript Auto Compile routines.';
        } else {
            this.tsconfig = null;
            msg = 'Previous tsconfig.json file at \'' + this.tsconfig + '\' was removed. Building each \'.ts\' file.';
        }
        if (alertTSConfig === 'always') {
            window.showInformationMessage(msg, 'Dismiss', 'Never show again')
                .then(opted => {
                    if (opted === 'Never show again') {
                        this.setConfiguration(this.configurations.alertTSConfigChanges, 'never');
                    }
                })
        }

        this.updatesTsConfigBuildOnSaveOptions();
    }

    private getNodeModulesBinPath(): Promise<string> {
        return new Promise((resolve, reject) => {
            ChildProcess.exec('npm bin', { cwd: workspace.rootPath }, (error, stdout, stderr) => {
                if (error) resolve('');
                else resolve(stdout.trim());
            })
        })
    }


    private getNodeModules(): Promise<any> {
        return new Promise((resolve, reject) => {
            ChildProcess.exec('npm ls --json', { cwd: workspace.rootPath }, (error, stdout, stderr) => {
                if (error) resolve(null);
                else resolve(JSON.parse(stdout.trim()));
            })
        })
    }

    private findSpecificModule(modules: any, name: string): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!modules) resolve(false);
            else resolve(modules.dependencies != null ? modules.dependencies[name] != null : false);
        })
    }

    private testTscPathEnvironment() {
        return new Promise((resolve, reject) => {
            ChildProcess.exec('tsc --version', { cwd: workspace.rootPath }, (error, stdout, stderr) => {
                if (error) resolve(false);
                else resolve(true);
            })
        })
    }

    private defineTypescriptCompiler(): Promise<any> {
        var binPath: string;

        return new Promise((resolve, reject) => {
            this.getNodeModulesBinPath()
                .then(path => {
                    binPath = path;
                    return this.getNodeModules()
                })
                .then(modules => {
                    return this.findSpecificModule(modules, 'typescript')
                })
                .then(exists => {
                    if (exists) resolve(`${binPath}\\tsc`);
                    else return this.testTscPathEnvironment()
                })
                .then(existsEnv => {
                    if (!existsEnv) reject(`There is no TypeScript compiler available for this workspace. Try to install via npm install typescript command or download it from https://www.typescriptlang.org/index.html#download-links`)
                    else resolve('tsc');
                });
        })
    }

    private compile(fspath: string) {
        var self = this;

        if (!this.tsconfigCompileOnSave) {
            window.setStatusBarMessage(`tsconfig.json from workspace turned off 'auto compiling on save' feature.`, 5000);
            self.statusChannel.updateStatus('$(alert) TS [ON]', `TypeScript Auto Compiler can't build on save - see tsconfig.json.`, 'tomato');            
            return;
        }

        var filename = Path.basename(fspath);
        var ext = Path.extname(filename).toLowerCase();

        if (ext == '.ts' || filename == 'tsconfig.json') {
            self.statusChannel.updateStatus('$(beaker) TS [ ... ]',
                'TypeScript Auto Compiler is ON - Compiling changes...', 'cyan');

            var status = "Auto compiling file \'" + filename + "\'";
            window.setStatusBarMessage(status, 5000);
            self.output.appendLine(status);

            this.defineTypescriptCompiler()
                .then(tsc => {
                    console.log(tsc);
                    var command = `${tsc} ${fspath}`;

                    if (self.tsconfig) {
                        command = `${tsc} -p \"${self.tsconfig}\"`;
                        self.output.appendLine("Using tsconfig.json at \'" + self.tsconfig + "\'");
                    }

                    ChildProcess.exec(command, { cwd: workspace.rootPath }, (error, stdout, stderr) => {
                        self.statusChannel.updateStatus('$(eye) TS [ON]',
                            'TypeScript Auto Compiler is ON - Watching file changes.', 'white');

                        if (error) {
                            // self.output.show();
                            self.output.appendLine(error.message);
                            self.output.appendLine(stdout.trim().toString());
                            self.output.appendLine('');

                            const showError = this.readConfiguration(self.configurations.alertOnError, 'always');
                            showError === 'always' ?
                                window.showInformationMessage(
                                    `Compile errors ocurred while building .ts files.`,
                                    'Dismiss', 'Show output', 'Never show again')
                                    .then(opted => {
                                        if (opted === 'Show output') self.output.show();
                                        else if (opted === 'Never show again') {
                                            this.setConfiguration(self.configurations.alertOnError, 'never');
                                        }
                                    })
                                : console.log(`Not showing error informational message`)

                            window.setStatusBarMessage(error.message, 5000);
                        } else {
                            var successMsg = 'TypeScript Auto Compilation succedded.';

                            window.setStatusBarMessage(successMsg, 5000);
                            self.output.appendLine(successMsg);
                            self.output.appendLine('');
                        }
                    })
                })
                .catch(error => {
                    self.statusChannel.updateStatus('$(alert) TS [ON]',
                        'TypeScript Auto Compiler encountered an errror.', 'tomato');
                    window.showInformationMessage(error, 'Dismiss')
                })
        }
    }
}

export { TypeScriptCompiler };