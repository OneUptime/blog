# Validation Summary: How to Set Up Azure Managed Lustre File System for HPC Workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Managed Lustre File System
- Azure CLI
- Azure Virtual Network and subnets
- Azure Blob Storage integration
- Lustre client software and mount commands
- Lustre striping and monitoring commands

## Sources Consulted
- Azure Managed Lustre prerequisites: https://learn.microsoft.com/en-us/azure/azure-managed-lustre/amlfs-prerequisites
- Azure CLI `az amlfs` reference: https://learn.microsoft.com/en-us/cli/azure/amlfs
- Azure CLI `az amlfs import` reference: https://learn.microsoft.com/en-us/cli/azure/amlfs/import
- Azure Managed Lustre client connection guide: https://learn.microsoft.com/en-us/azure/azure-managed-lustre/connect-clients
- Azure Managed Lustre Ubuntu client installation guide: https://learn.microsoft.com/en-us/azure/azure-managed-lustre/client-install?pivots=ubuntu-22
- Azure Managed Lustre fstab guide: https://learn.microsoft.com/en-us/azure/azure-managed-lustre/automount-clients-fstab
- Azure Managed Lustre Blob Storage integration guide: https://learn.microsoft.com/en-us/azure/azure-managed-lustre/blob-integration
- Azure Managed Lustre ARM template guide and SKU table: https://learn.microsoft.com/en-us/azure/azure-managed-lustre/create-file-system-resource-manager
- Azure Managed Lustre NSG guidance: https://learn.microsoft.com/en-us/azure/azure-managed-lustre/configure-network-security-group
- Azure Managed Lustre layout optimization guide: https://learn.microsoft.com/en-us/azure/azure-managed-lustre/optimize-file-layouts
- Azure SDK `AmlFilesystemClientInfo` reference: https://learn.microsoft.com/en-us/javascript/api/@azure/arm-storagecache/amlfilesystemclientinfo

## Issues Found
- The prerequisites incorrectly said every Lustre subnet must be at least `/24` and must not have an NSG or service endpoints. Updated this to say the subnet must be sized for the selected configuration, added `az amlfs get-subnets-size`, and noted that NSGs are supported when required Lustre and Azure service traffic is allowed.
- The resource provider was described as the Azure HPC resource provider. Updated the wording to Azure Managed Lustre resource provider while keeping the correct `Microsoft.StorageCache` command.
- The `az amlfs create` examples used `--zones 1`. Updated to array syntax, `--zones "[1]"`, matching the CLI reference.
- The Premium-250 storage increment was stated as usually 4 TiB. Updated it to the documented 8 TiB minimum and 8 TiB increment for `AMLFS-Durable-Premium-250`.
- The `az amlfs show` query referenced `mgsAddress` and `mountCommand` at the top level. Updated it to `clientInfo.mgsAddress` and `clientInfo.mountCommand`.
- The Ubuntu 22.04 Lustre client install commands used generic package names that do not match Azure Managed Lustre's Microsoft package repository. Replaced them with the documented repository setup and `amlfs-lustre-client-2.15.8-34-gc0f2040=$(uname -r)` install command.
- The mount and fstab examples omitted recommended Azure Managed Lustre mount options. Added `noatime,flock` to the mount command and the documented `_netdev`/systemd fstab options.
- The blob integration section used a nonexistent `az amlfs archive create` command with unsupported flags. Replaced it with `az amlfs create --hsm-settings` for initial blob integration and `az amlfs import create` for later import jobs.
- The export example was terse and did not show the filesystem path. Expanded it to `az amlfs archive --filesystem-path "/"`, which archives all modified data.

## Review Notes
The Azure CLI was not installed in the local environment, so command verification was performed against the current Microsoft Learn Azure CLI reference and Azure Managed Lustre documentation rather than local `az --help` output.
