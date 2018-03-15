# Typescript Auto Compiler
## Visual Studio Code Extension

This is a TypeScript extension designed to build automatically any opened .ts on file changes.

> Important Note: this extension still is in BETA build and may not work properly in specific scenarios
Fill free to report any bugs and features in [GitHub Extension Repository](https://github.com/morissonmaciel/vscode-tsc-compiler). 

## Features

* Build automatically `.ts` TypeScripts files changed in editor
* Detect any `tsconfig.json` definition file in current workspace

> Note: the extension can detect only the first `tsconfig.json` file in the first `workspace`. Support for mutiple folders workspace coming soon.

## Requirements

External TypeScript compiler (aka tsc.exe) must be installed to work properly.

You can download the compiler in [TypeScript Lang Download page](https://www.typescriptlang.org/index.html#download-links)

> Note: be sure that TypeScript installation folder is set in `PATH` variable.

## Extension Settings

No specific settings are necessary to configure the extension.

## Known Issues

The only known issue is the extension uncabability in detect more then one `tsconfig.json` files and mutiples folders in `workspace`. Support for mutiple folders workspace coming soon.

## Release Notes

* BETA features available are working properly for common scenarios. 
** Single workspace
** Single folder workspace
** Single `tsconfig.json` file
** Multiples `.ts` files

### 1.0.0

Initial release of vscode-tsc-compiler

-----------------------------------------------------------------------------------------------------------
