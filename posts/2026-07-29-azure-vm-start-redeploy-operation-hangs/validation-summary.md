# Validation Summary: Why Azure VM Start or Redeploy Operations Hang

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- Microsoft Azure Virtual Machines
- Azure VM extensions
- Azure Windows VM Agent and Azure Linux Agent
- Azure CLI
- Azure Activity Log
- Azure VM Reapply and Redeploy operations
- Azure VM allocation and provisioning states
- Azure temporary and Ephemeral OS disks

## Sources Consulted

- [Slow Azure Virtual Machine Start operations caused by extensions in a failed state](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/slow-vm-start-extensions-troubleshooting)
- [Azure CLI: `az vm`](https://learn.microsoft.com/en-us/cli/azure/vm?view=azure-cli-latest)
- [Azure CLI: `az vm extension`](https://learn.microsoft.com/en-us/cli/azure/vm/extension?view=azure-cli-latest)
- [Azure CLI: `az monitor activity-log`](https://learn.microsoft.com/en-us/cli/azure/monitor/activity-log?view=azure-cli-latest)
- [Azure Activity Log event schema](https://learn.microsoft.com/en-us/azure/azure-monitor/platform/activity-log-schema)
- [States and billing status of Azure Virtual Machines](https://learn.microsoft.com/en-us/azure/virtual-machines/states-billing)
- [Troubleshooting Azure Windows VM extension failures](https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/troubleshoot)
- [Azure VM extensions and features for Linux](https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/features-linux)
- [Azure Linux VM Agent overview](https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/agent-linux)
- [Troubleshoot Azure Windows VM Agent issues](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/windows-azure-guest-agent)
- [Redeploy Windows virtual machines in Azure](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/redeploy-to-new-node-windows)
- [Ephemeral OS disks for Azure VMs](https://learn.microsoft.com/en-us/azure/virtual-machines/ephemeral-os-disks)
- [Virtual machine stuck in a failed state](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/vm-stuck-in-failed-state)
- [Troubleshoot Azure VM allocation failures](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/allocation-failure)

## Issues Found

- The Activity Log checklist referred to a submitted and last-updated time, but Activity Log administrative events expose an event timestamp for each status entry rather than a general last-updated field. Changed the checklist to record the event timestamp for each related entry and added the caller to the CLI query so the example returns another field that the checklist asks the reader to capture.
- The extension log examples assumed every extension directory is named `<Publisher>.<Type>`. Linux extensions can use extension-specific directory names such as `custom-script`. Replaced those placeholders with generic extension and handler names while retaining the documented root paths.
- The Redeploy warning mentioned temporary-disk data loss but omitted Ephemeral OS disks. Added that Redeploy deletes data on an Ephemeral OS disk and reprovisions the OS.
- The list of alternate causes referred to a “partially allocated availability set.” The documented allocation constraint occurs when starting partially stopped (deallocated) VMs in an availability set. Corrected the wording accordingly.

## Review Notes

- All Azure CLI commands and flags used in the post are current, GA commands in the latest Azure CLI reference. The JMESPath expressions are syntactically valid and use fields present in the documented CLI output.
- Microsoft’s slow Start/Redeploy troubleshooting article explicitly documents a 90-minute extension provisioning timeout for this scenario. General extension documentation lists shorter limits for some extension handlers, so handler-specific documentation remains authoritative when diagnosing an individual extension.
- All four links in the post’s Official Documentation section were reachable and returned HTTP 200 during validation.
