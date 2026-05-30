# Validation Summary: How to Use Custom Script Extensions with Azure VM Scale Sets

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Virtual Machine Scale Sets
- Azure Custom Script Extension for Linux
- Azure Custom Script Extension for Windows
- Azure CLI
- Azure Resource Manager templates
- Bash
- PowerShell
- nginx
- IIS
- Azure Monitor Dependency Agent extension

## Sources Consulted
- Azure Custom Script Extension for Linux: https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/custom-script-linux
- Azure Custom Script Extension for Windows: https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/custom-script-windows
- Azure CLI `az vmss extension`: https://learn.microsoft.com/en-us/cli/azure/vmss/extension
- Azure CLI `az vmss get-instance-view`: https://learn.microsoft.com/en-us/cli/azure/vmss
- Azure VM Scale Sets extension sequencing: https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/virtual-machine-scale-sets-extension-sequencing
- Azure Monitor Dependency virtual machine extension for Linux: https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/agent-dependency-linux
- ASP.NET Core Hosting Bundle: https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/iis/hosting-bundle

## Issues Found
- The Windows PowerShell sample wrote downloads into `C:\temp` without creating the directory first. Added `New-Item -ItemType Directory -Force -Path C:\temp | Out-Null` before the first download so the sample can run on a clean VM.
- The Windows PowerShell sample used a malformed placeholder Visual Studio download URL for the .NET Hosting Bundle. Replaced it with Microsoft's documented current Hosting Bundle permalink.
- The extension sequencing example used `--provision-after-extensions "DependencyAgentLinux"` on the Custom Script extension, which makes Custom Script run after Dependency Agent. Changed the example to set the `DependencyAgentLinux` extension with `--provision-after-extensions "CustomScript"` so the monitoring extension is provisioned after the Custom Script extension, matching the surrounding explanation.

## Review Notes
- The Custom Script Extension examples use current Linux and Windows publishers and handler versions documented by Microsoft.
- `protectedSettings`, `fileUris`, `commandToExecute`, Azure Blob Storage credentials, extension timeout, idempotency guidance, and log locations were checked against Microsoft documentation.
- The examples use placeholder resource names and application URLs; those are appropriate for a tutorial but must be replaced with real project-specific values before use.
