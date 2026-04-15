# Validation Summary: How to Deploy Dapr with Azure Bicep

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Bicep (infrastructure-as-code DSL)
- Azure Kubernetes Service (AKS)
- Dapr (Distributed Application Runtime)
- AKS Dapr Extension (Microsoft.KubernetesConfiguration/extensions)
- Azure Key Vault
- Azure CLI

## Sources Consulted
- Microsoft.KubernetesConfiguration/extensions Bicep reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.kubernetesconfiguration/extensions
- Install Dapr Extension for AKS: https://learn.microsoft.com/en-us/azure/aks/dapr
- Configure the Dapr Extension for AKS: https://learn.microsoft.com/en-us/azure/aks/dapr-settings
- Microsoft.ContainerService/managedClusters 2023-10-01 reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.containerservice/2023-10-01/managedclusters
- Microsoft.KeyVault/vaults 2023-07-01 reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.keyvault/2023-07-01/vaults
- Extensions REST API 2023-05-01: https://learn.microsoft.com/en-us/rest/api/kubernetesconfiguration/extensions/get?view=rest-kubernetesconfiguration-2023-05-01

## Issues Found
No technical issues found.

## Review Notes
- The API versions used (`2023-10-01` for AKS, `2023-05-01` for extensions, `2023-07-01` for Key Vault) are all valid GA versions, though newer versions may be available. This is acceptable for a tutorial.
- Kubernetes version `1.29.0` is valid but will eventually fall out of AKS support as newer versions are released. Readers should check current supported versions.
- Dapr version `1.13.0` is pinned with `autoUpgradeMinorVersion: false`. The `releaseTrain: 'stable'` property is also set, which is slightly redundant when a specific version is pinned (the version takes precedence), but does not cause errors.
- All Dapr extension configuration settings (`global.mtls.enabled`, `dapr_operator.replicaCount`, `dapr_sentry.replicaCount`, `dapr_placement.replicaCount`, `global.logAsJson`) are correctly named and documented.
- The Bicep `scope` keyword usage for deploying the extension resource against the AKS cluster is correct.
- The `extensionType: 'microsoft.dapr'` uses the correct lowercase casing for Bicep/ARM templates.
