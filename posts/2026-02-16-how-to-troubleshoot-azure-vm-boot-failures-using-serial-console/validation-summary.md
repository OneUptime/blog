# Validation Summary: How to Troubleshoot Azure VM Boot Failures Using Serial Console

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Azure Virtual Machines
- Azure Serial Console
- Azure Boot diagnostics
- Azure CLI
- Linux GRUB, fstab, systemd emergency mode, and kernel package management
- Windows Special Administrative Console (SAC)
- Azure VM Repair extension

## Sources Consulted
- Microsoft Learn: Azure Serial Console overview - https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/serial-console-overview
- Microsoft Learn: Azure Serial Console for Linux - https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/linux/serial-console-linux
- Microsoft Learn: Use Serial Console to access GRUB and single-user mode - https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/linux/serial-console-grub-single-user-mode
- Microsoft Learn: Azure Serial Console for Windows - https://learn.microsoft.com/en-us/azure/virtual-machines/windows/serial-console
- Microsoft Learn: CMD and PowerShell commands through SAC - https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/serial-console-cmd-ps-commands
- Microsoft Learn: Enable and disable Azure Serial Console - https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/serial-console-enable-disable
- Microsoft Learn: Azure boot diagnostics - https://learn.microsoft.com/en-us/azure/virtual-machines/boot-diagnostics
- Microsoft Learn: az vm boot-diagnostics CLI reference - https://learn.microsoft.com/en-us/cli/azure/vm/boot-diagnostics
- Microsoft Learn: az vm repair CLI reference - https://learn.microsoft.com/en-us/cli/azure/vm/repair
- Microsoft Learn: Troubleshoot Linux VM boot issues due to fstab errors - https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/linux/linux-virtual-machine-cannot-start-fstab-errors

## Issues Found
- The prerequisite section understated the Azure permissions required for Serial Console. Updated it to specify Virtual Machine Contributor on both the VM and the boot diagnostics storage account, matching Microsoft guidance.
- The Azure CLI command shown for checking subscription-level Serial Console status was incorrect. Replaced it with the documented `az resource show` call for `Microsoft.SerialConsole/consoleServices/default` and added the documented `az resource invoke-action --action enableConsole` command.
- The boot diagnostics enable example used a custom storage account URI even though managed boot diagnostics is the current recommended default when no storage account is supplied. Updated the example to enable managed boot diagnostics.
- The Windows SAC section suggested `bootrec /fixmbr` and `bootrec /fixboot` from the SAC command prompt. SAC runs commands inside the running OS, while `bootrec` is a Windows Recovery Environment tool. Replaced those commands with an event log query and kept `bcdedit` for boot configuration inspection.
- The troubleshooting section mentioned checking the VM agent even though Serial Console access is documented around boot diagnostics, RBAC, subscription enablement, and storage account settings. Replaced that note with checks for custom boot diagnostics storage firewall and storage account key access.
- The automation section described `az vm boot-diagnostics get-boot-log` as retrieving a screenshot URL. Corrected it to say the command retrieves the boot diagnostics serial log.

## Review Notes
The GRUB manual boot example is distribution- and partition-layout-specific, so it should be treated as illustrative rather than universally copy-pasteable. The post now validates as a technically accurate guide with that caveat.
