# Typescript Auto Compiler
## Visual Studio Code Extension

This is a TypeScript extension designed to build automatically any opened .ts on file changes.

> Important Note: this extension still is in BETA build and may not work properly in specific scenarios
Fill free to report any bugs and features in [GitHub Extension Repository](https://github.com/morissonmaciel/vscode-tsc-compiler). 

# Important Breaking Change 🚨

Due to restrictions realted to the implementation for multi-root workspaces and cross-platform compilation, the extension now needs a proper `tsconfig.json` file to work.

* For single folder/root workspace, just place `tsconfig.json` file inside root folder or any subfolder
* For multi folder/root workspace, place `tsconfig.json` inside any subfolder for specific root folder automatically changes and build activation

<img width="1392" alt="captura de tela 2018-12-06 as 16 51 52" src="https://user-images.githubusercontent.com/11509104/49607485-38902880-f97d-11e8-83b0-d1cee7483af6.png">

> Foolder with .ts files and without any proper `tsconfig.json` associated will never be compiled

> Remember to install **tsc** (Typescript Compiler) using `package.json` in each root folder or globally with `npm install -g typescript`

<img width="1392" alt="captura de tela 2018-12-06 as 16 57 54" src="https://user-images.githubusercontent.com/11509104/49607513-5067ac80-f97d-11e8-86e8-2e3838df3411.png">

For intance, you can place this dependency inside `package.json` file 
```json
{
    "devDependencies": {
        "typescript": "^3.2.1"
    }
}
```

## Features

* Build automatically `.ts` TypeScripts files changed in editor
* Detect any `tsconfig.json` definition file in current workspace (single and multi-root workspace)

## Requirements

External TypeScript compiler (aka `tsc`) must be installed to work properly.

```
    npm install -g typescript
```

Additionally you can use isolated typescripts in each folder from your multi-root workspace

**Now works properly in Windows/Unix/Mac environments**
> Note: No longer needed a TypeScript bootstrap installation in Windows. You can use you workspace `node_modules` or global `node_modules` instead.

You can download the compiler in [TypeScript Lang Download page](https://www.typescriptlang.org/index.html#download-links)

## Extension Settings

Two brand new settings are available.

* vscode.tsc.compiler.alertOnError

Controls when an alert for compiling errors should be display for user. Values: ['always', 'never']

* vscode.tsc.compiler.alertTSConfigChanges

Controls when an alert should be display for user when tsconfig.json file is found/removed from extension watcher. Values: ['always', 'never']

These setting are automactlly changed to `never` when you hit the **Never show again** button from alerts.

## Known Issues

Support for multi root workspace has arrived. No other issues has been found. Fell free to report any issue in our GitHub page.

(https://github.com/morissonmaciel/vscode-tsc-compiler/issues)

## Release Notes

BETA features available are working properly for common scenarios:
* Single and multi-root workspace
* Single `tsconfig.json` file for each folder in multi-root workspace
* Multiples `.ts` files

### 0.7.0 👍🏽
December improvements made to extension:

* Extension now accepts multi-root workspace 
* Extension honors `tconfig.json`configuration in each folder in multi-root workspace
* Extension now works properly in UNIX/Mac environment, along Windows platform

 ~ Thanks to [@capricorn86](https://github.com/morissonmaciel/vscode-tsc-compiler/commits?author=capricorn86)!

### 0.6.5 🌟
Fall improvements made to extension:

* Extension now honors `tsconfig.json` **compileOnSave** configuration
* Detecting changes in `tsconfig.json` fires a new alert, which can be disabled in *'Never show again'*
* Errors in compilation proccess now fires a new alert, which can be disabled in *'Never show again'* or show the **Output** panel with more error details
* Extenions uses **tsc** compiler in following order: from your `node_modules` dependencies (no need for a full Windows installation); from global `node_modules` path; then from Environment Path (Windows .exe installation).  

Thanks for all 2K extension downloads and 🌟🌟🌟🌟 review in Visual Studio Market Place

### 0.5.5

Some improvements in file detection:

* Activation by `*.ts` and `tsconfig.json` file events in workspace
* Changes in `*.ts` and `tsconfig.json` files fire new builds
* `tsconfig.json` creation and deletion events updates build mode for workspace
* Changes in the normal plugin color in status bar (white everytime and changes only when events are ocurring)

More plataform agnostic with `.exe` (Windows Executable) dependency remotion ~ Thanks to [@daslicht](https://github.com/morissonmaciel/vscode-tsc-compiler/commits?author=daslicht)!

### 0.5.2

Non-obtrusive console messages when compilation succeeded

### 0.5.1

Initial release of vscode-tsc-compiler
 

-----------------------------------------------------------------------------------------------------------
