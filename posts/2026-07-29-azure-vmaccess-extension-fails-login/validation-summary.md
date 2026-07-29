# Validation Summary: When the Azure VMAccess Extension Fails

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Microsoft Azure Virtual Machines
- VMAccess Extension for Windows (`Microsoft.Compute.VMAccessAgent`)
- VMAccess Extension for Linux (`Microsoft.OSTCExtensions.VMAccessForLinux`)
- Azure VM Agent and Azure Linux Agent
- Azure CLI
- SSH and Remote Desktop Protocol (RDP)
- Azure Serial Console
- Azure Bastion
- Azure Run Command
- Azure Boot Diagnostics
- Azure VM repair commands and offline OS-disk repair
- Microsoft Entra sign-in extensions

## Sources Consulted
- [VMAccess Extension for Windows](https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/vmaccess-windows)
- [VMAccess Extension for Linux](https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/vmaccess-linux)
- [Azure CLI: `az vm extension`](https://learn.microsoft.com/en-us/cli/azure/vm/extension?view=azure-cli-latest)
- [Azure CLI: `az vm user`](https://learn.microsoft.com/en-us/cli/azure/vm/user?view=azure-cli-latest)
- [Reset Remote Desktop Services or its admin password on a Windows VM](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/reset-rdp)
- [Troubleshooting Azure Windows VM extension failures](https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/troubleshoot)
- [Troubleshoot Azure Windows VM Agent issues](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/windows-azure-guest-agent)
- [Azure IP address 168.63.129.16 overview](https://learn.microsoft.com/en-us/azure/virtual-network/what-is-ip-address-168-63-129-16)
- [Azure Serial Console for Windows](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/serial-console-windows)
- [Azure Serial Console for Linux](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/linux/serial-console-linux)
- [Configure NSG rules for Azure Bastion](https://learn.microsoft.com/en-us/azure/bastion/bastion-nsg)
- [Run scripts in a Windows VM by using action Run Commands](https://learn.microsoft.com/en-us/azure/virtual-machines/windows/run-command)
- [Repair a Windows VM by using Azure Virtual Machine repair commands](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/repair-windows-vm-using-azure-virtual-machine-repair-commands)
- [Repair a Linux VM by using Azure Virtual Machine repair commands](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/linux/repair-linux-vm-using-azure-virtual-machine-repair-commands)
- [Troubleshoot SSH connection issues to an Azure VM](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/linux/troubleshoot-ssh-connection)
- Local Azure CLI built-in help for `az vm extension list`, `az vm extension show`, `az vm user update`, and `az vm user reset-ssh`

## Issues Found
- The `az vm extension list` JMESPath query used `virtualMachineExtensionType`, which is not the handler-type field in Azure CLI output. Changed it to `typePropertiesType` so the table displays `VMAccessAgent` or `VMAccessForLinux` instead of an empty value.
- The Windows `C:\Packages\Plugins\...` and Linux `/var/lib/waagent/...` paths contain extension settings, status files, packages, and binaries rather than only logs. Changed both labels from “logs” to “logs and files.”
- The Linux `az vm user update` operation appends the supplied public key and does not replace existing keys. Changed “SSH key reset” to “SSH key update” to match the command's documented behavior.
- The Microsoft Entra extension must be rerun specifically after VMAccess resets a password, not after every possible VMAccess action. Narrowed the statement to the documented password-reset condition.
- Azure Serial Console is independent of guest network and operating-system state and can expose bootloader access. Replaced the claim that the operating system must reach a usable console with the accurate requirements that the VM be running and the image or bootloader expose the serial port.
- Azure Bastion requires effective network policy to permit its traffic, but an explicit NSG is not mandatory in every deployment. Clarified that traffic must be permitted by any applicable NSGs.
- Azure VM repair restore depends on the tags created during the repair workflow. Clarified that those generated tags must be preserved.

## Review Notes
The publisher/type pairs, extension and user commands, `--instance-view` flag, WireServer address and ports, log locations, domain-controller limitation, Entra rerun guidance, Run Command agent dependency, and offline-repair workflow were otherwise consistent with current Microsoft documentation. The post correctly warns that `az vm user reset-ssh` replaces customized SSH configuration with extension-provided defaults and that VM repair should preserve disks and configuration.
