# Validation Summary: Why Won't Azure Custom Script Extension Run the Same Script Twice?

## Status
validated

## Post Type
Troubleshooting guide / implementation guide

## Technologies Covered
- Microsoft Azure Virtual Machines
- Azure Custom Script Extension for Linux and Windows
- Azure VM Agent and VM extension instance view
- Azure CLI
- Azure PowerShell
- PowerShell
- Bash
- systemd
- Managed identities for Azure resources
- cloud-init

## Sources Consulted
- Custom Script Extension for Linux: https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/custom-script-linux
- Custom Script Extension for Windows: https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/custom-script-windows
- Azure CLI `az vm extension` reference: https://learn.microsoft.com/en-us/cli/azure/vm/extension
- Azure PowerShell `Set-AzVMCustomScriptExtension` reference: https://learn.microsoft.com/en-us/powershell/module/az.compute/set-azvmcustomscriptextension
- Azure VM extension REST API update reference for `forceUpdateTag`: https://learn.microsoft.com/en-us/rest/api/compute/virtual-machine-extensions/update
- Azure VM extensions and features for Linux: https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/features-linux
- Azure VM extensions and features for Windows: https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/features-windows
- Azure Custom Script Extension for Linux handler source and schema: https://github.com/Azure/custom-script-extension-linux
- Azure Run Command overview: https://learn.microsoft.com/en-us/azure/virtual-machines/run-command-overview
- systemd `systemctl` manual: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html
- GNU `cmp` manual: https://www.gnu.org/software/diffutils/manual/html_node/Invoking-cmp.html
- Local Azure CLI 2.71.0 `az vm extension set --help` output.

## Issues Found
- The Linux rerun command passed a settings file containing `timestamp` through `--protected-settings`. The Linux handler accepts `timestamp` only in public settings and rejects it as an additional protected property. Changed the command to `--settings` and explicitly stated that `timestamp` belongs in public settings.
- The post described `timestamp` as any integer without its documented width. Clarified that it is a 32-bit integer.
- The Bash sample used `systemctl list-unit-files myapp.service` as an existence test. That listing operation is not a reliable test for a matching unit and can succeed without causing the missing unit to be installed. Replaced it with a content comparison using `cmp -s`, then reloads and restarts systemd only when the unit file changes while still enabling and starting an unchanged unit.
- The managed-identity statement omitted the minimum Linux handler version. Added the documented requirement that managed-identity downloads are supported in Custom Script version 2.1 and later.
- The validation checklist said handler logs should show the `timestamp` or force update. Those control-plane values are not guaranteed to appear in handler logs. Changed the check to look for a new handler execution with the expected sequence number.

## Review Notes
- The Linux publisher/type pair `Microsoft.Azure.Extensions` / `CustomScript` and the Windows pair `Microsoft.Compute` / `CustomScriptExtension` are current.
- The Azure CLI flags `--extension-instance-name`, `--instance-view`, and `--force-update` are valid. Azure CLI also accepts the shown `@file` form because it expands file-prefixed arguments before parsing the JSON.
- The Windows handler's same-settings suppression, sequence-number warning, stable extension-name requirement, configuration-change rerun, and `ForceUpdateTag` rerun behavior match Microsoft documentation.
- `Set-AzVMCustomScriptExtension -ForceRerun` accepts a string that must differ from the current value.
- The documented Windows and Linux log paths, Linux `stdout` and `stderr` files, 90-minute execution limit, reboot cautions, and one-extension-handler limitation are accurate.
- The example timestamp value `2026072901` is within the signed 32-bit integer range.
