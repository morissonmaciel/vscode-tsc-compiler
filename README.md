# Typescript Auto Compiler
## Visual Studio Code Extension

This is a TypeScript extension designed to build automatically any opened .ts on file changes.

> Important Note: this extension still is in BETA build and may not work properly in specific scenarios
Fill free to report any bugs and features in [GitHub Extension Repository](https://github.com/morissonmaciel/vscode-tsc-compiler). 

## Features

* Build automatically `.ts` TypeScripts files changed in editor
* Detect any `tsconfig.json` definition file in current workspace

> Note: the extension can detect only the first `tsconfig.json` file in the first `workspace`. Support for multiple folders workspace coming soon.

## Requirements

External TypeScript compiler (aka `tsc`) must be installed to work properly.

You can download the compiler in [TypeScript Lang Download page](https://www.typescriptlang.org/index.html#download-links)

> Note: in Windows, be sure that TypeScript installation folder is set in `PATH` variable.

## Extension Settings

No specific settings are necessary to configure the extension.

## Known Issues

The only known issue: the extension is unable to detect more then one `tsconfig.json` files and multiples folders in `workspace`. Support for multiple folders workspace is coming soon.

## Release Notes

BETA features available are working properly for common scenarios:
* Single workspace
* Single folder workspace
* Single `tsconfig.json` file
* Multiples `.ts` files

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
