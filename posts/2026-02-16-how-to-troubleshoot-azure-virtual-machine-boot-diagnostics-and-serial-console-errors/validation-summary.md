# Validation Summary: How to Troubleshoot Azure Virtual Machine Boot Diagnostics

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Azure Virtual Machines
- Azure Boot Diagnostics
- Azure Serial Console
- Azure CLI
- Azure Disk Encryption and BitLocker
- Azure Monitor metric alerts
- Linux fsck, fstab, journald, package cache cleanup
- Windows SAC, chkdsk, bcdedit, DISM

## Sources Consulted
- Microsoft Learn: Azure boot diagnostics - https://learn.microsoft.com/en-us/azure/virtual-machines/boot-diagnostics
- Microsoft Learn: az vm boot-diagnostics CLI reference - https://learn.microsoft.com/en-us/cli/azure/vm/boot-diagnostics?view=azure-cli-latest
- Microsoft Learn: Azure Serial Console for Linux - https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/linux/serial-console-linux
- Microsoft Learn: Azure Serial Console for Windows - https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/serial-console-windows
- Microsoft Learn: az serial-console CLI reference - https://learn.microsoft.com/en-us/cli/azure/serial-console?view=azure-cli-latest
- Microsoft Learn: az vm repair CLI reference - https://learn.microsoft.com/en-us/cli/azure/vm/repair?view=azure-cli-latest
- Microsoft Learn: Azure VM monitoring data reference - https://learn.microsoft.com/en-us/azure/virtual-machines/monitor-vm-reference
- Microsoft Learn: Monitor virtual machines with Azure Monitor alerts - https://learn.microsoft.com/en-us/azure/azure-monitor/vm/monitor-virtual-machine-alerts
- Microsoft Learn: az monitor metrics alert CLI reference - https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert?view=azure-cli-latest
- Microsoft Learn: Troubleshooting BitLocker boot errors on an Azure VM - https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/troubleshoot-bitlocker-boot-error
- Microsoft Learn: Azure VM encryption CLI reference - https://learn.microsoft.com/en-us/cli/azure/vm/encryption?view=azure-cli-latest

## Issues Found
- The `get-boot-log-uris` comment described only a screenshot URL. Updated it to state that the command returns SAS URIs for boot diagnostics data, including screenshot and serial log.
- The BitLocker/Azure Disk Encryption example implied that `az vm encryption show` finds recovery keys and that Key Vault secrets can be found by searching for `bitlocker` in the name. Updated the snippet to use `az vm encryption show` only for encryption status and list ADE BEK or Wrapped BEK Key Vault secrets by content type and tags.
- The Serial Console prerequisites incorrectly referred to a generic serial console agent. Updated the prerequisite to say the guest OS must be configured for serial console access, with endorsed Linux images and newer Windows Server images configured by default.
- The Azure Monitor alert example used the `Heartbeat` metric on the VM resource scope. Updated it to use the VM availability metric `VmAvailabilityMetric` for the VM resource and clarified that Azure Monitor Agent heartbeat is a separate signal with separate failure modes.

## Review Notes
- Azure CLI was not installed in the local environment, so command verification was performed against current Microsoft Learn CLI references rather than local `az --help` output.
- The VM availability metric is documented as preview. The example is technically valid for the current Azure Monitor VM availability signal, but production alerting may also need Resource Health or log query alerts to handle stopped/deallocated states and missing data semantics.
