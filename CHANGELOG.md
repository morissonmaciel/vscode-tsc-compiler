# Change Log

### 0.6.5 🌟
Fall improvements made to extension:

* Extension now honor `tsconfig.json` **compileOnSave** configuration
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
