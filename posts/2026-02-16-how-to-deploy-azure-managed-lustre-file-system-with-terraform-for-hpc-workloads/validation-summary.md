# Validation Summary: How to Deploy Azure Managed Lustre File System with Terraform for HPC Workloads

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Managed Lustre File System
- Terraform
- AzureRM Terraform provider
- AzureAD Terraform provider
- Azure CLI amlfs extension
- Azure Blob Storage HSM integration
- Azure Virtual Machine Scale Sets
- Azure Monitor

## Sources Consulted
- Azure Managed Lustre Terraform guide: https://learn.microsoft.com/en-us/azure/azure-managed-lustre/create-aml-file-system-terraform
- Terraform Registry for azurerm_managed_lustre_file_system: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/managed_lustre_file_system
- Azure Managed Lustre prerequisites: https://learn.microsoft.com/en-us/azure/azure-managed-lustre/amlfs-prerequisites
- Azure Managed Lustre portal creation and throughput configurations: https://learn.microsoft.com/en-us/azure/azure-managed-lustre/create-file-system-portal
- Azure Managed Lustre Blob Storage integration: https://learn.microsoft.com/en-us/azure/azure-managed-lustre/blob-integration
- Azure CLI amlfs import reference: https://learn.microsoft.com/en-us/cli/azure/amlfs/import?view=azure-cli-latest
- Azure Managed Lustre client connection guide: https://learn.microsoft.com/en-us/azure/azure-managed-lustre/connect-clients
- Azure Managed Lustre fstab guide: https://learn.microsoft.com/en-us/azure/azure-managed-lustre/automount-clients-fstab
- Azure Managed Lustre client installation guide: https://learn.microsoft.com/en-us/azure/azure-managed-lustre/client-install
- Azure Managed Lustre monitoring metrics reference: https://learn.microsoft.com/en-us/azure/azure-managed-lustre/monitor-file-system-reference
- Azure HPC/AI VM images: https://learn.microsoft.com/en-us/azure/virtual-machines/azure-hpc-vm-images
- Terraform Registry for azurerm_storage_container: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_container
- Terraform Registry for azuread_service_principal data source: https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/data-sources/service_principal

## Issues Found
- The storage-capacity guidance said Premium-250 used 48 TiB increments. Azure documents Premium-250 with an 8 TiB minimum/increment, so the variable description and resource comment were corrected.
- The NSG example allowed inbound traffic to the compute subnet from the Lustre subnet on only TCP 988. Azure documents Lustre access on TCP 988 and 1019-1023 between clients and the Azure Managed Lustre subnet, so the rule was corrected to protect the Lustre subnet and allow compute-to-Lustre inbound traffic on the documented ports.
- The Blob integration snippet did not configure HSM on the file system, did not create the required logging container, and assigned only Storage Blob Data Contributor to the file system's managed identity. Azure and Terraform documentation require data and logging containers and role assignments for the HPC Cache Resource Provider service principal before file system creation, so the post now adds the AzureAD lookup, both role assignments, the logging container, and the `hsm_setting` block.
- The import command used the nonexistent `az amlfs import-job create` command group and unsupported flags. It was changed to `az amlfs import create` with `--aml-filesystem-name`, `--import-prefixes`, and `--maximum-errors`.
- The compute-node install script used generic Lustre package names. Azure Managed Lustre documents the Microsoft AMLFS package repository and `amlfs-lustre-client` packages, so the script was updated to configure that repository and install the documented package.
- The mount command omitted the recommended `noatime,flock` options and the fstab line omitted the recommended network/systemd options. These were updated to match Azure Managed Lustre client guidance.
- The monitoring alert referenced a non-existent `WriteIOPS` metric and used the wrong metric namespace casing. It now uses `Microsoft.StorageCache/amlFilesystems` and `ClientWriteThroughput` with a bytes-per-second threshold.
- The mount command output was updated to include the recommended mount options.

## Review Notes
Terraform and Azure CLI were not installed in the local environment, so I could not run `terraform validate` or `az --help` locally. The corrections were validated against official Microsoft Learn and HashiCorp Registry documentation.
