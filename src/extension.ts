'use strict';
import { TaskDefinition, window, commands, Disposable, ExtensionContext, StatusBarAlignment, StatusBarItem, TextDocument, workspace, OutputChannel, ShellExecution, Task, TaskScope, Terminal } from 'vscode';
import * as ChildProcess from 'child_process';
import * as Path from 'path';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "typescript-auto-compiler" is now active!');

    let compiler = new TypeScriptCompiler();

    // // The command has been defined in the package.json file
    // // Now provide the implementation of the command with  registerCommand
    // // The commandId parameter must match the command field in package.json
    // let disposable = commands.registerCommand('extension.sayHello', () => {
    //     // The code you place here will be executed every time your command is executed

    //     // Display a message box to the user
    //     window.showInformationMessage('Hello World!');
    // });

    context.subscriptions.push(compiler);
}

// this method is called when your extension is deactivated
export function deactivate() {
}

class TypeScriptCompilerDefinition implements TaskDefinition {
    type = 'tsc-auto-build'
}

class TypeScriptCompiler {

    private statusItem: StatusBarItem;
    private output: OutputChannel;
    private tsconfig: string;

    public constructor() {
        var self = this;

        if (!self.statusItem) self.statusItem = window.createStatusBarItem(StatusBarAlignment.Right);
        if (!self.output) self.output = window.createOutputChannel("TypeScript Auto Compiler");

        self.statusItem.tooltip = "TypeScript Auto Compiler is ON - Watching file changes.";
        self.statusItem.text = "$(eye) TS [ON]";
        self.statusItem.color = "orange";
        self.statusItem.show();

        workspace.findFiles('**/tsconfig.json').then((files) => {
            if (files && files.length > 0) {
                self.tsconfig = files[0].fsPath;
                window.showInformationMessage('Found tsconfig.json file at \'' + files[0].path + '\'. File will be used for TypeScript Auto Compile routines. ', 'Dismiss');
            }
        })

        workspace.onDidChangeTextDocument(function (e) {
            if (Path.extname(e.document.fileName).toLowerCase() == '.ts') {
                self.statusItem.color = "orange";
                self.statusItem.tooltip = "TypeScript Auto Compiler is ON - File changed! Wainting for save command.";
                self.statusItem.text = "$(history) TS [ON]";
            }
        }, self);
        workspace.onDidSaveTextDocument(function (e ) {
            if (Path.extname(e.fileName).toLowerCase() == '.ts') {
                self.statusItem.color = "cyan";
                self.statusItem.tooltip = "TypeScript Auto Compiler is ON - Compiling changes...";
                self.statusItem.text = "$(beaker) TS [ON]";

                var filename = window.activeTextEditor.document.fileName;

                self.output.show();
                self.output.appendLine("Auto compiling file \'" + filename + "\'");

                var command = "tsc.exe " + filename;

                if (self.tsconfig) {
                    command = "tsc.exe -p \"" + self.tsconfig + "\"";
                    self.output.show();
                    self.output.appendLine("Using tsconfig.json at \'" + self.tsconfig + "\'");                    
                }

                ChildProcess.exec(command, { cwd: workspace.rootPath }, (error, stdout, stderr) => {
                    self.statusItem.tooltip = "TypeScript Auto Compiler is ON - Watching file changes.";
                    self.statusItem.text = "$(eye) TS [ON]";
                    self.statusItem.color = "orange";
                    self.statusItem.show();

                    if (error) {
                        self.output.show();
                        self.output.appendLine(error.message);
                        self.output.appendLine(stdout.toString());
                        self.output.appendLine('');
                    } else {
                        self.output.show();
                        self.output.appendLine('Compilation succedded.');
                        self.output.appendLine('');
                    }
                });
            }
        }, self);
    }
    public dispose() {
        this.statusItem.dispose();
        this.output.dispose();
    }
}