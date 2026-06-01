# Validation Summary: How to Mount an Azure File Share Volume in Azure Container Instances

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Container Instances
- Azure Files
- Azure Storage accounts and file shares
- Azure CLI
- ACI YAML container group definitions
- Azure Key Vault

## Sources Consulted
- Microsoft Learn: Mount Azure Files volume to container group - https://learn.microsoft.com/en-us/azure/container-instances/container-instances-volume-azure-files
- Microsoft Learn: YAML reference for Azure Container Instances - https://learn.microsoft.com/en-us/azure/container-instances/container-instances-reference-yaml
- Microsoft Learn: Azure CLI `az container` reference - https://learn.microsoft.com/en-us/cli/azure/container?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az storage file` reference - https://learn.microsoft.com/en-us/cli/azure/storage/file?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az storage` reference - https://learn.microsoft.com/en-us/cli/azure/storage?view=azure-cli-latest
- Microsoft Learn: Azure Files scalability and performance targets - https://learn.microsoft.com/en-us/azure/storage/files/storage-files-scale-targets
- Microsoft Learn: Create an Azure storage account - https://learn.microsoft.com/en-us/azure/storage/common/storage-account-create

## Issues Found
- Clarified that ACI Azure Files volume mounts use SMB/CIFS and are supported for Linux containers, rather than implying ACI can mount Azure Files over either SMB or NFS.
- Added storage account naming requirements because the example storage account name must be globally unique and must follow Azure Storage naming rules.
- Corrected ACI YAML resource fields from `memoryInGb` to `memoryInGB`, matching the official ACI YAML schema.
- Added the required `osType: Linux` property to the multi-volume YAML example.
- Corrected the Standard Azure Files performance statement. The 60 MiB/s figure applies to a single HDD-backed file, while share throughput is subject to storage account limits.
- Updated verification commands to use the YAML example's container group name so the `app` container and `/app/data` mount path are consistent.

## Review Notes
Azure CLI was not installed in the local environment, so command validation was performed against current official Microsoft Learn CLI reference pages rather than local `az --help` output.
