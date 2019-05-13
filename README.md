# NAB AL Tools

This extensions is a tool that helps with AL development.

## Features

### XLIFF tools

The workflow for working with these XLIFF tools are

1. Write your code
1. Build your app, so that the g.xlf file gets updated
1. Execute "NAB: Refresh XLF files from g.xlf" from the Command Palette
1. Execute "NAB: Find next untranslated text" from the Command Palette and handle the untranslated/modified translation until you've handled them all

#### NAB: Refresh XLF files from g.xlf

Iterates the g.xlf file and updates all language xlf files.

- The xlf files gets the same ordering as g.xlf
- Translations marked as translate=no gets removed
- Modified translations get's prefixed with [NAB: REVIEW]
- New translations with the sames source language as g.xlf gets copied to target, but prefixed with [NAB: REVIEW]
- New translations with other source language than g.xlf is replaced with [NAB: NOT TRANSLATED]

#### NAB: Find next untranslated text (Ctrl+Alt+U)

Finds the next occurance of the tags [NAB: NOT TRANSLATED] or [NAB: REVIEW] and selects the tag.

- If the tag [NAB: NOT TRANSLATED] is selected, replace it with the translated text
- If the tag [NAB: REVIEW] is selected, review the translation and update if needed, then you remove the tag

#### NAB: Find untranslated texts (* Please read Known Issues below)

Uses the Find in Files feature to search for the tags above.

#### NAB: Find translated texts of current line (* Please read Known Issues below)

Place the cursor on a AL code line that should be translated and execute this command to use the Find in Files feature to find all occurences of the translations 

#### NAB: Find code source of current line ("F12" in xlf files)

Place the cursor somewhere in a trans-unit node in the xlf file and execute this command to navigate to the source code for that translation.

### Other features

#### NAB: Uninstall dependendent apps

Uninstalls dependant apps through PowerShell. Useful if you cannot install your app due to dependencies.

Only works for local installations, not Docker, not Saas Sandbox.

#### NAB: Sign app file

Sign the app file (matching your current app.json). You must first have the Code Signing Certificate installed in the Current User Personal Store (Cert:\CurrentUser\My if you're importing with PowerShell).

#### NAB: Deploy and Run TestTool without Debugger

Useful if you're using a separate app as a test app

Requirements:

- Must be using a workspace
- The main app's workspace folder must be called "App"
- The test app's workspace folder must be called "TestApp"

When this command is  executed, VSCode...

- Updates the launch.json in both App and TestApp to only contain the first configuration (the original launch.json is copied to ".vscode\\launch_bak.json) to avoid the prompt
- Uninstalls all dependent apps (of your main app)
- Build and deploy Main App
- Build and deploy Test App
- Uses the first configuration in the launch.json of the TestApp to eventually launch the web client, without debugging. Tip: Configure this to run page 130401!
- Restores the original launch.json

#### NAB: Deploy and Run TestTool with Debugger

The same feature as above, but with debugging

### Snippets

#### Assign text variable with CopyStr

Since CodeCop rule AA0139 complains on possible overflow, we need to assign text variables with a CopyStr statement

#### Test Codeunit

Inserts a stub Test Codeunit

#### Test Function

Inserts a stub Test Function

#### Test SendNotificationHandler

Inserts a generic SendNotificationHandler function

#### Test MessageHandler

Inserts a generic MessageHandler function

#### Test ConfirmHandler

Inserts a generic ConfirmHandler function

## Requirements

This extension requires the [Microsoft AL Language Extension](https://marketplace.visualstudio.com/items?itemName=ms-dynamics-smb.al "AL Language") to fully work.

## Extension Settings

This extension contributes the following settings:

- `NAB.SigningCertificateName`: The name of the certificate used to sing app files. The certificate needs to be installed to the Personal store. For instructions on how to install the pfx certificate in the Personal Store, go to [Microsoft Docs](https://docs.microsoft.com/en-us/windows-hardware/drivers/install/importing-an-spc-into-a-certificate-store)
- `NAB.SignToolPath`: The full path to signtool.exe, used for signing app files. If this is not set the extension tries to find it on the default locations, if the signtool.exe is not found it tries to download and install signtool

## Known Issues

The Find in Files API is a bit [buggy](https://github.com/microsoft/vscode/issues/29405) right now... I had to create a [PR for VSCode](https://github.com/microsoft/vscode/pull/71626) for this to work properly. This will probably be released in VSCode v1.34, so after that release you'll hopefully see an improvement.

## Release Notes

### 0.3.x

Beta release.

Please submit issues on [GitHub](https://github.com/jwikman/nab-al-tools/issues)

<!--
* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)
-->