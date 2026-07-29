# Validation Summary: Repair an Unbootable Azure Windows VM with a Repair VM

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Microsoft Azure Virtual Machines
- Azure CLI and the `vm-repair` extension
- Azure managed disks, snapshots, and OS-disk swaps
- Azure Boot diagnostics, Serial Console, VMAccess, and VM Agent
- Azure Disk Encryption and BitLocker
- Windows Server offline recovery
- PowerShell storage cmdlets
- CHKDSK, DISM, SFC, Registry Editor, and BCDBoot

## Sources Consulted
- [Repair a Windows VM by using the Azure Virtual Machine repair commands](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/repair-windows-vm-using-azure-virtual-machine-repair-commands)
- [Azure CLI reference for `az vm repair`](https://learn.microsoft.com/en-us/cli/azure/vm/repair?view=azure-cli-latest)
- [Azure CLI reference for extensions](https://learn.microsoft.com/en-us/cli/azure/extension?view=azure-cli-latest)
- [Azure CLI reference for VM Boot diagnostics](https://learn.microsoft.com/en-us/cli/azure/vm/boot-diagnostics?view=azure-cli-latest)
- [Azure CLI reference for managed disks](https://learn.microsoft.com/en-us/cli/azure/disk?view=azure-cli-latest)
- [Azure boot diagnostics](https://learn.microsoft.com/en-us/azure/virtual-machines/boot-diagnostics)
- [Azure Compute REST API: Disks - Get](https://learn.microsoft.com/en-us/rest/api/compute/disks/get?view=rest-compute-2025-04-01)
- [Azure Compute REST API: Virtual Machines - Get](https://learn.microsoft.com/en-us/rest/api/compute/virtual-machines/get?view=rest-compute-2026-03-01)
- [Troubleshoot a Windows VM by attaching the OS disk to a recovery VM using Azure PowerShell](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/troubleshoot-recovery-disks-windows)
- [Troubleshoot a Windows VM by attaching the OS disk to a repair VM through the Azure portal](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/troubleshoot-recovery-disks-portal-windows)
- [Unlocking an encrypted disk for offline repair](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/unlock-encrypted-disk-offline)
- [Troubleshoot Azure virtual machine boot errors](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/boot-error-troubleshoot)
- [Troubleshoot Azure VM allocation failures](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/allocation-failure)
- [Reset Remote Desktop Services or its admin password on a Windows VM](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/reset-rdp)
- [Troubleshoot Azure Windows VM Agent issues](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/windows-azure-guest-agent)
- [CHKDSK command reference](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/chkdsk)
- [DISM operating system package servicing command-line options](https://learn.microsoft.com/en-us/windows-hardware/manufacture/desktop/dism-operating-system-package-servicing-command-line-options?view=windows-11)
- [BCDBoot command-line options](https://learn.microsoft.com/en-us/windows-hardware/manufacture/desktop/bcdboot-command-line-options-techref-di?view=windows-11)

## Issues Found
- The VM inventory query omitted the top-level `zones` property even though the guide later instructed the reader to record the availability zone. Added `zones:zones` to the query so the exported inventory includes that required compatibility setting.
- The image-reference explanation assumed that the VM had a platform-image reference. Specialized-disk deployments can have no image reference, and gallery-based deployments use other reference fields. Qualified the publisher/offer/SKU/version statement so it applies only when a platform-image reference is populated.
- The extension setup block unconditionally ran both `az extension add` and `az extension update`. Replaced those commands with the supported idempotent `az extension add --name vm-repair --upgrade`, which installs the extension when absent and updates it when already installed.
- The restore guidance said only to start the VM and watch Boot diagnostics. Microsoft documents that Boot diagnostics requires a stop/start after an OS-disk swap. Updated the guidance to require a completed stop/start cycle before relying on Boot diagnostics.

## Review Notes
- The `az vm repair create`, `list-scripts`, `run`, and `restore` commands and their shown options are current and GA in the `vm-repair` extension. Script IDs remain symptom-specific and should be selected from the current script list at execution time.
- Automated Azure Disk Encryption handling is limited to supported managed disks using single-pass encryption, with or without a key-encryption key. The post correctly directs other encryption configurations to the matching recovery procedure.
- The PowerShell inventory commands and the CHKDSK and DISM examples are syntactically valid. The post correctly avoids prescribing destructive repair syntax without a diagnosed boot symptom and confirmed partition letters.
- The restore phase retains the original and repaired managed disks; the original disk should be deleted only after validation and the agreed observation period.
