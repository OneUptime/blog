# Validation Summary: How to Manage Azure Resources with Crossplane and ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Crossplane
- Upbound Azure providers
- Azure CLI
- Azure Database for PostgreSQL Flexible Server
- Azure Storage
- Azure Virtual Network and Private DNS
- Argo CD
- Kubernetes manifests and kubectl

## Sources Consulted
- Microsoft Learn: Azure CLI `az ad sp create-for-rbac` reference, including `--json-auth` / deprecated `--sdk-auth`: https://learn.microsoft.com/en-us/cli/azure/ad/sp?view=azure-cli-latest
- Upbound Marketplace: `provider-family-azure` `ProviderConfig` schema: https://marketplace.upbound.io/providers/upbound/provider-family-azure/v0.36.0/resources/azure.upbound.io/ProviderConfig/v1beta1
- Go package documentation for Upbound Azure `ProviderConfig` credential source enum: https://pkg.go.dev/github.com/upbound/provider-azure/apis/v1beta1
- Upbound Marketplace: `provider-azure-dbforpostgresql` `FlexibleServer` schema: https://marketplace.upbound.io/providers/upbound/provider-azure-dbforpostgresql/v0.42.1/resources/dbforpostgresql.azure.upbound.io/FlexibleServer/v1beta1
- Upbound Marketplace: `provider-azure-storage` `Account` and `Container` schemas: https://marketplace.upbound.io/providers/upbound/provider-azure-storage/v1.0.0/resources/storage.azure.upbound.io/Account/v1beta1 and https://marketplace.upbound.io/providers/upbound/provider-azure-storage/v1.0.0/resources/storage.azure.upbound.io/Container/v1beta1
- Microsoft Learn: Azure Database for PostgreSQL Flexible Server private networking and Private DNS requirements: https://learn.microsoft.com/en-us/azure/postgresql/network/concepts-networking-private
- Argo CD documentation: sync options and `RespectIgnoreDifferences=true`: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/

## Issues Found
- The Azure CLI command used deprecated `--sdk-auth`. Changed it to `--json-auth`, which is the current documented option for JSON authentication output.
- The managed identity `ProviderConfig` example omitted the Azure `subscriptionID` and `tenantID` context typically needed for managed identity authentication. Added placeholder values and clarified that the shown example is for a system-assigned managed identity.
- The PostgreSQL Flexible Server example used a non-existent `backup` block. Moved `geoRedundantBackupEnabled` and `backupRetentionDays` to the top level of `spec.forProvider`, matching the Upbound CRD schema.
- The PostgreSQL example showed a `FlexibleServerFirewallRule` for a private AKS subnet even though the server was configured for private VNet access. Replaced that manifest with a note that access is through the delegated subnet and private DNS zone, and that firewall rules apply to public network access.
- The monitoring command filtered managed resources with a label that Crossplane does not guarantee on all Azure resources. Changed it to `kubectl get managed`.
- The `kubectl describe flexibleserver app-postgres` command was made fully qualified as `kubectl describe flexibleserver.dbforpostgresql.azure.upbound.io app-postgres` to avoid ambiguity.

## Review Notes
- The post pins older Upbound provider versions. The API shapes reviewed are valid for the cluster-scoped `*.azure.upbound.io` provider family shown in the post, but newer Upbound provider releases for Crossplane 2 use namespaced `*.azure.m.upbound.io` API groups and may require different manifests.
