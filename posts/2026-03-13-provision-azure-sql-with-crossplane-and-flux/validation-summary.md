# Validation Summary: How to Provision Azure SQL with Crossplane and Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Crossplane (Upbound managed resources)
- Upbound provider-azure-sql (sql.azure.upbound.io API group)
- Upbound provider-azure-azure (azure.upbound.io API group, ResourceGroup)
- Azure SQL Database / Azure SQL Server (Microsoft SQL Server PaaS)
- Flux CD (kustomize.toolkit.fluxcd.io/v1 Kustomization)
- Kubernetes (kubectl)
- Bash / OpenSSL (for generating the admin password)

## Sources Consulted
- Upbound Marketplace - MSSQLServer resource: https://marketplace.upbound.io/providers/upbound/provider-azure-sql/v1.8.0/resources/sql.azure.upbound.io/MSSQLServer/v1beta1
- Upbound Marketplace - MSSQLDatabase resource: https://marketplace.upbound.io/providers/upbound/provider-azure-sql/v1.8.0/resources/sql.azure.upbound.io/MSSQLDatabase/v1beta1
- Upbound Marketplace - MSSQLFirewallRule resource: https://marketplace.upbound.io/providers/upbound/provider-azure-sql/v1.8.0/resources/sql.azure.upbound.io/MSSQLFirewallRule/v1beta1
- Upbound Marketplace - MSSQLVirtualNetworkRule resource: https://marketplace.upbound.io/providers/upbound/provider-azure-sql/v1.8.0/resources/sql.azure.upbound.io/MSSQLVirtualNetworkRule/v1beta1
- Upbound Marketplace - ResourceGroup (provider-family-azure): https://marketplace.upbound.io/providers/upbound/provider-family-azure/v1.2.0/resources/azure.upbound.io/ResourceGroup/v1beta1
- Upbound Marketplace - provider-azure-azure sub-provider page
- Upbound Provider Families documentation: https://docs.upbound.io/manuals/packages/providers/provider-families/
- Terraform AzureRM provider docs (azurerm_mssql_server, azurerm_mssql_database, azurerm_mssql_firewall_rule, azurerm_mssql_virtual_network_rule)
- Flux CD Kustomization API v1 reference (fluxcd.io)

## Issues Found
1. **Deprecated resource kinds used with modern fields.** The post originally used `kind: Server`, `kind: Database`, `kind: FirewallRule`, and `kind: VirtualNetworkRule`. In the upjet-based Upbound Azure SQL provider, these kinds map to the deprecated `azurerm_sql_*` Terraform resources, which do **not** support fields like `minimumTlsVersion`, `zoneRedundant`, `geoBackupEnabled`, `shortTermRetentionPolicy`, or `longTermRetentionPolicy`. The post used these modern fields, so the manifests would not apply against the deprecated kinds. Renamed kinds to the modern `MSSQLServer`, `MSSQLDatabase`, `MSSQLFirewallRule`, and `MSSQLVirtualNetworkRule` (which map to the recommended `azurerm_mssql_*` resources and support all the fields used).

2. **`MSSQLFirewallRule` references were wrong.** The post used `serverNameRef` + `resourceGroupNameRef`. The modern `azurerm_mssql_firewall_rule` (and therefore the `MSSQLFirewallRule` Crossplane resource) only takes `server_id` (i.e. `serverIdRef`/`serverIdSelector`); the resource group is implied by the server ID. Replaced with a single `serverIdRef`.

3. **`MSSQLVirtualNetworkRule` references were wrong.** Same issue as above — the modern resource only takes `server_id`. Replaced `serverNameRef` + `resourceGroupNameRef` with a single `serverIdRef`. The `subnetId` and `ignoreMissingVnetServiceEndpoint` fields were already correct.

4. **Incorrect sub-provider name in prerequisites.** The post listed `provider-azure-resource` as a required Crossplane sub-provider. The correct name for the sub-provider that owns the `azure.upbound.io` API group (which contains `ResourceGroup`) is `provider-azure-azure`. Updated the prerequisite accordingly.

5. **`kubectl` verification commands referenced the wrong resource plurals.** Once the kinds were updated, `kubectl get servers.sql.azure.upbound.io` / `databases.sql.azure.upbound.io` and `kubectl describe database.sql.azure.upbound.io ...` no longer matched the resources actually created. Updated to `mssqlservers.sql.azure.upbound.io`, `mssqldatabases.sql.azure.upbound.io`, and `mssqldatabase.sql.azure.upbound.io` respectively.

## Review Notes
- The `MSSQLServer` `azureadAdministrator` field is correctly represented as a list of objects with `loginUsername`, `objectId`, and `tenantId` (per the upjet-generated schema), so the YAML shape used in the post is correct.
- The `shortTermRetentionPolicy` and `longTermRetentionPolicy` blocks are correctly represented as single-element arrays — this matches the upjet convention of mapping Terraform single-instance blocks to one-element arrays. The ISO-8601 retention durations (`P1M`, `P6M`, `P5Y`) and `weekOfYear: 1` are valid values for `azurerm_mssql_database`.
- `version: "12.0"` is the only currently supported value for Azure SQL Server in Azure today.
- The admin password generation snippet appends `Aa1!` after the openssl-generated random string to ensure Azure SQL's complexity requirements (uppercase, lowercase, digit, non-alphanumeric) are always met; this is a reasonable approach for a tutorial, though in production a secret manager / external secret store is preferable.
- The Flux Kustomization `apiVersion: kustomize.toolkit.fluxcd.io/v1` is the current stable API.
- Note for future versions: as Crossplane / Upbound Azure providers evolve, double-check that `MSSQLServer` and friends remain at `v1beta1` — they may graduate to `v1beta2` or `v1` in later releases without a breaking schema change, but the apiVersion strings would need updating then.
