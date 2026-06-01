# Validation Summary: How to Set Up ACR Anonymous Pull Access for Public Container Image Distribution

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Container Registry
- Azure CLI
- Docker
- Podman
- Kubernetes
- GitHub Actions
- Azure Monitor diagnostic settings
- Kusto Query Language
- Cosign and Notation image signing

## Sources Consulted
- Microsoft Learn: Unauthenticated anonymous pull access in Azure Container Registry - https://learn.microsoft.com/en-us/azure/container-registry/anonymous-pull-access
- Microsoft Learn: Azure Container Registry service tiers - https://learn.microsoft.com/en-us/azure/container-registry/container-registry-skus
- Microsoft Learn: Azure CLI `az acr` reference - https://learn.microsoft.com/en-us/cli/azure/acr
- Microsoft Learn: Monitor Azure Container Registry - https://learn.microsoft.com/en-us/azure/container-registry/monitor-container-registry
- Microsoft Learn: Azure Monitor Logs reference for `ContainerRegistryRepositoryEvents` - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/containerregistryrepositoryevents
- Microsoft Learn: Azure Monitor diagnostic settings CLI reference - https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings
- Kubernetes documentation: Deployments - https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Microsoft Learn: Authenticate to Azure from GitHub Actions by a secret - https://learn.microsoft.com/en-us/azure/developer/github/connect-from-azure-secret
- Microsoft Learn: Overview of signing and verifying OCI artifacts in Azure Container Registry - https://learn.microsoft.com/en-us/azure/container-registry/overview-sign-verify-artifacts

## Issues Found
- The introduction said the guide covered controlling which repositories are accessible, but ACR anonymous pull is registry-wide. Changed the wording to describe structuring public and private registries.
- The Azure CLI prerequisite listed version 2.50 or later. Microsoft documents Azure CLI 2.21.0 or later for configuring anonymous pull, so the prerequisite was corrected.
- The first Kubernetes Deployment snippet was missing the required `spec.selector` and matching pod template labels for `apps/v1`. Added the selector, labels, and replicas so the manifest is structurally valid.
- The GitHub Actions example used `azure/login@v1`. Updated it to `azure/login@v2`, matching current Microsoft documentation.
- The KQL query used `CallerIPAddress`, but the documented Azure Monitor column is `CallerIpAddress`. Corrected the field name.
- The ACR limits table listed Standard as 1,000 reads per minute and used MBps units. Microsoft documents Standard as 3,000 ReadOps per minute, Premium as 10,000 ReadOps per minute, and download bandwidth in Mbps. Corrected the table heading, Standard value, and units.
- The security section recommended Notary or Cosign. Updated the Azure-aligned signing terminology to Notation or Cosign.

## Review Notes
The remaining commands and claims are consistent with official documentation: anonymous pull is available on Standard and Premium tiers, applies to all repositories in the registry, leaves write operations authenticated, can be enabled or disabled with `az acr update --anonymous-pull-enabled`, and geo-replication requires Premium SKU. The post correctly notes that network restrictions still apply and that anonymous access does not provide a per-user audit trail.
