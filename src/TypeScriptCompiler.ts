import {
    window,
    StatusBarAlignment,
    StatusBarItem,
    workspace,
    OutputChannel,
    FileSystemWatcher,
    RelativePattern,
    ConfigurationTarget,
    Uri
} from 'vscode';
import * as stripJsonComments from 'strip-json-comments';
import * as ChildProcess from 'child_process';
import * as Path from 'path';
import * as Fs from 'fs';

class TypeScriptCompilerFileWatcher {
    private watcher: FileSystemWatcher;
    private eventType: string;
    protected pattern: RelativePattern;
    protected output: OutputChannel;
    protected statusChannel: TypeScriptCompilerStatusChannel;

    constructor(output: OutputChannel, statusChannel: TypeScriptCompilerStatusChannel, pattern: RelativePattern) {
        this.output = output;
        this.statusChannel = statusChannel;
        this.pattern = pattern
    }

    public watch(fn: Function) {
        this.watcher = workspace.createFileSystemWatcher(this.pattern);

        this.watcher.onDidCreate((event) => {
            this.eventType = 'created';
            if (fn) fn({ filename: event.fsPath, eventType: this.eventType });
        });
        this.watcher.onDidChange((event) => {
            this.eventType = 'changed';
            if (fn) fn({ filename: event.fsPath, eventType: this.eventType });
        });
        this.watcher.onDidDelete((event) => {
            this.eventType = 'deleted';
            if (fn) fn({ filename: event.fsPath, eventType: this.eventType });
        })
    }

    public dispose() {
        this.watcher.dispose();
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

class TypeScriptCompilerProjectWatcher extends TypeScriptCompilerFileWatcher {

    private tsconfigCompileOnSave: boolean = true;
    private childProcesses: Map<string, ChildProcess.ChildProcess> = new Map();
    private tscPath: string;
    private tsConfigFile: string;

    constructor(output: OutputChannel, statusChannel: TypeScriptCompilerStatusChannel, tsConfigFile: string) {
        super(output, statusChannel, new RelativePattern(Path.dirname(tsConfigFile), '**/*.ts'));
        this.tsConfigFile = tsConfigFile;
    }

    private configurations = {
        alertOnError: 'alertOnError',
        alertTSConfigChanges: 'alertTSConfigChanges'
    }

    public watchProject() {
        this.readTsConfigFile();
        this.watch(e => e.filename && this.compile(e.filename));
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

    private readTsConfigBuildOnSaveOptions() {
        const contents = Fs.readFileSync(this.tsConfigFile).toString();
        let configs = { compileOnSave: false };

        try {
            const stripedContents = stripJsonComments(contents)
            // while editing a tsconfig.json, parsing JSON for stripedContents can missinterpreted as malformed
            configs = stripedContents && stripedContents.length > 0 ? JSON.parse(stripJsonComments(contents)) : {}
        } catch (error) {
            const showError = this.readConfiguration(this.configurations.alertOnError, 'always');
            showError === 'always' ?
                window.showInformationMessage(
                    `Malformed "tsconfig.json" file.`,
                    'Dismiss', 'Show output', 'Never show again')
                    .then(opted => {
                        if (opted === 'Show output') {
                            this.output.show();
                        } else if (opted === 'Never show again') {
                            this.setConfiguration(this.configurations.alertOnError, 'never');
                        }
                    })
                : console.log(`Not showing error informational message`);

            this.output.appendLine('Failed to parse JSON file: ' + this.tsConfigFile + '. Error: ' + error.message);
        }

        if (configs && configs.compileOnSave != null && configs.compileOnSave != undefined) {
            if (configs['include'] instanceof Array) {
                this.pattern = new RelativePattern(Path.dirname(this.tsConfigFile), configs['include'][0]);
            }
            this.tsconfigCompileOnSave = configs.compileOnSave as boolean;
        }
    }

    private readTsConfigFile(filename?: string) {
        const file = filename || this.tsConfigFile
        const alertTSConfig = this.readConfiguration(this.configurations.alertTSConfigChanges, 'always');
        const msg = 'Found tsconfig.json file at \'' + file + '\'. File will be used for TypeScript Auto Compile routines.';

        if (alertTSConfig === 'always') {
            window.showInformationMessage(msg, 'Dismiss', 'Never show again')
                .then(opted => {
                    if (opted === 'Never show again') {
                        this.setConfiguration(this.configurations.alertTSConfigChanges, 'never');
                    }
                })
        }

        this.readTsConfigBuildOnSaveOptions();
    }

    private getNodeModulesBinPath(workspaceFolder: string): Promise<string> {
        return new Promise((resolve) => {
            ChildProcess.exec('npm bin', { cwd: workspaceFolder }, (error, stdout) => {
                if (error) resolve('');
                else resolve(stdout.trim());
            })
        })
    }


    private getNodeModules(workspaceFolder: string): Promise<any> {
        return new Promise((resolve) => {
            ChildProcess.exec('npm list -depth 0 --json', { cwd: workspaceFolder }, (error, stdout) => {
                if (error) resolve(null);
                else resolve(JSON.parse(stdout.trim()));
            })
        })
    }

    private findSpecificModule(modules: any, name: string): Promise<any> {
        return new Promise((resolve) => {
            if (!modules) resolve(false);
            else resolve(modules.dependencies != null ? modules.dependencies[name] != null : false);
        })
    }

    private testTscPathEnvironment(workspaceDir: string) {
        return new Promise((resolve) => {
            ChildProcess.exec('tsc --version', { cwd: workspaceDir }, (error) => {
                if (error) resolve(false);
                else resolve(true);
            })
        })
    }

    private defineTypescriptCompiler(): Promise<any> {
        let binPath: string;
        // workspace.getWorkspaceFolder is not well implemented for multi-root workspace folders 
        // and workspace.rootPath will be deprecated - changing to file scan aproach
        // https://github.com/Microsoft/vscode/issues/28344
        let wsFolder = workspace.workspaceFolders.filter(folder => folder.uri.fsPath.includes(Path.dirname(this.tsConfigFile))).pop()
        let wsCandidateFolder = wsFolder ? wsFolder.uri.fsPath : workspace.rootPath;

        return new Promise((resolve, reject) => {
            if (this.tscPath) {
                resolve(this.tscPath);
            } else {
                this.getNodeModulesBinPath(wsCandidateFolder)
                    .then(path => {
                        binPath = path;
                        return this.getNodeModules(wsCandidateFolder)
                    })
                    .then(modules => {
                        return this.findSpecificModule(modules, 'typescript')
                    })
                    .then(exists => {
                        if (exists) {
                            this.tscPath = `${binPath.split(Path.sep).concat(...[`tsc`]).join(Path.sep)}`;
                            resolve(this.tscPath);
                        } else {
                            return this.testTscPathEnvironment(wsCandidateFolder);
                        }
                    })
                    .then(existsEnv => {
                        if (!existsEnv) {
                            reject(`There is no TypeScript compiler available for this workspace. Try to install via npm install typescript command or download it from https://www.typescriptlang.org/index.html#download-links`);
                        } else {
                            this.tscPath = 'tsc';
                            resolve(this.tscPath);
                        }
                    });
            }
        })
    }

    private compile(fspath: string) {
        if (!fspath.endsWith('.ts')) {
            return;
        }

        if (!this.tsconfigCompileOnSave) {
            window.setStatusBarMessage(`tsconfig.json (from workspace) turned off 'compile on save' feature.`, 5000);

            this.statusChannel.updateStatus('$(alert) TS [ON]',
                `TypeScript Auto Compiler can't build on save - see tsconfig.json.`, 'tomato');

            return;
        }

        const filename = Path.basename(fspath);
        const ext = Path.extname(filename).toLowerCase();

        if (ext == '.ts' || filename == 'tsconfig.json') {
            const status = "Auto compiling file \'" + filename + "\'";

            window.setStatusBarMessage(status, 5000);

            this.output.appendLine('');
            this.output.appendLine(status);

            this.statusChannel.updateStatus('$(beaker) TS [ ... ]',
                `TypeScript Auto Compiler is ON - Compiling changes...`, 'cyan');

            this.defineTypescriptCompiler().then(tsc => {
                console.log(tsc);
                var command = `${tsc} ${fspath}`;

                if (this.tsConfigFile) {
                    command = `${tsc} -p \"${this.tsConfigFile}\"`;
                    this.output.appendLine("Using tsconfig.json at \'" + this.tsConfigFile + "\'");
                }

                if (this.childProcesses.get(filename)) {
                    this.childProcesses.get(filename).kill('SIGHUP');
                }

                this.childProcesses.set(filename, ChildProcess.exec(command, { cwd: workspace.rootPath }, (error, stdout, stderr) => {
                    if (error) {
                        if (error.signal !== 'SIGHUP') {
                            // this.output.show();
                            this.output.appendLine(error.message);
                            this.output.appendLine(stdout.trim().toString());
                            this.output.appendLine('');

                            const showError = this.readConfiguration(this.configurations.alertOnError, 'always');
                            showError === 'always' ?
                                window.showInformationMessage(
                                    `Compile errors ocurred while building .ts files.`,
                                    'Dismiss', 'Show output', 'Never show again')
                                    .then(opted => {
                                        if (opted === 'Show output') {
                                            this.output.show();
                                        }
                                        else if (opted === 'Never show again') {
                                            this.setConfiguration(this.configurations.alertOnError, 'never');
                                        }
                                    })
                                : console.log(`Not showing error informational message`)

                            this.statusChannel.updateStatus('$(eye) TS [ON]',
                                `TypeScript Auto Compiler is ON - Watching file changes.`, 'white');
                            window.setStatusBarMessage(error.message, 5000);
                        } else {
                            this.output.appendLine('');
                            this.output.appendLine('One compilation was canceled as another process started.');
                        }
                    } else {
                        var successMsg = 'TypeScript Auto Compilation succedded.';

                        this.output.appendLine('');
                        this.output.appendLine(successMsg);
                        this.statusChannel.updateStatus('$(eye) TS [ON]',
                            `TypeScript Auto Compiler is ON - Watching file changes.`, 'white');

                        window.setStatusBarMessage(successMsg, 5000);
                    }

                    this.childProcesses.delete(filename);
                }));
            }).catch(error => {
                this.statusChannel.updateStatus('$(alert) TS [ON]',
                    'TypeScript Auto Compiler encountered an errror.', 'tomato');
                window.showInformationMessage(error, 'Dismiss')
            })
        }
    }
}

class TypeScriptCompiler {
    private watchers: TypeScriptCompilerFileWatcher[] = [];
    private output: OutputChannel;
    private isWatching: boolean = false;
    private statusChannel: TypeScriptCompilerStatusChannel;

    public watch() {
        if (!this.isWatching) {
            this.isWatching = true;
            this.output = window.createOutputChannel("TypeScript Auto Compiler");
            this.statusChannel = new TypeScriptCompilerStatusChannel();

            this.output.appendLine('Looking for "tsconfig.json" files..');
            this.output.appendLine('');

            this.watchTsConfigFiles();
            this.watchProjects().then(() => {
                this.statusChannel.updateStatus('$(eye) TS [ON]',
                    'TypeScript Auto Compiler is ON - Watching file changes.', 'white');
                this.output.appendLine('');
                this.output.appendLine('Watching for file changes..');
            });
        }
    }

    public dispose() {
        for (const watcher of this.watchers) {
            watcher.dispose();
        }
        this.watchers = [];
        this.output.dispose();
        this.statusChannel.dispose();
        this.isWatching = false;
    }

    private watchTsConfigFiles() {
        for (const workspaceFolder of workspace.workspaceFolders) {
            const pattern = new RelativePattern(workspaceFolder, '**/tsconfig.json');
            const watcher = new TypeScriptCompilerFileWatcher(this.output, this.statusChannel, pattern);

            this.watchers.push(watcher);

            watcher.watch(() => {
                this.dispose();
                this.watch();
                this.output.appendLine('"tsconfig.json" configuration changed. Reloading plugin..');
                this.output.appendLine('');
            });
        }
    }
    private watchProjects() {
        return this.findFiles().then(files => {
            for (const file of files) {
                const projectCompiler = new TypeScriptCompilerProjectWatcher(this.output, this.statusChannel, file);

                this.output.appendLine('Found "tsconfig.json" file: ' + file);
                this.watchers.push(projectCompiler);

                projectCompiler.watchProject();
            }
        }).catch(error => {
            this.output.appendLine('Failed to start watchers. Error: ' + error.message + '\n' + error.stack);
        });
    }

    private findFiles(): Promise<any> {
        return new Promise(resolve => {
            workspace.findFiles('**/tsconfig.json').then(files => {
                resolve(files.map(file => file.fsPath));
            });
        });
    }
}

export { TypeScriptCompiler };