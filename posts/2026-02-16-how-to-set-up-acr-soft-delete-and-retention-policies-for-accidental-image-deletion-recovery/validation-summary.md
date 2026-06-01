# Validation Summary: How to Set Up ACR Soft Delete and Retention Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Container Registry
- ACR soft delete policy
- ACR retention policy for untagged manifests
- Azure CLI
- Docker
- ACR Tasks and acr purge
- Azure Monitor diagnostic settings and KQL

## Sources Consulted
- Microsoft Learn: Recover deleted artifacts with the soft delete policy in Azure Container Registry (preview): https://learn.microsoft.com/en-gb/azure/container-registry/container-registry-soft-delete-policy
- Microsoft Learn: az acr config soft-delete: https://learn.microsoft.com/en-us/cli/azure/acr/config/soft-delete
- Microsoft Learn: az acr manifest: https://learn.microsoft.com/en-us/cli/azure/acr/manifest
- Microsoft Learn: az acr repository: https://learn.microsoft.com/en-us/cli/azure/acr/repository
- Microsoft Learn: Set a retention policy to retain untagged manifests: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-retention-policy
- Microsoft Learn: az acr config retention: https://learn.microsoft.com/en-us/cli/azure/acr/config/retention
- Microsoft Learn: Automatically purge images from an Azure container registry: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-auto-purge
- Microsoft Learn: Azure Container Registry SKU features and limits: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-skus
- Microsoft Learn: Lock a container image in an Azure container registry: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-image-lock
- Microsoft Learn: Manage signed images by using Docker Content Trust in Azure Container Registry: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-content-trust

## Issues Found
- Corrected the prerequisite guidance. Soft delete is currently a preview feature available across ACR service tiers, while the separate retention policy for untagged manifests is Premium-only.
- Corrected the relationship between soft delete and retention policy. ACR does not allow both policies to be enabled on the same registry, so the post now presents them as alternatives rather than additive protections.
- Replaced the non-existent `az acr manifest show-deleted` example with `az acr manifest list-deleted-tags`.
- Fixed the `az acr manifest restore` example. The restore command takes the repository and restored tag through `--name test/nginx:1.25` and the digest through `--digest`; it does not use a separate `--tag` option.
- Removed the manual purge examples for soft-deleted artifacts. Microsoft documentation states that manually purging soft-deleted artifacts is not supported, so the post now recommends adjusting the soft delete retention period and waiting for automatic purge.
- Replaced the incorrect immutable tag example that used Docker Content Trust with the supported `az acr repository update --write-enabled false` command. Docker Content Trust signs images and is being deprecated; it is not the right mechanism for tag immutability.
- Updated cleanup guidance so scheduled ACR purge tasks are described separately from the Premium retention policy.

## Review Notes
The ACR soft delete, manifest, retention, and acr purge command groups are currently documented as preview. The post now reflects the main preview limitations, but readers should still check current Azure CLI help before applying the examples in production.
