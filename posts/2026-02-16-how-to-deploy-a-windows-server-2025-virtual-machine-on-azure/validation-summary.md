# Validation Summary: How to Deploy a Windows Server 2025 Virtual Machine on Azure

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Microsoft Azure Virtual Machines
- Windows Server 2025
- Windows Server Datacenter: Azure Edition
- Azure CLI
- Azure Bastion
- Azure Disk Encryption and Key Vault
- Azure Hybrid Benefit
- Azure Monitor Agent
- Microsoft Defender Antivirus
- Microsoft Antimalware extension
- PowerShell
- IIS and ASP.NET Core Hosting Bundle

## Sources Consulted
- Microsoft Learn: Azure CLI `az vm` reference, including `az vm create`, `az vm show`, `az vm update`, and `az vm extension set`: https://learn.microsoft.com/en-us/cli/azure/vm
- Microsoft Learn: Azure CLI `az vm image` reference: https://learn.microsoft.com/en-us/cli/azure/vm/image
- Microsoft Learn: Automatic Guest Patching for Azure Virtual Machines and Scale Sets: https://learn.microsoft.com/en-us/azure/virtual-machines/automatic-vm-guest-patching
- Microsoft Learn: Hotpatch for Windows Server: https://learn.microsoft.com/en-us/windows-server/get-started/hotpatch
- Microsoft Learn: Enable Hotpatch for Azure Arc-enabled servers: https://learn.microsoft.com/en-us/windows-server/get-started/enable-hotpatch-azure-arc-enabled-servers
- Microsoft Learn: SMB over QUIC: https://learn.microsoft.com/en-us/windows-server/storage/file-server/smb-over-quic
- Microsoft Learn: Azure boot diagnostics: https://learn.microsoft.com/en-us/azure/virtual-machines/boot-diagnostics
- Microsoft Learn: Azure CLI `az network bastion rdp` reference: https://learn.microsoft.com/en-us/cli/azure/network/bastion
- Microsoft Learn: Azure CLI `az network nsg rule` reference: https://learn.microsoft.com/en-us/cli/azure/network/nsg/rule
- Microsoft Learn: Azure CLI `az network nic ip-config` reference: https://learn.microsoft.com/en-us/cli/azure/network/nic/ip-config
- Microsoft Learn: Azure CLI `az vm encryption` reference: https://learn.microsoft.com/en-us/cli/azure/vm/encryption
- Microsoft Learn: Explore Azure Hybrid Benefit for Windows VMs: https://learn.microsoft.com/en-us/azure/virtual-machines/windows/hybrid-use-benefit-licensing
- Microsoft Learn: Enable VM monitoring in Azure Monitor: https://learn.microsoft.com/en-us/azure/azure-monitor/vm/vm-enable-monitoring
- Microsoft Learn: Microsoft Antimalware Extension for Windows VMs on Azure: https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/iaas-antimalware-windows
- Microsoft Learn: PowerShell `Get-HotFix`: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-hotfix
- Microsoft Learn: Use WinGet to install and manage applications: https://learn.microsoft.com/en-us/windows/package-manager/winget/

## Issues Found
- Corrected the Azure Edition feature description so SMB over QUIC is not presented as Azure Edition-only for Windows Server 2025.
- Changed "Check available sizes and pricing" to "Check available sizes" because `az vm list-sizes` does not return pricing.
- Replaced the deprecated `az vm list-sizes` command with `az vm list-skus`, which the Azure CLI reference recommends for current VM SKU availability checks.
- Clarified that `Get-HotFix` checks recently installed hotfixes, not whether hotpatching itself is enabled.
- Changed the RDP NSG rule name from `rdp` to `RDP` to match the rule created by `--nsg-rule RDP`.
- Changed the NIC public IP removal property to `PublicIpAddress`, matching common Azure CLI generic update usage for this property.
- Changed `--volume-type All` to `--volume-type ALL` to match current Azure CLI accepted values.
- Retitled the Defender section from Microsoft Defender for Endpoint to Microsoft Defender Antivirus because the commands shown check the local antivirus service and run a scan; they do not onboard the server to Defender for Endpoint.

## Review Notes
The local environment did not have Azure CLI installed, so CLI verification was done against current Microsoft Learn CLI reference pages rather than local `az --help`. The tutorial remains a general deployment guide; production environments should also use organization-specific identity, patch orchestration, data collection rules for Azure Monitor Agent, and access policies.
