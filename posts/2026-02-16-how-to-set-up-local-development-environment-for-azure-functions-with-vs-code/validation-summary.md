# Validation Summary: How to Set Up Local Development Environment for Azure Functions with VS Code

## Status
validated

## Post Type
Tutorial / setup guide

## Technologies Covered
- Azure Functions
- Azure Functions Core Tools v4
- Visual Studio Code
- Azure Functions VS Code extension
- Azurite
- Azure CLI
- .NET isolated worker
- Node.js
- Python
- Azure Queue Storage
- Timer triggers
- REST Client for VS Code

## Sources Consulted
- Microsoft Learn: Develop Azure Functions locally using Core Tools - https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local
- Microsoft Learn: Develop Azure Functions by using Visual Studio Code - https://learn.microsoft.com/en-us/azure/azure-functions/functions-develop-vs-code
- Microsoft Learn: Supported languages in Azure Functions - https://learn.microsoft.com/en-us/azure/azure-functions/supported-languages
- Microsoft Learn: Install and run the Azurite emulator for Azure Storage - https://learn.microsoft.com/en-us/azure/storage/common/storage-install-azurite
- Microsoft Learn: Use the Azurite emulator for local Azure Storage development - https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azurite
- Microsoft Learn: Azure CLI `az storage queue` reference - https://learn.microsoft.com/en-us/cli/azure/storage/queue
- Microsoft Learn: Azure CLI `az storage message` reference - https://learn.microsoft.com/en-us/cli/azure/storage/message
- Microsoft Learn: Manually run a non HTTP-triggered Azure Functions - https://learn.microsoft.com/en-us/azure/azure-functions/functions-manually-run-non-http
- Microsoft Learn: Timer trigger for Azure Functions - https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-timer
- Microsoft Azure Functions Core Tools GitHub repository - https://github.com/Azure/azure-functions-core-tools
- Microsoft VS Code Azure Functions extension source - https://github.com/microsoft/vscode-azurefunctions

## Issues Found
- The prerequisites listed Node.js 20+, but Azure Functions support for Node.js 20 ended on April 30, 2026. Updated the prerequisite to Node.js 22+.
- The Ubuntu/Debian Core Tools install snippet used the Ubuntu package feed for both Ubuntu and Debian. Split the commands into separate Ubuntu and Debian feed setup examples matching Microsoft documentation.
- The `func init` examples used shorthand runtime flags. Updated them to the current documented `--worker-runtime` form for .NET isolated, JavaScript, TypeScript, and Python projects.

## Review Notes
The VS Code debug configuration is broadly consistent with the Azure Functions extension workflow. The Azure Functions extension can generate richer `.vscode/tasks.json` entries for .NET projects, including project-specific working directories and debug flags, so future revisions could recommend using the extension's "Initialize Project for Use with VS Code" command instead of hand-maintaining debug tasks.
