# Validation Summary: How to Run Docker Containers on Azure Container Instances

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Azure Container Instances
- Azure CLI
- Azure Container Registry
- Azure managed identities
- Azure Files
- Azure Kubernetes Service virtual nodes

## Sources Consulted
- Azure Container Instances overview: https://learn.microsoft.com/en-us/azure/container-instances/container-instances-overview
- Azure Container Instances YAML reference: https://learn.microsoft.com/en-us/azure/container-instances/container-instances-reference-yaml
- Azure CLI `az container` reference: https://learn.microsoft.com/en-us/cli/azure/container?view=azure-cli-latest
- Deploy from Azure Container Registry using a managed identity: https://learn.microsoft.com/en-us/azure/container-instances/using-azure-container-registry-mi
- Set environment variables in Azure Container Instances: https://learn.microsoft.com/en-us/azure/container-instances/container-instances-environment-variables
- Mount an Azure Files volume in Azure Container Instances: https://learn.microsoft.com/en-us/azure/container-instances/container-instances-volume-azure-files
- Azure Container Instances restart policies: https://learn.microsoft.com/en-us/azure/container-instances/container-instances-restart-policy
- Azure Container Instances states: https://learn.microsoft.com/en-us/azure/container-instances/container-state
- AKS virtual nodes with Azure Container Instances: https://learn.microsoft.com/en-us/azure/aks/virtual-nodes
- Azure CLI `az storage share` reference: https://learn.microsoft.com/en-us/cli/azure/storage/share?view=azure-cli-latest
- Install Azure CLI on macOS: https://learn.microsoft.com/cli/azure/install-azure-cli-macos?view=azure-cli-latest

## Issues Found
- The container group YAML example used `apiVersion: '2023-05-01'`, but the Azure Container Instances YAML reference for `az container create --file` documents `2021-10-01` as the supported latest YAML API version. Changed the example to `apiVersion: '2021-10-01'`.
- The YAML example used `memoryInGb`; the documented ACI YAML property is `memoryInGB`. Updated both resource request entries to use the correct casing.

## Review Notes
- Azure CLI was not installed in the local environment, so command validation was performed against official Microsoft Learn CLI reference pages rather than local `az --help` output.
- DNS name labels in the examples must be unique within the Azure region; the commands are otherwise consistent with Microsoft examples.
