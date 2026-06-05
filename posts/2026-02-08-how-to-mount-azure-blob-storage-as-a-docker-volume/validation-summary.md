# Validation Summary: How to Mount Azure Blob Storage as a Docker Volume

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Docker volumes and bind mounts
- Azure Blob Storage
- BlobFuse2
- Azure Files over SMB/CIFS
- Azure CLI
- Azure Kubernetes Service
- Azure Blob Storage CSI driver

## Sources Consulted
- Microsoft Learn: Create a BlobFuse configuration file - https://learn.microsoft.com/en-us/azure/storage/blobs/blobfuse2-configure
- Microsoft Learn: How to configure settings for BlobFuse - https://learn.microsoft.com/en-us/azure/storage/blobs/blobfuse2-configuration
- Azure BlobFuse2 GitHub repository README - https://github.com/Azure/azure-storage-fuse
- Azure BlobFuse2 Docker Container wiki - https://github.com/Azure/azure-storage-fuse/wiki/Blobfuse2-Docker-Container
- Azure BlobFuse2 Environment Variables wiki - https://github.com/Azure/azure-storage-fuse/wiki/Blobfuse2%E2%80%90Environment-Variables
- Azure BlobFuse2 base and sample configuration files - https://github.com/Azure/azure-storage-fuse/tree/main/setup
- Docker Docs: Volumes - https://docs.docker.com/engine/storage/volumes/
- Docker Docs: Bind mounts - https://docs.docker.com/engine/storage/bind-mounts/
- Docker Docs: Define and manage volumes in Docker Compose - https://docs.docker.com/reference/compose-file/volumes/
- Microsoft Learn: Use CSI drivers on AKS - https://learn.microsoft.com/en-us/azure/aks/csi-storage-drivers
- Microsoft Learn: Create and manage PVs with Azure Blob storage in AKS - https://learn.microsoft.com/en-us/azure/aks/create-volume-azure-blob-storage

## Issues Found
- The BlobFuse2 config used an account-specific HTTPS endpoint. Microsoft examples use `blob.core.windows.net` for the public Azure endpoint, so the config now uses that endpoint form and explicitly sets `mode: key` with the account key.
- The Dockerfile enabled `allow-other` in BlobFuse2 config but did not configure FUSE with `user_allow_other` before the mount starts. Added that to the Dockerfile setup step.
- The Azure Files CIFS Docker volume examples omitted the `addr=` option. Docker's CIFS volume example documents `addr` as required when a hostname is used, so the CLI and Compose snippets now include it.
- The BlobFuse2 sidecar example used a named Docker volume with `:shared` propagation. Docker named volumes use private propagation and do not allow configurable propagation, so the example now uses Linux bind mounts with `:rshared`.
- The Azure Blob Storage CSI section mixed AKS CSI terminology with an old Docker plugin workflow. Replaced it with the current AKS `--enable-blob-driver` command and a PVC that uses the built-in `azureblob-fuse-premium` storage class.
- The environment variable example used `AZURE_STORAGE_KEY` and YAML shell substitution. BlobFuse2 documents `AZURE_STORAGE_ACCESS_KEY`; the example now uses that variable and relies on BlobFuse2 environment-variable overrides.
- The performance section used a non-BlobFuse2 `stream` config block. BlobFuse2 streaming mode uses `block_cache`, so the snippet now uses `block_cache` parameters.
- The troubleshooting command appended `user_allow_other` after the mount was already running. Updated it to verify the setting, matching the earlier Dockerfile fix.

## Review Notes
- The article is technically relevant and contains implementation details, so it was reviewed as a code-bearing technical guide.
- The examples still require a Linux Docker host with FUSE support and appropriate Azure permissions; Docker Desktop mount propagation behavior can differ from native Linux.
