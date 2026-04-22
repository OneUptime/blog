# Validation Summary: How to Select Azure Regions for ACI Deployments in Portainer - Select

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Azure Container Instances
- Azure CLI
- Azure Resource Manager resource providers
- Azure Traffic Manager
- Azure Front Door

## Sources Consulted
- Portainer documentation: Add an ACI environment - https://docs.portainer.io/admin/environments/add/aci
- Portainer documentation: Add a new ACI container - https://docs.portainer.io/user/aci/containers/add
- Microsoft Learn: Azure CLI `az container` reference - https://learn.microsoft.com/en-us/cli/azure/container
- Microsoft Learn: Azure resource providers and types - https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-providers-and-types
- Microsoft Learn: Resource Management Providers - Get REST API - https://learn.microsoft.com/en-us/rest/api/resources/providers/get
- Microsoft Learn: Resource availability and quota limits for Azure Container Instances - https://learn.microsoft.com/en-us/azure/container-instances/container-instances-resource-and-quota-limits
- Microsoft Learn: Reliability in Azure Container Instances - https://learn.microsoft.com/en-us/azure/reliability/reliability-container-instances
- Microsoft Learn: Deploy container instances that use GPU resources - https://learn.microsoft.com/en-us/azure/container-instances/container-instances-gpu

## Issues Found
- The Portainer workflow incorrectly said the region is selected when adding the ACI environment. Portainer's current documentation shows the ACI environment wizard collects connection details, while the deployment **Location** is selected when adding a container. Updated the section and conclusion to reflect that region/location is selected per container deployment.
- The `az container create` example had an inline comment after a Bash line-continuation backslash, which would break the command. Removed the inline comment from that continued line.
- The Azure provider location query returned the nested `locations` array. Updated the JMESPath expression to use `| [0]` and changed `-n` to the documented `--namespace` option.
- The GPU capability check used `az container show -h`, which only displays command help and does not check supported GPU SKUs. Replaced it with current availability-zone metadata guidance and noted that GPU-enabled ACI container groups were retired on July 14, 2025.
- The availability explanation referred to VM sizes, which is imprecise for ACI. Updated it to refer to ACI features, quotas, and regional capacity.

## Review Notes
The local environment does not have Azure CLI installed, so CLI syntax was verified against official Microsoft Learn CLI documentation rather than local `az --help` output.
