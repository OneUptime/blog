# Validation Summary: How to Fix 'VM Extension' Installation Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure Virtual Machines
- Azure VM extensions
- Azure CLI
- Azure Custom Script Extension for Linux and Windows
- Azure Linux VM Agent / WALinuxAgent
- Azure Monitor Agent
- Azure Monitor activity log alerts
- Bash and systemd

## Sources Consulted
- Microsoft Learn: Azure VM extension CLI reference - https://learn.microsoft.com/en-us/cli/azure/vm/extension?view=azure-cli-latest
- Microsoft Learn: Use the Azure Custom Script Extension Version 2 with Linux virtual machines - https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/custom-script-linux
- Microsoft Learn: Troubleshooting Azure VM extension failures - https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/troubleshoot
- Microsoft Learn: Azure VM extensions and features for Linux - https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/features-linux
- Microsoft Learn: Azure Linux VM Agent overview - https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/agent-linux
- Microsoft Learn: How to update the Azure Linux Agent on a VM - https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/update-linux-agent
- Microsoft Learn: Troubleshoot the Azure Linux Agent - https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/linux/linux-azure-guest-agent
- Microsoft Learn: Automatic Extension Upgrade for VMs and scale sets in Azure - https://learn.microsoft.com/en-us/azure/virtual-machines/automatic-extension-upgrade
- Microsoft Learn: Install and manage the Azure Monitor Agent - https://learn.microsoft.com/en-us/azure/azure-monitor/agents/azure-monitor-agent-manage
- Microsoft Learn: Azure Monitor Activity Log - https://learn.microsoft.com/en-us/azure/azure-monitor/platform/activity-log
- Microsoft Learn: Azure CLI activity log alert reference - https://learn.microsoft.com/en-us/cli/azure/monitor/activity-log/alert?view=azure-cli-latest

## Issues Found
- The detailed extension status command queried `instanceView.statuses` without requesting instance view data. Added `--instance-view` to the `az vm extension show` command.
- The Linux Custom Script Extension log path used only the older `/var/log/azure/custom-script/handler.log` path. Updated examples to use the current publisher-qualified path and kept the older path as a note.
- The Windows Custom Script Extension log location pointed readers to the plugin package/status folder. Updated it to the documented `C:\WindowsAzure\Logs\Plugins\Microsoft.Compute.CustomScriptExtension\<version>\` location.
- The connectivity test used `https://azureedge.net`, which is not a valid endpoint as written. Replaced it with `https://catalogartifact.azureedge.net`.
- The Azure Linux Agent examples assumed the service and package are always named `waagent`. Updated commands to account for `walinuxagent` on Ubuntu/Debian and `waagent` on other distributions, and corrected the Ubuntu package name to `walinuxagent`.
- The VM Agent repair section recommended `waagent -deprovision+user -force`, which is intended for deprovisioning/image preparation and is unsafe as a normal repair step. Replaced it with enabling agent auto-update and restarting the VM.
- The Azure Monitor Agent install example pinned a placeholder version. Removed the version pin from that example to avoid publishing an outdated or region-unavailable version.
- The SAS token example placed the SAS-bearing `fileUris` value in public settings. Moved it to protected settings to avoid exposing the token in extension configuration.
- The long-running Custom Script Extension example referenced a downloaded script path without providing `fileUris`. Added `fileUris` and changed the command to run the downloaded file from the extension working directory.
- The recovery command used unsupported `az vm extension delete --force-deletion`. Removed the unsupported flag and narrowed the local cleanup command to a specific extension handler directory instead of deleting all matching extension state.
- The monitoring example used a non-existent `VMExtensionStatusCode` VM metric with `az monitor metrics alert create`. Replaced it with an Azure Monitor activity log alert for failed extension write operations.

## Review Notes
- Azure VM extension network requirements vary by extension. The endpoint checks in the post are examples, not a complete allowlist.
- Backgrounding long Custom Script Extension work can make the extension report success before the work actually completes. For strict completion tracking, use an extension-supported timeout path or Azure managed Run Command where appropriate.
