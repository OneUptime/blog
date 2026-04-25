# Validation Summary: How to Add an Azure ACI Environment to Portainer - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer
- Azure Container Instances (ACI)
- Azure CLI
- Microsoft Entra service principals
- Portainer HTTP API
- `curl`
- Bash

## Sources Consulted
- Portainer Documentation: Add an ACI environment - https://docs.portainer.io/admin/environments/add/aci
- Portainer Documentation: Add a new environment - https://docs.portainer.io/admin/environments/add
- Portainer Documentation: Add a new container (Azure ACI) - https://docs.portainer.io/user/aci/containers/add
- Portainer Documentation: API usage examples - https://docs.portainer.io/sts/api/examples
- Portainer source: Azure environment creation handler - https://github.com/portainer/portainer/blob/develop/api/http/handler/endpoints/endpoint_create.go
- Portainer source: Azure query/path helpers - https://github.com/portainer/portainer/blob/develop/app/react/azure/queries/utils.ts
- Portainer source: Azure container group service - https://github.com/portainer/portainer/blob/develop/app/react/azure/services/container-groups.service.ts
- Portainer source: Azure environment wizard - https://github.com/portainer/portainer/blob/develop/app/react/portainer/environments/wizard/EnvironmentsCreationView/WizardAzure/WizardAzure.tsx
- Microsoft Learn: Create an Azure service principal with Azure CLI - https://learn.microsoft.com/en-us/cli/azure/azure-cli-sp-tutorial-1?view=azure-cli-lts
- Microsoft Learn: `az ad sp create-for-rbac` reference - https://learn.microsoft.com/en-us/cli/azure/ad/sp?view=azure-cli-latest&preserve-view=true
- Microsoft Learn: Azure Container Instances container groups - https://learn.microsoft.com/en-us/azure/container-instances/container-instances-container-groups
- Microsoft Learn: Azure Container Instances resource and quota limits - https://learn.microsoft.com/en-us/azure/container-instances/container-instances-resource-and-quota-limits
- Microsoft Learn: Mount an Azure file share in Azure Container Instances - https://learn.microsoft.com/en-us/azure/container-instances/container-instances-volume-azure-files
- Microsoft Learn: Azure Container Instances documentation hub - https://learn.microsoft.com/en-us/azure/container-instances/

## Issues Found
- The Portainer UI field list for adding an ACI environment was incorrect. I updated it to the current fields `Application ID`, `Tenant ID`, and `Authentication Key`, and removed subscription/resource group/location from that step because those are selected later when deploying a container instance.
- The Portainer API example for creating the ACI environment was incorrect. I replaced the JSON payload with the current `multipart/form-data` request Portainer expects, including `EndpointCreationType=3`, `AzureApplicationID`, `AzureTenantID`, and `AzureAuthenticationKey`.
- The container deployment navigation was incorrect. I changed `Containers -> Add container` to `Container instances -> Add container` to match current Portainer ACI UI.
- The sample single-container resource values were not aligned with current ACI container group minimum allocation guidance. I updated the example from `0.5 vCPU / 0.5 GB` to `1 vCPU / 1 GB`.
- The section describing Portainer stacks / Docker Compose deployment on ACI was misleading. I replaced it with a correct note that Portainer's Azure ACI integration manages container instances/container groups, while Azure-native YAML/ARM/Docker Compose tooling should be used for multi-container ACI deployments.
- The Portainer API path for listing ACI workloads was incorrect. I updated it to the current Azure proxy path that includes the subscription and `api-version` query parameter.
- The limitations section overstated storage constraints. I corrected it to say that durable storage requires Azure Files rather than claiming persistent volumes are unavailable.
- The conclusion overstated the permissions model as the "minimum permissions needed". I rephrased this to the accurate claim that scoping Contributor access to one resource group limits Portainer's access.

## Review Notes
- The blog remains technically relevant and salvageable after correction.
- Portainer's API examples still document JWT-based authentication via `/api/auth`, so the token bootstrap shown in the post remains valid. For longer-lived automation, Portainer also documents user access tokens via `X-API-Key`.
- Reviewed against current official documentation and upstream Portainer source as of April 25, 2026.
