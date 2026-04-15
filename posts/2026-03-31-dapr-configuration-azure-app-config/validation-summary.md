# Validation Summary: How to Use Dapr Configuration with Azure App Configuration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Configuration API
- Azure App Configuration
- Azure CLI (`az appconfig`)
- Kubernetes secrets
- Dapr .NET SDK (`Dapr.Client`)
- Azure Managed Identity / Microsoft Entra ID
- Azure RBAC

## Sources Consulted
- Dapr Azure App Configuration store reference: https://docs.dapr.io/reference/components-reference/supported-configuration-stores/azure-appconfig-configuration-store/
- Dapr Configuration API reference: https://docs.dapr.io/reference/api/configuration_api/
- Dapr .NET SDK documentation: https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-client/
- Azure CLI `az appconfig` reference: https://learn.microsoft.com/en-us/cli/azure/appconfig?view=azure-cli-latest
- Azure CLI `az appconfig kv` reference: https://learn.microsoft.com/en-us/cli/azure/appconfig/kv?view=azure-cli-latest
- Azure CLI `az appconfig credential` reference: https://learn.microsoft.com/en-us/cli/azure/appconfig/credential?view=azure-cli-latest
- Azure App Configuration RBAC: https://learn.microsoft.com/en-us/azure/azure-app-configuration/concept-enable-rbac

## Issues Found
1. **Configuration API endpoint used `v1.0-alpha1` instead of `v1.0`**: The Dapr Configuration API GET endpoint is now stable at `v1.0/configuration/{storename}`. The post used `v1.0-alpha1` which is outdated. Fixed the curl example to use `v1.0`.

2. **Managed Identity metadata field used `endpoint` instead of `host`**: The Dapr Azure App Configuration component uses `host` as the metadata field name for the endpoint URL (mutually exclusive with `connectionString`). The post incorrectly used `endpoint`. Fixed to `host`.

3. **"Azure Active Directory" terminology is outdated**: Azure AD was rebranded to Microsoft Entra ID in 2023. Updated three occurrences to use the current name "Microsoft Entra ID".

## Review Notes
- All Azure CLI commands (`az appconfig create`, `az appconfig credential list`, `az appconfig kv set`, `az role assignment create`) were verified as correct with proper flags and syntax.
- The Dapr component YAML uses correct field names (`connectionString`, `maxRetries`, `retryDelay`, `subscribePollInterval`) with values matching the documented defaults.
- The .NET SDK code using `GetConfiguration` with `config.Items["key"].Value` is correct for the `GetConfigurationResponse` return type.
- The `App Configuration Data Reader` is the correct Azure built-in role name for read-only access to App Configuration data.
- The `subscribePollInterval` default in Dapr is actually `24h`, not `30s` as configured in the post — but `30s` is a valid custom value and the post doesn't claim it's the default, so this is not an error.
