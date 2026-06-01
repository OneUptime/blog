# Validation Summary: How to Configure Azure PowerShell DSC for Linux VM Configuration Management

## Status
validated

## Post Type
Tutorial / legacy configuration guide

## Technologies Covered
- Azure Automation State Configuration
- PowerShell Desired State Configuration
- DSC for Linux
- Azure VM DSC extension for Linux
- Open Management Infrastructure
- PowerShell `nx` DSC resources
- Azure PowerShell Az.Automation
- Azure CLI automation extension
- Terraform AzureRM provider
- Linux package, service, file, user, SSH, firewall, nginx, and PostgreSQL configuration

## Sources Consulted
- Microsoft Learn: DSC for Linux Resources - https://learn.microsoft.com/en-us/powershell/dsc/getting-started/lnxgettingstarted?view=dsc-1.1
- Microsoft Learn: Enable Azure Automation State Configuration - https://learn.microsoft.com/en-us/azure/automation/automation-dsc-onboarding
- Microsoft Learn: Compile DSC configurations in Azure Automation State Configuration - https://learn.microsoft.com/en-us/azure/automation/automation-dsc-compile
- Microsoft Learn: `az automation configuration` CLI reference - https://learn.microsoft.com/en-us/cli/azure/automation/configuration?view=azure-cli-latest
- Microsoft Learn: `New-AzAutomationModule` - https://learn.microsoft.com/en-us/powershell/module/az.automation/new-azautomationmodule
- Microsoft Learn: `Start-AzAutomationDscCompilationJob` - https://learn.microsoft.com/en-us/powershell/module/az.automation/start-azautomationdsccompilationjob
- Microsoft Learn: `Get-AzAutomationDscNode` - https://learn.microsoft.com/en-us/powershell/module/az.automation/get-azautomationdscnode
- Microsoft Learn: `Get-AzAutomationDscNodeReport` - https://learn.microsoft.com/en-us/powershell/module/az.automation/get-azautomationdscnodereport
- Microsoft Learn: DSC for Linux `nxPackage` resource - https://learn.microsoft.com/en-us/powershell/dsc/reference/resources/linux/lnxpackageresource?view=dsc-1.1
- Microsoft Learn: DSC for Linux `nxUser` resource - https://learn.microsoft.com/en-us/powershell/dsc/reference/resources/linux/lnxuserresource?view=dsc-1.1
- Microsoft Learn: DSC for Linux `nxScript` resource - https://learn.microsoft.com/en-us/powershell/dsc/reference/resources/linux/lnxscriptresource?view=dsc-1.1
- Microsoft Learn: Azure DSC extension overview - https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/dsc-overview
- Terraform Registry: `azurerm_virtual_machine_extension` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_machine_extension

## Issues Found
- The post presented Azure Automation DSC for Linux as a current setup path. Microsoft retired Azure Automation DSC for Linux and the DSC VM extension for Linux on September 30, 2023; the PowerShell DSC for Linux project was archived on September 12, 2024; OMI was deprecated on March 24, 2025; and Azure Automation State Configuration is scheduled for retirement on September 30, 2027. I reframed the post as legacy-only and added explicit warnings.
- The Azure CLI module import example used undocumented/incorrect `az automation module` commands. I replaced it with the documented `New-AzAutomationModule` and `Get-AzAutomationModule` cmdlets.
- The local compile instruction incorrectly said to use PowerShell 7. DSC 1.1 Linux resources are a Windows PowerShell-era workflow, so I changed it to Windows PowerShell 5.1 and added the missing dot-source step before calling the configuration function.
- The Azure CLI upload/compile example used invalid flags and commands: `--source-control-name` is not a valid `az automation configuration create` option, and `az automation configuration create-or-update` is not a documented CLI command. I replaced it with a documented `az automation configuration create --source-type embeddedContent --source ...` example and clarified that compilation must be done through the portal, Azure PowerShell, or REST API.
- The compliance-checking examples used undocumented `az automation dsc-node` and `az automation dsc-node-report` commands. I replaced them with the documented `Get-AzAutomationDscNode` and `Get-AzAutomationDscNodeReport` cmdlets.
- Some DSC samples could attempt to set ownership on users created by packages before those packages were installed. I added `DependsOn` to the nginx web content directory and PostgreSQL backup directory resources.
- Package manager values were normalized from lowercase examples to the documented `Apt` / `Yum` spelling.

## Review Notes
The post is technically accurate after being reframed as a legacy reference. It should not be used as guidance for greenfield Linux VM configuration management in 2026; Azure Machine Configuration or another supported Linux configuration management tool is the appropriate direction for new work.
