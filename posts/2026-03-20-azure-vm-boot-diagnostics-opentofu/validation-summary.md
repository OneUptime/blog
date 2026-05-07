# Validation Summary: How to Set Up Azure VM Boot Diagnostics with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Azure Virtual Machines
- Azure Virtual Machine Scale Sets
- Azure Boot Diagnostics
- Azure Serial Console
- Azure CLI
- AzureRM provider

## Sources Consulted
- Azure boot diagnostics: https://learn.microsoft.com/en-us/azure/virtual-machines/boot-diagnostics
- Azure Serial Console for Linux: https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/linux/serial-console-linux
- Azure CLI `az vm boot-diagnostics` reference: https://learn.microsoft.com/en-us/cli/azure/vm/boot-diagnostics?view=azure-cli-latest
- Azure CLI `az serial-console` reference: https://learn.microsoft.com/en-us/cli/azure/serial-console?view=azure-cli-latest
- Azure Storage anonymous access guidance: https://learn.microsoft.com/en-us/azure/storage/blobs/anonymous-read-access-overview
- AzureRM `azurerm_linux_virtual_machine` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_virtual_machine
- AzureRM `azurerm_linux_virtual_machine_scale_set` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_virtual_machine_scale_set
- AzureRM `azurerm_storage_account` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account

## Issues Found
- The introduction overstated managed boot diagnostics behavior by saying managed storage was enabled automatically and by implying Serial Console access was sufficient on its own. I corrected the text to match Microsoft Learn: Azure recommends managed storage, the Azure portal enables it by default for new VMs, and Linux Serial Console sign-in also requires a password-authenticated user account.
- The post claimed Azure Serial Console access while all example Linux VMs explicitly set `disable_password_authentication = true`. That configuration does not provide an interactive Linux Serial Console login by itself. I added the missing prerequisite and clarified the limitation in the introduction, deployment commands, and conclusion.
- The Azure CLI example used `az serial-console connect --vm-name`, but the current official CLI syntax requires `--name` / `-n`. I corrected the command and noted that the `serial-console` CLI extension auto-installs on first use.
- The deployment comments around boot diagnostics retrieval were inaccurate. `az vm boot-diagnostics get-boot-log` returns the boot diagnostics serial log, and `az vm boot-diagnostics get-boot-log-uris` returns SAS URIs for both the serial log and screenshot. I corrected those descriptions.
- The custom storage account comments were technically wrong. `allow_nested_items_to_be_public = false` disables opting nested items into anonymous public access; it is not needed to allow portal viewing. I corrected the comment to reflect the actual Azure Storage behavior.
- The storage account `delete_retention_policy` comment misdescribed blob soft delete as lifecycle-based cost control that keeps boot diagnostics data for 30 days. I corrected it to explain the real behavior: deleted blobs are retained for 30 days after deletion.

## Review Notes
- The post is technically correct after the fixes above.
- The examples for managed boot diagnostics are valid with the current AzureRM provider because a `boot_diagnostics` block may omit `storage_account_uri`, which causes Azure to use managed storage.
- If a custom boot diagnostics storage account later has firewall restrictions enabled, Microsoft documents extra configuration requirements for viewing boot diagnostics data and notes known Azure CLI Serial Console issues in that scenario.
