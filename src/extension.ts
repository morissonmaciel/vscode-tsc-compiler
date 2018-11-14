'use strict';
import { TaskDefinition, window, commands, Disposable, ExtensionContext, StatusBarAlignment, StatusBarItem, TextDocument, workspace, OutputChannel, ShellExecution, Task, TaskScope, Terminal } from 'vscode';
import { TypeScriptCompiler } from "./TypeScriptCompiler"

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {

    console.log('Congratulations, your extension "typescript-auto-compiler" is now active!');

    const compiler = new TypeScriptCompiler();
    
    compiler.watch();

    // let disposable = commands.registerCommand('extension.sayHello', () => {
    //     window.showInformationMessage('Hello World!');
    // });

    context.subscriptions.push(compiler);
}

// this method is called when your extension is deactivated
export function deactivate() {
}
