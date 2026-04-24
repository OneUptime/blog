# Validation Summary: How to Deploy Containers to Azure ACI via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition
- Portainer API
- Azure Container Instances (ACI)
- Azure CLI
- Docker container images
- Azure Virtual Network

## Sources Consulted
- Portainer docs: https://docs.portainer.io/user/aci/containers/add
- Portainer docs: https://docs.portainer.io/user/aci/containers/details
- Portainer docs: https://docs.portainer.io/api/access
- Portainer docs: https://docs.portainer.io/api/docs
- Portainer source: https://github.com/portainer/portainer/blob/develop/app/react/azure/services/container-groups.service.ts
- Portainer source: https://github.com/portainer/portainer/blob/develop/app/react/azure/queries/utils.ts
- Portainer source: https://github.com/portainer/portainer/blob/develop/app/portainer/models/endpoint/models.js
- Portainer source: https://github.com/portainer/portainer/blob/develop/api/http/handler/auth/authenticate.go
- Portainer source: https://github.com/portainer/portainer/blob/develop/api/http/handler/endpoints/endpoint_create.go
- Azure Container Instances docs: https://learn.microsoft.com/en-us/azure/container-instances/container-instances-container-groups
- Azure Container Instances docs: https://learn.microsoft.com/en-us/azure/container-instances/container-instances-stop-start
- Azure Container Instances docs: https://learn.microsoft.com/en-us/azure/container-instances/container-instances-quickstart-portal
- Azure Container Instances docs: https://learn.microsoft.com/en-us/azure/container-instances/container-instances-resource-and-quota-limits
- Azure Container Instances docs: https://learn.microsoft.com/en-us/azure/container-instances/container-instances-restart-policy
- Azure CLI docs: https://learn.microsoft.com/en-us/cli/azure/container?view=azure-cli-latest

## Issues Found
- The single-container resource example used `0.5` vCPU as if it were a valid minimum. Azure documents a minimum allocation of `1 CPU` and `1 GB` per container group, so the example was corrected to `1.0` vCPU and the minimum note was updated.
- The Portainer networking steps incorrectly described a `Public IP address` toggle and DNS label entry in the Portainer flow. Portainer's ACI add-container docs document published ports plus optional `Private Network`, `Virtual Network`, and `Subnet` fields, so the section was corrected to match the documented UI.
- The Portainer API examples used a non-existent `POST /api/endpoints/{id}/azure/aci` endpoint and an Azure payload shape that does not match Portainer's current implementation. The examples were replaced with the current Portainer Azure proxy pattern: `PUT /api/endpoints/{id}/azure/subscriptions/{subscriptionId}/resourceGroups/{resourceGroup}/providers/Microsoft.ContainerInstance/containerGroups/{name}?api-version=2018-04-01` and the request body was updated to the `location` plus `properties` schema Portainer sends.
- The multi-container example implied generic multi-container support without noting the platform restriction. Azure documents that multi-container groups are supported for Linux containers only, so the text was corrected accordingly.
- The monitoring section claimed that Portainer's ACI details view provides logs and resource-usage views. Portainer's ACI docs show `Container`, `Events`, `Actions`, and `Access control`, so the section was corrected and Azure CLI remained the log/status path.
- The conclusion said ACI provides `automatic scaling to zero`, which is inaccurate for ACI container groups. It was revised to describe ACI accurately as suitable for on-demand, stateless, and run-to-completion workloads.

## Review Notes
- The Portainer authentication example still uses `/api/auth` with a bearer token. That flow is still supported by current Portainer source, although the Portainer API docs recommend access tokens with the `X-API-Key` header for regular API use.
- The Azure CLI commands in the post are current and valid as of April 24, 2026.
- ACI public DNS names are valid Azure functionality, but the current Portainer ACI add-container documentation does not document DNS label entry in that workflow, so the Portainer-specific steps were kept conservative.
