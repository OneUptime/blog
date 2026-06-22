# Validation Summary: How to Configure Azure Container Registry

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Azure Container Registry
- Azure CLI
- Terraform AzureRM provider
- Docker
- Azure Kubernetes Service
- ACR Tasks
- Azure Private Link
- GitHub Actions
- Azure Monitor and Log Analytics
- Microsoft Defender for Containers

## Sources Consulted
- Microsoft Learn: Azure Container Registry SKU features and limits - https://learn.microsoft.com/en-us/azure/container-registry/container-registry-skus
- Microsoft Learn: Azure Container Registry authentication - https://learn.microsoft.com/en-us/azure/container-registry/container-registry-authentication
- Microsoft Learn: Service principal authentication for ACR - https://learn.microsoft.com/en-us/azure/container-registry/container-registry-auth-service-principal
- Microsoft Learn: Azure CLI `az acr task` reference - https://learn.microsoft.com/en-us/cli/azure/acr/task
- Microsoft Learn: ACR purge command - https://learn.microsoft.com/en-us/azure/container-registry/container-registry-auto-purge
- Microsoft Learn: Azure CLI `az acr repository` reference - https://learn.microsoft.com/en-us/cli/azure/acr/repository
- Microsoft Learn: Azure CLI `az acr manifest` reference - https://learn.microsoft.com/en-us/cli/azure/acr/manifest
- Microsoft Learn: ACR private endpoints - https://learn.microsoft.com/en-us/azure/container-registry/container-registry-private-endpoints
- Microsoft Learn: ACR public network access rules - https://learn.microsoft.com/en-us/azure/container-registry/container-registry-access-selected-networks
- Microsoft Learn: ACR monitoring data reference - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-logs/microsoft-containerregistry-registries-logs
- Microsoft Learn: Defender for Cloud Resource Graph vulnerability query samples - https://learn.microsoft.com/en-us/azure/defender-for-cloud/resource-graph-samples
- Microsoft Learn: Container vulnerability assessments REST API - https://learn.microsoft.com/en-us/azure/defender-for-cloud/subassessment-rest-api
- Microsoft Learn: Docker Content Trust deprecation in ACR - https://learn.microsoft.com/en-us/azure/container-registry/container-registry-content-trust-deprecation
- HashiCorp AzureRM provider `azurerm_container_registry` documentation source - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/container_registry.html.markdown

## Issues Found
- The Terraform example used nested `retention_policy` and `trust_policy` blocks. Current AzureRM provider documentation uses `retention_policy_in_days` and `trust_policy_enabled`; because Docker Content Trust is deprecated and can no longer be newly enabled after May 31, 2026, the example was updated to keep only `retention_policy_in_days`.
- The Terraform `georeplications` blocks were not in the provider-documented alphabetical order by `location`. Reordered them to avoid unnecessary diffs or provider validation issues.
- The post used the old Azure AD name. Updated those references to Microsoft Entra ID.
- The GitHub Actions example used `azure/login@v1` and `az acr security-assessment show`, which is not a current Azure CLI command. Updated the action to `azure/login@v2` and replaced the scan lookup with an Azure Resource Graph query against Microsoft Defender for Containers vulnerability sub-assessments.
- The image management section used deprecated `az acr repository show-manifests`. Replaced it with `az acr manifest list-metadata`.
- The best-practices section still recommended Content Trust as a production feature. Updated it to avoid recommending deprecated Docker Content Trust and to refer to Notary Project-based signing in the closing guidance.
- The image-scanning best practice referred to Microsoft Defender for container registries, a deprecated plan for new subscriptions. Updated it to Microsoft Defender for Containers.

## Review Notes
The Azure CLI commands could not be executed locally because Azure CLI is not installed in this workspace, so CLI syntax was verified against Microsoft Learn command references instead. The Resource Graph vulnerability query depends on Microsoft Defender for Containers being enabled and scan results being available asynchronously after push/import.
