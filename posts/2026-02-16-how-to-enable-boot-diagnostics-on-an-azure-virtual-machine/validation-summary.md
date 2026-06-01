# Validation Summary: How to Enable Boot Diagnostics on an Azure Virtual Machine

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Virtual Machines
- Azure Boot Diagnostics
- Azure CLI
- Azure Serial Console
- Azure Policy
- Linux and Windows VM troubleshooting

## Sources Consulted
- Microsoft Learn: Boot diagnostics for VMs in Azure - https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/boot-diagnostics
- Microsoft Learn: Azure CLI `az vm boot-diagnostics` reference - https://learn.microsoft.com/en-us/cli/azure/vm/boot-diagnostics?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az vm create` reference - https://learn.microsoft.com/en-us/cli/azure/vm?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az serial-console` reference - https://learn.microsoft.com/en-us/cli/azure/serial-console?view=azure-cli-latest
- Microsoft Learn: Azure Serial Console for Linux - https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/linux/serial-console-linux
- Microsoft Learn: Azure Policy definition structure - policy rule - https://learn.microsoft.com/en-us/azure/governance/policy/concepts/definition-structure-policy-rule

## Issues Found
- The Azure Policy section said you could change the policy effect to `deployIfNotExists` to automatically enable boot diagnostics. That is incomplete: `deployIfNotExists` requires an effect-specific `details` block and a deployment/remediation configuration. Updated the sentence to say you can build a `deployIfNotExists` or `modify` policy with the required details and remediation configuration.

## Review Notes
- The Azure CLI examples for `az vm boot-diagnostics enable`, `get-boot-log`, `get-boot-log-uris`, and `disable` match current Microsoft CLI documentation.
- The use of managed boot diagnostics storage is current; Microsoft documents that omitting storage for existing VMs uses managed storage, and `storageUri: null` indicates managed storage in the VM diagnostics profile.
- The `az serial-console connect` example is current, but users need the Azure CLI `serial-console` extension, which installs automatically on first use according to Microsoft documentation.
- Boot diagnostics does not support premium storage accounts or zone-redundant storage account types for custom boot diagnostics storage.
