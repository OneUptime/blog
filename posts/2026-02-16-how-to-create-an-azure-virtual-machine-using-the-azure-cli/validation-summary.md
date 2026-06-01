# Validation Summary: How to Create an Azure Virtual Machine Using the Azure CLI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Microsoft Azure
- Azure Virtual Machines
- Azure CLI
- SSH key authentication
- Azure resource groups
- Network security group port rules
- cloud-init custom data

## Sources Consulted
- Azure CLI VM command reference: https://learn.microsoft.com/en-us/cli/azure/vm
- Azure CLI resource group command reference: https://learn.microsoft.com/en-us/cli/azure/group
- Install Azure CLI on macOS: https://learn.microsoft.com/en-us/cli/azure/install-azure-cli-macos
- Install Azure CLI on Linux: https://learn.microsoft.com/en-us/cli/azure/install-azure-cli-linux
- Install Azure CLI on Windows: https://learn.microsoft.com/en-us/cli/azure/install-azure-cli-windows
- Sign in with Azure CLI: https://learn.microsoft.com/en-us/cli/azure/authenticate-azure-cli-interactively
- Create a Linux VM with Azure CLI: https://learn.microsoft.com/en-us/azure/virtual-machines/linux/create-cli-complete
- Create and manage SSH keys with Azure CLI: https://learn.microsoft.com/en-us/azure/virtual-machines/ssh-keys-azure-cli
- Detailed SSH key steps for Azure Linux VMs: https://learn.microsoft.com/en-us/azure/virtual-machines/linux/create-ssh-keys-detailed
- Azure VM custom data and cloud-init: https://learn.microsoft.com/en-us/azure/virtual-machines/custom-data
- cloud-init support for Azure Linux VMs: https://learn.microsoft.com/en-us/azure/virtual-machines/linux/using-cloud-init
- Azure B-family VM sizes: https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/b-family

## Issues Found
No technical issues found.

## Review Notes
The local review environment did not have the Azure CLI installed, so command validation was performed against the official Microsoft Learn command reference and Azure VM documentation. The `Standard_B2s` VM size is a burstable B-series size; it is suitable for development and light workloads, but sustained CPU-intensive production workloads may need a non-burstable size.
