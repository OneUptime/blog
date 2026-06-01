# Validation Summary: How to Set Resource Limits for CPU and Memory in Azure Container Instances

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Azure Container Instances
- Azure CLI
- Azure Resource Manager / ACI YAML
- Azure Monitor metrics
- Docker CLI

## Sources Consulted
- Azure Container Instances YAML reference: https://learn.microsoft.com/en-us/azure/container-instances/container-instances-reference-yaml
- Azure CLI `az container` reference: https://learn.microsoft.com/en-us/cli/azure/container
- Container groups in Azure Container Instances: https://learn.microsoft.com/en-us/azure/container-instances/container-instances-container-groups
- Resource availability and quota limits for Azure Container Instances: https://learn.microsoft.com/en-us/azure/container-instances/container-instances-resource-and-quota-limits
- Azure Container Instances List Usage REST API: https://learn.microsoft.com/en-us/rest/api/container-instances/location/list-usage
- Manually stop or start Azure Container Instances container groups: https://learn.microsoft.com/en-us/azure/container-instances/container-instances-stop-start
- Azure Container Instances monitoring data reference: https://learn.microsoft.com/en-us/azure/container-instances/monitor-azure-container-instances-reference

## Issues Found
- The YAML examples used `memoryInGb`; the official ACI YAML schema uses `memoryInGB`. Updated all resource request and limit examples to use the correct property casing.
- The resource tier section listed outdated general maximums of 4 CPU cores and 16 GB memory for Linux container groups and 1-4 CPU / 1-16 GB for Windows containers. Updated the section to reflect current standard container group limits of 31 CPU cores and 240 GB memory, the minimum container group allocation, and the lower spot container maximum.
- The post said ACI charges as long as a container group exists, even when stopped. Azure documentation states that stopped container group resources are deallocated and billing stops. Updated the guidance to stop or delete unused groups and added an `az container stop` example.
- The quota section listed a default 100 GB memory quota, which is not listed in the current ACI quota table. Removed that bullet.
- The quota-check command used `az container list`, which lists container groups rather than subscription quota usage. Replaced it with an `az rest` call to the official ACI List Usage endpoint.

## Review Notes
- Azure CLI was not installed in the local environment, so CLI syntax was verified against the official Azure CLI documentation rather than local `az --help` output.
- The Azure Monitor metric names `CpuUsage` and `MemoryUsage` match the official Container Instances monitoring reference.
- ACI resource availability can vary by region, SKU, and capacity, so the post now directs readers to check their target region before deployment.
