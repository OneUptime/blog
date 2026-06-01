# Validation Summary: How to Configure Azure Cloud Shell with Custom Scripts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Cloud Shell
- Azure Storage Accounts and Azure Files
- Azure CLI
- Azure PowerShell / PowerShell profiles
- Bash shell configuration
- Cloud Shell file upload and download

## Sources Consulted
- Microsoft Learn: Azure Cloud Shell overview: https://learn.microsoft.com/en-us/azure/cloud-shell/overview
- Microsoft Learn: Persist files in Azure Cloud Shell: https://learn.microsoft.com/en-us/azure/cloud-shell/persisting-shell-storage
- Microsoft Learn: Azure Cloud Shell features: https://learn.microsoft.com/en-us/azure/cloud-shell/features
- Microsoft Learn: How to use the Azure Cloud Shell window: https://learn.microsoft.com/en-in/azure/cloud-shell/using-the-shell-window
- Microsoft Learn: Azure CLI output formats: https://learn.microsoft.com/en-us/cli/azure/format-output-azure-cli
- Microsoft Learn: az storage share command reference: https://learn.microsoft.com/en-us/cli/azure/storage/share
- Microsoft Learn: az storage file command reference: https://learn.microsoft.com/en-us/cli/azure/storage/file

## Issues Found
- The PowerShell profile used `$PSDefaultParameterValues['*:Output'] = 'Table'` to set Azure CLI output. That PowerShell setting does not control output for external `az` commands, so it was changed to `az config set core.output=table`, which is the documented Azure CLI configuration method.
- The built-in Cloud Shell download example used a `download` shell command. Azure Cloud Shell documentation describes using the toolbar Download dialog with a fully qualified path, so the example was corrected to show the path to enter in that dialog.
- The team sharing section used `clouddrive mount` with unsupported-looking flags to mount an additional file share at a custom mount point. Microsoft documents `clouddrive` for the Cloud Shell backing share, including unmount/remount of the Cloud Shell clouddrive, not arbitrary additional mounts. The example was changed to use `az storage file download-batch` to sync a shared Azure Files share into a local directory.
- The troubleshooting section recommended a background keepalive loop for long-running operations. Cloud Shell is documented as an interactive shell with a 20-minute inactivity timeout, so the advice was changed to recommend Azure Automation, Azure Functions, or Azure DevOps pipelines for long-running non-interactive work.

## Review Notes
The remaining Azure CLI storage commands, Azure Files persistence explanation, `$HOME` and `$HOME/clouddrive` persistence behavior, no-root tooling guidance, and 20-minute Cloud Shell inactivity timeout are consistent with the Microsoft Learn documentation consulted.
