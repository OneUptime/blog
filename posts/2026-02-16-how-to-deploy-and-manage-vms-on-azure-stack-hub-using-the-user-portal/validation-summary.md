# Validation Summary: How to Deploy and Manage VMs on Azure Stack Hub Using the User Portal

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Stack Hub
- Azure Stack Hub user portal
- Azure Resource Manager templates
- Azure CLI
- Azure Stack Hub virtual machines
- Azure Stack Hub networking and storage
- Azure VM diagnostics and extensions
- Microsoft Azure Backup Server

## Sources Consulted
- Microsoft Learn: Use the Azure Stack Hub user portal - https://learn.microsoft.com/en-us/azure-stack/user/azure-stack-use-portal
- Microsoft Learn: Use the administrator portal in Azure Stack Hub - https://learn.microsoft.com/en-us/azure-stack/operator/azure-stack-manage-portals
- Microsoft Learn: Quickstart: Create a Windows server VM with the Azure Stack Hub portal - https://learn.microsoft.com/en-us/azure-stack/user/azure-stack-quick-windows-portal
- Microsoft Learn: Introduction to Azure Stack Hub VMs - https://learn.microsoft.com/en-us/azure-stack/user/azure-stack-compute-overview
- Microsoft Learn: Manage Azure Stack Hub with Azure CLI - https://learn.microsoft.com/en-us/azure-stack/user/azure-stack-version-profiles-azurecli2
- Microsoft Learn: Azure CLI release highlights, important notice for Azure Stack Hub customers - https://learn.microsoft.com/en-us/cli/azure/whats-new-overview#important-notice-for-azure-stack-hub-customers
- Microsoft Learn: az cloud reference - https://learn.microsoft.com/en-us/cli/azure/cloud
- Microsoft Learn: Manage API version profiles in Azure Stack Hub - https://learn.microsoft.com/en-us/azure-stack/user/azure-stack-version-profiles
- Microsoft Learn: Azure Stack Hub managed disks differences and considerations - https://learn.microsoft.com/en-us/azure-stack/user/azure-stack-managed-disk-considerations
- Microsoft Learn: Supported metrics for Azure Monitor on Azure Stack Hub - https://learn.microsoft.com/en-us/azure-stack/user/azure-stack-metrics-supported
- Microsoft Learn: az vm diagnostics reference - https://learn.microsoft.com/en-us/cli/azure/vm/diagnostics
- Microsoft Learn: Azure Marketplace items available for Azure Stack Hub - https://learn.microsoft.com/en-us/azure-stack/operator/azure-stack-marketplace-azure-items
- Microsoft Learn: Install Azure Backup Server on Azure Stack Hub - https://learn.microsoft.com/en-us/azure/backup/backup-mabs-install-azure-stack
- Microsoft Learn: Enable backup for Azure Stack Hub from the administrator portal - https://learn.microsoft.com/en-us/azure-stack/operator/azure-stack-backup-enable-backup-console

## Issues Found
- The introduction and ARM template section overstated API/template compatibility by saying APIs are compatible and templates work identically across Azure and Azure Stack Hub. Updated the wording to reflect Azure-consistent APIs and the need to use Azure Stack Hub-supported API versions.
- The Azure CLI section omitted the required Azure Stack Hub API profile step and did not mention the current Azure CLI compatibility constraint. Added `az cloud update --profile 2020-09-01-hybrid` and noted that Azure CLI 2.66.x LTS is required because newer CLI versions removed Azure Stack Hub profiles.
- The Azure CLI VM creation example used an image alias that may not be valid in Azure Stack Hub. Added `az vm image list --all` and changed the VM creation command to use the full image URN format returned by the environment.
- The monitoring section listed disk IOPS, network bytes, and memory percentage as VM metrics. Azure Stack Hub's documented VM platform metric is Percentage CPU, so the metric list was corrected and guest OS monitoring was tied to diagnostics extensions.
- The diagnostics CLI example was incomplete and would not configure the diagnostics extension correctly. Replaced it with the documented Azure CLI pattern using `az vm diagnostics get-default-config`, storage SAS protected settings, and `az vm diagnostics set`.
- The VM extensions list included Docker as a common Azure Stack Hub extension. Replaced it with Azure Diagnostics, which is documented for Azure Stack Hub VM diagnostics.
- The backup tip implied Azure Backup directly backs up Azure Stack Hub VMs when enabled by the operator. Updated it to explain that Microsoft Azure Backup Server or supported third-party backup solutions protect workloads, and Azure Stack Hub infrastructure backup does not include tenant VMs or data.

## Review Notes
Azure Stack Hub behavior depends heavily on the operator's installed version, marketplace content, plans, quotas, and downloaded extensions. Future updates should keep CLI/profile guidance aligned with Microsoft Learn because Azure CLI support for Azure Stack Hub changed in recent releases.
