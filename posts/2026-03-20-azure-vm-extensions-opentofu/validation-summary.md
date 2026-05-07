# Validation Summary: How to Configure Azure VM Extensions with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Azure Virtual Machines
- Azure VM Extensions
- Azure Custom Script Extension for Linux
- Azure Monitor Agent
- Microsoft Entra ID login for Linux VMs
- Azure Disk Encryption
- Microsoft Antimalware for Azure
- Azure CLI

## Sources Consulted
- Microsoft Learn: Azure VM Extensions and Features for Linux - https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/features-linux
- Microsoft Learn: Run Custom Script Extension on Linux VMs in Azure - https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/custom-script-linux
- Microsoft Learn: Install and Manage the Azure Monitor Agent - https://learn.microsoft.com/en-us/azure/azure-monitor/agents/azure-monitor-agent-manage
- Microsoft Learn: Azure Monitor Agent Overview - https://learn.microsoft.com/en-us/azure/azure-monitor/agents/azure-monitor-agent-overview
- Microsoft Learn: Data collection rules in Azure Monitor - https://learn.microsoft.com/en-us/azure/azure-monitor/essentials/data-collection-rule-overview
- Microsoft Learn: Sign in to a Linux virtual machine in Azure by using Microsoft Entra ID and OpenSSH - https://learn.microsoft.com/en-us/entra/identity/devices/howto-vm-sign-in-azure-ad-linux
- Microsoft Learn: Azure Disk Encryption for Linux - https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/azure-disk-enc-linux
- Microsoft Learn: Azure Disk Encryption scenarios on Linux VMs - https://learn.microsoft.com/en-us/azure/virtual-machines/linux/disk-encryption-linux
- Microsoft Learn: Microsoft Antimalware for Azure Cloud Services and Virtual Machines (VMs) - https://learn.microsoft.com/en-us/azure/security/fundamentals/antimalware
- Microsoft Learn: az vm extension - https://learn.microsoft.com/en-us/cli/azure/vm/extension?view=azure-cli-latest
- Terraform Registry: azurerm_virtual_machine_extension - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_machine_extension
- Terraform Registry: azurerm_monitor_data_collection_rule_association - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_data_collection_rule_association

## Issues Found
- The introduction used outdated Azure AD terminology and overstated guest-agent availability. I updated it to Microsoft Entra terminology and clarified that Azure Marketplace images include the guest agent by default.
- The prerequisites said "VM Contributor permissions," but the post also includes an Azure RBAC role assignment example. I corrected this to `Virtual Machine Contributor` and added the requirement for `Microsoft.Authorization/roleAssignments/write`.
- The Azure Monitor Agent example used invalid HCL keys (`identifier-name` and `identifier-value` without quoting) and incorrectly pointed the managed identity value at the VM resource ID. I removed that broken settings block and added a Data Collection Rule association resource, which is required for AMA to actually collect guest logs and metrics.
- The Microsoft Entra SSH login step did not mention the managed-identity prerequisite. I corrected the heading/comment terminology and added the system-assigned managed identity requirement to prerequisites.
- The Linux disk-encryption example used the wrong extension type and handler version. I changed it from `AzureDiskEncryption` `2.2` to `AzureDiskEncryptionForLinux` `1.1`, which matches the documented Linux ADE extension schema.
- The Windows Antimalware example encoded scheduled-scan day/time as strings. I changed them to numeric values so the generated JSON matches the documented configuration shape.
- The `az vm extension show` example used `CustomScript`, which is the extension type, not the actual deployed extension name from the sample. I corrected it to `setup-script`.
- The conclusion did not mention that Azure Disk Encryption is being retired. I added the current retirement guidance and recommendation to use Encryption at host for new VMs.

## Review Notes
- Azure Disk Encryption remains supported for existing workloads, but Microsoft documents a retirement date of September 15, 2028. The post now reflects that caveat.
- The Azure Monitor Agent example now assumes a system-assigned managed identity on the VM and an existing Data Collection Rule ID supplied separately.
