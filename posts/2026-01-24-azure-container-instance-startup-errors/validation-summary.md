# Validation Summary: How to Fix 'Container Instance' Startup Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure Container Instances
- Azure Container Registry
- Azure CLI
- Azure managed identities
- Azure Key Vault
- Azure Files
- Docker
- YAML container group deployments

## Sources Consulted
- Microsoft Learn: Azure Container Instances states - https://learn.microsoft.com/en-us/azure/container-instances/container-state
- Microsoft Learn: Retrieve container logs and events in Azure Container Instances - https://learn.microsoft.com/en-us/azure/container-instances/container-instances-get-logs
- Microsoft Learn: Azure CLI `az container` reference - https://learn.microsoft.com/en-us/cli/azure/container
- Microsoft Learn: Deploy to Azure Container Instances from Azure Container Registry using a managed identity - https://learn.microsoft.com/en-us/azure/container-instances/using-azure-container-registry-mi
- Microsoft Learn: Resource availability and quota limits for Azure Container Instances - https://learn.microsoft.com/en-us/azure/container-instances/container-instances-resource-and-quota-limits
- Microsoft Learn: YAML reference for Azure Container Instances - https://learn.microsoft.com/en-us/azure/container-instances/container-instances-reference-yaml
- Microsoft Learn: Set environment variables in container instances - https://learn.microsoft.com/en-us/azure/container-instances/container-instances-environment-variables
- Microsoft Learn: Deploy container instances into an Azure virtual network - https://learn.microsoft.com/en-us/azure/container-instances/container-instances-vnet
- Microsoft Learn: Mount an Azure file share in Azure Container Instances - https://learn.microsoft.com/en-us/azure/container-instances/container-instances-volume-azure-files
- Microsoft Learn: Set up liveness probe on container instance - https://learn.microsoft.com/en-us/azure/container-instances/container-instances-liveness-probe
- Microsoft Learn: Set up readiness probe on container instance - https://learn.microsoft.com/en-us/azure/container-instances/container-instances-readiness-probe

## Issues Found
- Replaced `az container logs --previous` with `az container logs --follow` because the Azure CLI `az container logs` command supports `--follow` and does not document a `--previous` option.
- Updated the managed identity ACR example to create a user-assigned managed identity, grant it the `acrpull` role on the registry, and pass that identity to `--acr-identity` and `--assign-identity`. The previous system-assigned example omitted the required AcrPull role assignment and did not match the documented image-pull flow.
- Changed the resource constraint example error code from `InaccessibleImage` to a resource availability error. `InaccessibleImage` is an image access error, not a CPU or memory capacity error.
- Updated the standard ACI resource limit text from 4 CPUs and 16 GB memory to the current documented standard container group maximum of 31 CPUs and 240 GB memory, while preserving the regional capacity caveat for deployments above 4 CPUs and 16 GB.
- Removed the GPU container create example because ACI GPU resources are documented as retired as of July 14, 2025.
- Replaced the claimed Key Vault integration YAML with a deployment-time Key Vault retrieval command that passes the value through `--secure-environment-variables`. The original YAML used shell command substitution inside a YAML file, which would not execute as written, and implied native Key Vault integration that ACI does not provide in that form.
- Replaced the health probe command example with an ACI YAML deployment that actually configures `livenessProbe` and `readinessProbe`. The previous command only set restart policy and did not configure health probes.

## Review Notes
The local environment did not have the Azure CLI installed, so CLI validation was performed against Microsoft Learn's current Azure CLI reference and ACI documentation rather than local `az --help` output.
