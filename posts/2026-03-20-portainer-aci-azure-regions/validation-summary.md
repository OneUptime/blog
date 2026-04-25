# Validation Summary: How to Select Azure Regions for ACI Deployments in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Azure Container Instances (ACI)
- Azure CLI
- Azure Traffic Manager
- Azure Retail Prices API
- Bash

## Sources Consulted
- Portainer Documentation: Welcome (`CE` and `BE` both support Azure ACI) - https://docs.portainer.io/2.21
- Portainer Documentation: Add a new container - https://docs.portainer.io/user/aci/containers/add
- Portainer Documentation: Add an ACI environment - https://docs.portainer.io/sts/admin/environments/add/aci
- Portainer Documentation: Accessing the Portainer API - https://docs.portainer.io/2.21/api/access
- Microsoft Learn: Azure resource providers and types - https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-providers-and-types
- Microsoft Learn: Quickstart - Deploy a container instance in Azure using the Azure portal - https://learn.microsoft.com/en-us/azure/container-instances/container-instances-quickstart-portal
- Microsoft Learn: Reliability in Azure Container Instances - https://learn.microsoft.com/en-us/azure/container-instances/availability-zones
- Microsoft Learn: Azure Retail Prices overview - https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices
- Microsoft Learn: Azure Traffic Manager CLI profile commands - https://learn.microsoft.com/en-us/cli/azure/network/traffic-manager/profile?view=azure-cli-lts
- Microsoft Learn: Azure Traffic Manager CLI endpoint commands - https://learn.microsoft.com/en-us/cli/azure/network/traffic-manager/endpoint?view=azure-cli-latest
- Microsoft Learn: Traffic Manager endpoint types - https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-endpoint-types
- Microsoft Learn: Azure Traffic Manager FAQ - https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-faqs
- Microsoft Learn: Azure Container Instances REST API, Container Groups Create Or Update - https://learn.microsoft.com/en-us/rest/api/container-instances/container-groups/create-or-update?view=rest-container-instances-2023-05-01
- Portainer source: Azure container group create service - https://github.com/portainer/portainer/blob/develop/app/react/azure/services/container-groups.service.ts
- Portainer source: Azure request URL builder - https://github.com/portainer/portainer/blob/develop/app/react/azure/queries/utils.ts
- Portainer source: Azure container group proxy handler - https://github.com/portainer/portainer/blob/develop/api/http/proxy/factory/azure/containergroup.go

## Issues Found
- The prerequisites incorrectly implied that Portainer Business Edition was required. I changed this to `Portainer CE or BE` because Portainer documents Azure ACI support in both editions.
- The post referred to a `Region` dropdown in Portainer. Portainer's ACI UI uses `Location`, and the navigation path is `Container instances` then `Add container`, so I corrected that workflow.
- The `az container list --resource-group dummy-rg` example did not verify whether a region supports ACI. I replaced it with a provider-based location check that actually tests whether `Microsoft.ContainerInstance/containerGroups` is available in a specific Azure location.
- The `az account list-locations` example was described as listing ACI locations, but it only lists subscription locations. I kept it as a supporting command and clarified that it is not ACI-specific.
- The latency example queried `https://<region>.azurecontainer.io`, which is not a valid generic ACI endpoint. I replaced it with a test against actual ACI FQDNs or public IPs returned by deployments.
- The data residency example mixed UK and EU guidance and overstated compliance implications. I removed `uksouth` from the EU list and rewrote the comments to frame region choice as residency guidance that still needs compliance validation.
- The cost section made unstable pricing claims like “typically lowest cost” and used an unsupported Retail Prices API version (`2023-01-01`) with a malformed `curl` URL. I replaced it with a working `2023-01-01-preview` example using `--data-urlencode` and removed the unsupported generalization.
- The Portainer multi-region API example used an incorrect endpoint (`/api/endpoints/{id}/azure/aci`), the wrong HTTP method, and an invalid payload shape for ACI. I replaced it with the correct Portainer Azure gateway pattern, `PUT` method, Azure Container Groups request body, API-key auth, and response-based FQDN handling.
- The Traffic Manager example omitted monitor settings needed for a realistic profile definition and assumed ACI hostnames could be safely constructed. I added the HTTP monitoring parameters and changed the endpoint targets to placeholders for the actual FQDNs returned by ACI.
- The conclusion referred to the `region` dropdown instead of the `Location` dropdown, so I corrected that wording.

## Review Notes
- Azure Container Instances region availability is dynamic and subscription-specific, so static region lists can become stale quickly. The post now points readers to live verification through Portainer and Azure CLI.
- The Traffic Manager example assumes the application is reachable over HTTP on port `80` with health checks on `/`. Readers using HTTPS or a different health endpoint will need to adjust those parameters.
- The Portainer API example is based on Portainer's Azure proxy behavior in the current official docs and source code, plus the ACI REST API shape documented by Microsoft. If Portainer changes its Azure proxy implementation in a future release, that example should be revalidated.
