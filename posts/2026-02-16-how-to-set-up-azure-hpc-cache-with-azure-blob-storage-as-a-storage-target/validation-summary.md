# Validation Summary: How to Set Up Azure HPC Cache with Azure Blob Storage as a Storage Target

## Status
not-technically-relevant

## Post Type
Tutorial / setup guide

## Technologies Covered
- Azure HPC Cache
- Azure Blob Storage
- Azure CLI
- NFS client mounts
- Azure RBAC
- AzCopy

## Sources Consulted
- Microsoft Learn: Azure HPC Cache overview, including retirement notice: https://learn.microsoft.com/en-us/azure/hpc-cache/hpc-cache-overview
- Microsoft Learn: Azure HPC Cache prerequisites: https://learn.microsoft.com/en-us/azure/hpc-cache/hpc-cache-prerequisites
- Microsoft Learn: Add storage targets to Azure HPC Cache: https://learn.microsoft.com/en-us/azure/hpc-cache/hpc-cache-add-storage
- Microsoft Learn: Move data to Azure Blob storage for Azure HPC Cache: https://learn.microsoft.com/en-us/azure/hpc-cache/hpc-cache-ingest
- Microsoft Learn: Mount an Azure HPC Cache: https://learn.microsoft.com/en-us/azure/hpc-cache/hpc-cache-mount
- Microsoft Learn: Load balance Azure HPC Cache client traffic: https://learn.microsoft.com/en-us/azure/hpc-cache/client-load-balancing
- Microsoft Learn: Azure CLI `az hpc-cache` reference: https://learn.microsoft.com/en-us/cli/azure/hpc-cache
- Microsoft Learn: Azure CLI `az hpc-cache blob-storage-target` reference: https://learn.microsoft.com/en-us/cli/azure/hpc-cache/blob-storage-target
- Microsoft Learn: AKS integration example for Azure HPC Cache RBAC role assignment: https://learn.microsoft.com/en-us/azure/aks/azure-hpc-cache

## Issues Found
- Azure HPC Cache retired on September 30, 2025 and is no longer supported, according to Microsoft Learn. Because this post is dated February 16, 2026 and presents a new deployment guide, it is no longer appropriate as a current technical setup article.
- The storage-preparation section treats a regular Blob storage target as if it can be preloaded with arbitrary data using AzCopy. Microsoft documents that a standard Blob storage target must be empty or already populated in the Azure HPC Cache cloud file system format; otherwise data should be copied through the cache after the storage target is added.
- The post says HPC Cache uses an "ADLS-NFS-compatible format" for Blob storage targets. Microsoft distinguishes standard Blob targets from ADLS-NFS targets; standard Blob targets use a specialized Azure HPC Cache cloud file system format, while ADLS-NFS targets use NFS-enabled Blob containers.
- The RBAC section says to grant the cache's managed identity permissions, but Microsoft documents assigning Storage Account Contributor and Storage Blob Data Contributor to the "HPC Cache Resource Provider" or "StorageCache Resource Provider" service principal for Blob storage targets.
- The RBAC command attempts to look up `StorageCacheRP`, which does not match the Microsoft-documented CLI examples that query the service principal display name `StorageCache Resource Provider`.
- The post uses `az hpc-cache storage-target flush`, but the current Azure CLI reference lists cache-level `az hpc-cache flush` for writing dirty data to storage targets, not a `storage-target flush` subcommand.

## Review Notes
I did not edit the README because the primary blocker is service retirement before the article date, making the guide unsuitable for validation as a current implementation tutorial. The Azure CLI was not installed in the local workspace, so command validation was performed against Microsoft Learn CLI reference pages rather than local `az --help` output.
