# Validation Summary: How to Implement Crossplane Provider for Azure

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Crossplane
- Crossplane Provider packages and ProviderConfig
- crossplane-contrib/provider-azure
- Azure CLI
- Azure service principals
- Azure Resource Groups
- Azure Storage Accounts
- Azure Cosmos DB
- Azure Virtual Network and Subnet resources
- Azure Kubernetes Service
- Azure Cache for Redis

## Sources Consulted
- Crossplane provider package documentation: https://docs.crossplane.io/latest/packages/providers/
- Crossplane Azure provider repository and README: https://github.com/crossplane-contrib/provider-azure
- Crossplane Azure provider v0.20.1 CRD reference: https://doc.crds.dev/github.com/crossplane-contrib/provider-azure@v0.20.1
- Crossplane Azure provider v0.20.1 examples: https://github.com/crossplane-contrib/provider-azure/tree/v0.20.1/examples
- Azure CLI service principal documentation: https://learn.microsoft.com/en-us/cli/azure/ad/sp?view=azure-cli-latest
- Azure CLI service principal tutorial: https://learn.microsoft.com/en-us/cli/azure/azure-cli-sp-tutorial-1?view=azure-cli-latest
- AKS supported Kubernetes versions: https://learn.microsoft.com/en-us/azure/aks/supported-kubernetes-versions
- Azure Database for MySQL Single Server lifecycle: https://learn.microsoft.com/en-us/lifecycle/products/azure-database-for-mysql-single-server
- Upbound provider-family Azure ProviderConfig reference for managed identity comparison: https://marketplace.upbound.io/providers/upbound/provider-family-azure/v2.5.3/resources/azure.m.upbound.io/ProviderConfig/v1beta1

## Issues Found
- The provider install used `xpkg.upbound.io/crossplane-contrib/provider-azure:v0.35.0`, but the legacy `provider-azure` APIs shown in the post only exist through the archived provider line, whose latest stable release is v0.20.1. Updated the install to a `Provider` manifest using `xpkg.crossplane.io/crossplane-contrib/provider-azure:v0.20.1`.
- The post claimed the legacy provider exposes hundreds of CRDs and can manage virtually any Azure service. Updated the wording because v0.20.1 exposes a focused set of 24 CRDs.
- The Azure CLI example used deprecated `--sdk-auth`. Replaced it with the current `--json-auth true` option.
- The ResourceGroup example included `tags`, which are not in the v0.20.1 ResourceGroup CRD schema. Removed those fields.
- The Storage Account example used a generated selector field that is not present on the legacy `Account` CRD. Replaced it with `resourceGroupName`, added the required `sku.tier`, and changed `StorageV2` to the supported legacy `Storage` kind.
- The SQL Server and SQL Database examples used nonexistent CRDs for this provider. Replaced the section with a valid `CosmosDBAccount` example.
- The original MySQL fallback would have mapped to Azure Database for MySQL Single Server, which Microsoft retired on September 16, 2024. Avoided that retired service path by using Cosmos DB instead.
- The AKS example used fields that are not in the legacy `AKSCluster` schema, including `enableRBAC`, `networkProfile`, `identity`, and `tags`. Replaced them with schema-supported fields and added `vnetSubnetIDSelector`.
- The AKS version `1.27` is no longer a supported AKS version. Updated the example to `1.35`, which is supported as of the review date.
- The managed identity `ProviderConfig` example used `InjectedIdentity`, which the legacy provider does not support. Replaced it with a valid filesystem credential example and noted that managed identity belongs to newer provider-family packages.
- The multiple-subscription examples used unsupported top-level subscription override fields. Removed those fields and clarified that each credential file should target the intended subscription.
- The Redis example used `minimumTlsVersion: "1.2"`, while the legacy CRD documents the enum-style value. Updated it to `OneFullStopTwo`.
- Several selector examples referenced labels that were not present on the target resources. Added labels to the ResourceGroup, VirtualNetwork, and Subnet examples where selectors are used.
- Monitoring commands still referenced `sqlserver`. Updated them to `cosmosdbaccount`.

## Review Notes
The post is now validated for the archived legacy `crossplane-contrib/provider-azure` v0.20.1 API surface. For new production work, the newer Azure provider-family packages are a better long-term direction because they are actively maintained and expose modern Azure resource APIs, including managed identity fields not available in the legacy provider.
