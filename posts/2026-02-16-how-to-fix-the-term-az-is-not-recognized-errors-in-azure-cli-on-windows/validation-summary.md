# Validation Summary: How to Fix 'The Term az Is Not Recognized' Errors in Azure CLI on Windows

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure CLI
- Windows PowerShell
- Windows PATH environment variable
- WinGet
- Chocolatey
- Python pip
- Windows Subsystem for Linux
- Azure DevOps Pipelines
- GitHub Actions

## Sources Consulted
- Microsoft Learn: Install the Azure CLI on Windows: https://learn.microsoft.com/en-us/cli/azure/install-azure-cli-windows
- Microsoft Learn: How to install the Azure CLI: https://learn.microsoft.com/en-us/cli/azure/install-azure-cli
- Microsoft Learn: Install the Azure CLI on Linux: https://learn.microsoft.com/en-us/cli/azure/install-azure-cli-linux
- Microsoft Learn: AzureCLI@2 - Azure CLI v2 task: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/azure-cli-v2
- Microsoft Learn: about_Execution_Policies: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_execution_policies
- Microsoft Learn: about_Signing: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_signing
- Azure CLI GitHub Action README: https://github.com/Azure/cli
- Chocolatey package page for azure-cli: https://community.chocolatey.org/packages/azure-cli
- PyPI package page for azure-cli: https://pypi.org/project/azure-cli/

## Issues Found
- The WinGet install command used `winget install Microsoft.AzureCLI`. Microsoft documents `winget install --exact --id Microsoft.AzureCLI` to ensure the official package is selected. Updated the command and clarified WinGet availability.
- The PowerShell execution policy section said execution policy can prevent running `az.cmd`. PowerShell execution policies apply to PowerShell scripts and configuration files, not normal `.cmd` execution. Updated the section to focus on profiles or custom wrapper scripts that might be blocked.
- The alias section said PowerShell defines built-in aliases that might conflict with `az`. There is no standard built-in `az` alias. Updated the wording to refer to custom aliases or functions.
- The GitHub Actions guidance said `azure/cli@v2` handles installation and authentication. The Azure CLI action runs CLI scripts, while authentication is typically handled by `azure/login@v2`. Updated the guidance to mention both actions and their roles.

## Review Notes
The MSI, PATH restart, default Windows install locations, WSL separate installation guidance, `az version`, `az login`, `az account list --output table`, and `az upgrade` guidance align with current official documentation. The pip installation path guidance is technically plausible because the `azure-cli` package is published on PyPI, but Microsoft's current Windows installation docs emphasize MSI, ZIP, and WinGet rather than pip.
