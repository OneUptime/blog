# Validation Summary: How to Deploy Azure Resources with ASO and Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Service Operator v2
- Flux CD
- Kubernetes custom resources
- HelmRelease and HelmRepository resources
- Kustomize overlays
- Azure Resource Manager
- Azure CLI
- Azure Storage Accounts
- Azure Database for PostgreSQL Flexible Server
- Azure Virtual Network and Network Security Groups

## Sources Consulted
- Azure Service Operator installation and Helm chart values: https://pkg.go.dev/github.com/Azure/azure-service-operator/v2
- Azure Service Operator Helm chart index: https://raw.githubusercontent.com/Azure/azure-service-operator/main/v2/charts/index.yaml
- Azure Service Operator credential format: https://azure.github.io/azure-service-operator/guide/authentication/credential-format/
- Azure Service Operator credential scope: https://azure.github.io/azure-service-operator/guide/authentication/credential-scope/
- Azure Service Operator CRD management: https://azure.github.io/azure-service-operator/guide/crd-management/
- Azure Service Operator supported resources: https://azure.github.io/azure-service-operator/reference/
- Azure Service Operator Storage API reference: https://azure.github.io/azure-service-operator/reference/storage/v20250601/
- Azure Service Operator PostgreSQL API reference: https://azure.github.io/azure-service-operator/reference/dbforpostgresql/v20250801/
- Azure Service Operator Network API reference: https://azure.github.io/azure-service-operator/reference/network/v20250301/
- Azure Service Operator secrets guide: https://azure.github.io/azure-service-operator/guide/secrets/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The ASO HelmRelease pinned `2.6.x`, which did not match the current ASO resource API versions needed by the post. Updated the chart constraint to `2.19.x`, matching the current official chart index.
- The HelmRelease was created in `azureserviceoperator-system` without declaring that namespace. Added a Namespace manifest before the HelmRepository and HelmRelease examples.
- The Helm values mixed workload identity with service principal secret instructions. Updated the Helm values to use the service principal fields documented by ASO for this tutorial path.
- The sample included `containerservice.azure.com/*` in `crdPattern` even though no ContainerService resources are used. Removed it so the CRD list matches the examples.
- The `aso-credential` secret was placed in `azureserviceoperator-system`, but the ASO resources are in `default`. Moved it to `default` and clarified that it is a namespace-scoped credential.
- The StorageAccount examples used deprecated `storage.azure.com/v1api20230101`. Updated them to `storage.azure.com/v20250601`.
- The PostgreSQL examples used `dbforpostgresql.azure.com/v1api20230601`, which is not a supported ASO CRD version. Updated them to `dbforpostgresql.azure.com/v20250801`.
- The Network examples used older `network.azure.com/v1api20240101` resources. Updated VirtualNetwork, VirtualNetworksSubnet, and NetworkSecurityGroup to `network.azure.com/v20250301`.
- The Flux Kustomization used `wait: true` together with `healthChecks`; Flux ignores `healthChecks` when `wait` is enabled. Removed `wait: true` so the explicit health check is meaningful.
- The Flux Kustomization used `dependsOn` as if it could reference the ASO HelmRelease. Flux Kustomization `dependsOn` references other Kustomization resources, so the invalid dependency was removed.
- The storage secret export example used `connectionString1`, which is not exposed by the current ASO StorageAccount operator secrets. Replaced it with `blobEndpoint` alongside `key1`.

## Review Notes
The examples remain illustrative and still require user-specific values such as globally unique storage account names, Azure IDs, and real credentials. For production use, workload identity is still preferable to storing service principal secrets in Git-managed manifests.
