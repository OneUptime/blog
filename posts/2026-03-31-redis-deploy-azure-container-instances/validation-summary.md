# Validation Summary: How to Deploy Redis with Azure Container Instances

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis 7 (Alpine image)
- Azure Container Instances (ACI)
- Azure Files (SMB file shares)
- Azure CLI (`az container`, `az storage`)
- Azure Resource Manager (ARM) templates
- Virtual network integration

## Sources Consulted
- `az container create --help` — verified all CLI flags including `--ip-address`, `--azure-file-volume-*`, `--command-line`, `--restart-policy`
- `az container show --help` — verified JMESPath query paths for `instanceView.state` and `ipAddress.ip`
- `az container logs --help` — confirmed `--follow` flag
- `az container exec --help` — confirmed `--exec-command` flag
- `az storage share create --help` — verified `--name` and `--account-name` flags
- Azure REST API reference for `Microsoft.ContainerInstance/containerGroups` API version `2021-10-01` — verified ARM template schema including `volumes`, `volumeMounts`, `command`, and `azureFile` structure

## Issues Found

### 1. ARM template missing Azure Files volume mount (significant)
**What was wrong:** The ARM template defined a `storageAccountKey` parameter but never used it. The `volumes` array (at the container group level) and `volumeMounts` array (at the container level) were completely absent, meaning the ARM template deployment would not have persistent storage — contradicting the central purpose of the post.

**What was changed:** Added `storageAccountName` and `fileShareName` parameters, a `volumeMounts` array to the container properties mounting the volume at `/data`, and a `volumes` array at the container group properties level with an `azureFile` volume referencing all three storage parameters.

### 2. Description and intro incorrectly mention Key Vault (minor)
**What was wrong:** The post description said "Key Vault secrets" and the intro paragraph said "secrets management through Key Vault," but Key Vault is never used anywhere in the post. The Redis password is passed via command-line arguments (CLI) and ARM `securestring` parameters.

**What was changed:** Updated the description to say "secure parameters" instead of "Key Vault secrets." Updated the intro paragraph to say "virtual network isolation" instead of "secrets management through Key Vault."

## Review Notes
- The Redis password is passed as a plain `--command-line` argument, which means it is visible in the container group definition via `az container show`. For production use, Azure Key Vault integration or secure environment variables would be preferable, but this is acceptable for a tutorial-level post.
- The `az storage share create` command works but Microsoft recommends `az storage share-rm create` for newer deployments using the Azure Resource Manager storage provider. The classic command used in the post still functions correctly.
- The ARM template API version `2021-10-01` is valid but not the latest. Newer versions exist, though this does not affect correctness for the features used.
