# Validation Summary: Why Is an Azure VM Extension Stuck in Provisioning Failed?

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Microsoft Azure
- Azure Virtual Machines
- Azure VM extensions
- Azure VM Guest Agent and Azure Linux Agent
- Azure CLI
- Windows and Linux guest operating systems
- Azure Activity Log

## Sources Consulted
- Microsoft Learn: Troubleshooting Azure Windows VM extension failures - https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/troubleshoot
- Microsoft Learn: Virtual machine extensions and features for Linux - https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/features-linux
- Microsoft Learn: Azure VM extensions and features for Windows - https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/features-windows
- Microsoft Learn: Azure Linux VM Agent overview - https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/agent-linux
- Microsoft Learn: Troubleshoot Azure Windows VM Agent issues - https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/windows-azure-guest-agent
- Microsoft Learn: Azure CLI `az vm extension` reference - https://learn.microsoft.com/en-us/cli/azure/vm/extension
- Microsoft Learn: Virtual machine stuck in a failed state - https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/vm-stuck-in-failed-state
- Microsoft Learn: Azure Custom Script Extension for Windows - https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/custom-script-windows
- Microsoft Learn: Run Custom Script Extension on Linux VMs in Azure - https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/custom-script-linux
- Microsoft Learn: Microsoft.Compute virtualMachines/extensions resource reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.compute/2025-04-01/virtualmachines/extensions
- Microsoft Learn: Activity Log in Azure Monitor - https://learn.microsoft.com/en-us/azure/azure-monitor/platform/activity-log

## Issues Found
- The opening defined `Provisioning failed` exclusively as a status reported by an extension handler. Agent or platform communication failures can prevent the handler from running or reporting status at all. Changed the definition to say that Azure could not complete the extension operation, which covers both handler-reported and agent/platform failures.
- The `az vm extension set --force-update` example supplied only public settings even though many extensions rely on protected settings. Updated the example to include the complete protected-settings file and clarified that the argument should be omitted only for extensions that do not use protected settings.

## Review Notes
The Azure CLI command names and options are current and syntactically valid, including `az vm extension show --instance-view`, `az vm reapply`, `--extension-instance-name`, and `--force-update`. The documented log paths, 20-minute Linux extension timeout with 90-minute Custom Script and Chef exceptions, agent execution contexts, reapply caveat, network separation between agent traffic and handler dependencies, and extension removal cautions align with Microsoft guidance. Timeout limits and recovery behavior remain extension-specific, so publisher documentation should continue to take precedence.
