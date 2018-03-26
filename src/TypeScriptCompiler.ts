import { TaskDefinition, window, commands, Disposable, ExtensionContext, StatusBarAlignment, StatusBarItem, TextDocument, workspace, OutputChannel, ShellExecution, Task, TaskScope, Terminal, FileSystemWatcher } from 'vscode';
import * as ChildProcess from 'child_process';
import * as Path from 'path';

class TypeScriptCompilerFileWatcher {
    private filename: string;
    private watcher: FileSystemWatcher;
    private eventType: string;

    public constructor(file: string) {
        this.filename = Path.normalize(file);
    }

    public watch(fn: Function) {
        var self = this;

        if (!self.watcher) self.watcher = workspace.createFileSystemWatcher(self.filename, true, false, false);

        self.watcher.onDidChange(function (event) {
            self.eventType = 'changed';
            if (fn) fn({ filename: self.filename, eventType: self.eventType });
        });
        self.watcher.onDidDelete(function (event) {
            self.eventType = 'deleted';
            if (fn) fn({ filename: self.filename, eventType: self.eventType });
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

class TypeScriptCompiler {

    private watchers: { [id: string]: TypeScriptCompilerFileWatcher } = {};
    private statusChannel: TypeScriptCompilerStatusChannel;
    private output: OutputChannel;
    private tsconfig: string;

    public constructor() {
        var self = this;

        self.statusChannel = new TypeScriptCompilerStatusChannel();
        self.statusChannel.updateStatus('$(zap) TS [...]', 'TypeScript Auto Compiler - warming up...', 'white');

        if (!self.output) self.output = window.createOutputChannel("TypeScript Auto Compiler");

        workspace.findFiles('**/*.ts').then(files => {
            if (!files || files.length == 0) return;

            [].forEach.call(files, file => {
                var tsFile = file.fsPath;

                self.watchers[tsFile] = new TypeScriptCompilerFileWatcher(tsFile);
                self.watchers[tsFile].watch(e => {
                    if (e.eventType == 'changed') self.compile(tsFile)
                })
            });
        });

        workspace.findFiles('**/tsconfig.json').then((files) => {
            if (!files || files.length == 0) return;

            var tsfile = files[0].fsPath;

            self.watchers[tsfile] = new TypeScriptCompilerFileWatcher(tsfile);
            self.watchers[tsfile].watch(e => {
                if (e.eventType == 'changed') self.compile(tsfile)
            })
            self.tsconfig = tsfile;

            window.showInformationMessage('Found tsconfig.json file at \'' + files[0].path + '\'. File will be used for TypeScript Auto Compile routines. ', 'Dismiss');
        })

        // workspace.onDidChangeTextDocument(e => {
        //     var filename = Path.basename(e.document.fileName).toLowerCase();
        //     var ext = Path.extname(e.document.fileName).toLowerCase();

        //     if (ext == '.ts' || filename == 'tsconfig.json') {
        //         self.statusChannel.updateStatus('$(history) TS [ON]',
        //             'TypeScript Auto Compiler is ON - File changed! Wainting for save command.', 'white')
        //     }
        // }, self);
        // workspace.onDidSaveTextDocument(e => {
        //     self.compile(e.fileName);
        // }, self);

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

    private compile(fspath: string) {
        var filename = Path.basename(fspath);
        var ext = Path.extname(filename).toLowerCase();
        var self = this;

        if (ext == '.ts' || filename == 'tsconfig.json') {
            self.statusChannel.updateStatus('$(beaker) TS [ON]',
                'TypeScript Auto Compiler is ON - Compiling changes...', 'cyan');

            var status = "Auto compiling file \'" + filename + "\'";
            window.setStatusBarMessage(status, 5000);
            self.output.appendLine(status);

            var command = "tsc " + fspath;

            if (self.tsconfig) {
                command = "tsc -p \"" + self.tsconfig + "\"";
                self.output.appendLine("Using tsconfig.json at \'" + self.tsconfig + "\'");
            }

            ChildProcess.exec(command, { cwd: workspace.rootPath }, (error, stdout, stderr) => {
                self.statusChannel.updateStatus('$(eye) TS [ON]',
                    'TypeScript Auto Compiler is ON - Watching file changes.', 'white');

                if (error) {
                    self.output.show();
                    self.output.appendLine(error.message);
                    self.output.appendLine(stdout.trim().toString());
                    self.output.appendLine('');

                    window.setStatusBarMessage(error.message, 5000);
                } else {
                    var successMsg = 'TypeScript Auto Compilation succedded.';

                    window.setStatusBarMessage(successMsg, 5000);
                    self.output.appendLine(successMsg);
                    self.output.appendLine('');
                }
            });
        }
    }
}

export { TypeScriptCompiler };