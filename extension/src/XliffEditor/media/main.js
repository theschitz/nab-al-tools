/**
 * This script will be run within the webview itself
 * It cannot access the main VS Code APIs directly.
 */

(function () {
    const vscode = acquireVsCodeApi();

    /*
    // Handle messages sent from the extension to the webview
    window.addEventListener('message', event => {
        const message = event.data; // The json data that the extension sent
        switch (message.command) {
            case 'refactor':
                currentCount = Math.ceil(currentCount * 0.5);
                counter.textContent = currentCount;
                break;
        }
    });
    */

    let inputs = document.getElementsByTagName('textarea');
    for (let i = 0; i < inputs.length; i++) {
        const textArea = inputs[i];
        // Save changes to xlf
        textArea.addEventListener(
            'change',
            (e) => {
                vscode.postMessage({
                    command: 'update',
                    text: `Updated transunit: ${e.target.id}`,
                    transunitId: e.target.id,
                    targetText: e.target.value
                })
            },
            false
        );
    }

    // Filter buttons
    document.getElementById("btn-filter-clear").addEventListener(
        "click",
        (e) => {
            vscode.postMessage({
                command: "filter",
                text: "all"
            });
        });
    document.getElementById("btn-filter-review").addEventListener(
        "click",
        (e) => {
            vscode.postMessage({
                command: "filter",
                text: "review"
            });
        });
    document.getElementById("btn-reload").addEventListener(
        "click",
        (e) => {
            vscode.postMessage({
                command: "reload",
            });
        });
    // Complete Checkboxes
    let checkboxes = document.getElementsByTagName("input");
    for (let i = 0; i < checkboxes.length; i++) {
        const checkbox = checkboxes[i];
        // Complete translation
        checkbox.addEventListener(
            'change',
            (e) => {
                let id = e.target.id.replace('-complete', '');
                vscode.postMessage({
                    command: 'complete',
                    text: `${e.target.checked ? "Completed" : "Uncompleted"} transunit: ${id}`,
                    transunitId: id,
                    checked: e.target.checked
                })
            },
            false
        );
    }

    /**
     * Copy Source //TODO: Maybe add back in at a later date
     */
    // let buttons = document.getElementsByClassName("btn-cpy-src");
    // for (let i = 0; i < buttons.length; i++) {
    //     const checkbox = buttons[i];
    //     // Complete translation
    //     checkbox.addEventListener(
    //         "click",
    //         (e) => {
    //             let id = e.target.id.replace('-copy-source', '');
    //             let sourceText = document.getElementById(`${id}-source`).innerText;
    //             document.getElementById(id).value = sourceText;
    //             vscode.postMessage({
    //                 command: 'update',
    //                 text: `Updated transunit: ${id}`,
    //                 transunitId: id,
    //                 targetText: sourceText
    //             })
    //         },
    //         false
    //     );
    // }
}());