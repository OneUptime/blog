# Validation Summary: How to Troubleshoot Dapr Issues on Azure Container Apps

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Dapr (sidecar architecture, health API, metadata API)
- Azure Container Apps (revisions, logging, exec, identity)
- Azure CLI (`az containerapp`, `az monitor log-analytics`, `az keyvault`)
- Azure Log Analytics (KQL queries, ContainerAppConsoleLogs_CL table)
- Azure Key Vault (secret store integration)
- Azure Managed Identity

## Sources Consulted
- [az containerapp logs show - Azure CLI Reference](https://learn.microsoft.com/en-us/cli/azure/containerapp/logs?view=azure-cli-latest)
- [View log streams in Azure Container Apps](https://learn.microsoft.com/en-us/azure/container-apps/log-streaming)
- [az containerapp dapr - Azure CLI Reference](https://learn.microsoft.com/en-us/cli/azure/containerapp/dapr?view=azure-cli-latest)
- [Configure Dapr on an existing container app](https://learn.microsoft.com/en-us/azure/container-apps/enable-dapr)
- [Connect to a container console in Azure Container Apps](https://learn.microsoft.com/en-us/azure/container-apps/container-console)
- [az containerapp revision - Azure CLI Reference](https://learn.microsoft.com/en-us/cli/azure/containerapp/revision?view=azure-cli-latest)
- [Manage revisions in Azure Container Apps](https://learn.microsoft.com/en-us/azure/container-apps/revisions-manage)
- [Sidecar health - Dapr Docs](https://docs.dapr.io/operations/resiliency/health-checks/sidecar-health/)
- [Health API reference - Dapr Docs](https://docs.dapr.io/reference/api/health_api/)
- [Metadata API reference - Dapr Docs](https://docs.dapr.io/reference/api/metadata_api/)
- [Monitor logs in Azure Container Apps with Log Analytics](https://learn.microsoft.com/en-us/azure/container-apps/log-monitoring)
- [Log storage and monitoring options in Azure Container Apps](https://learn.microsoft.com/en-us/azure/container-apps/log-options)
- [az monitor log-analytics - Azure CLI Reference](https://learn.microsoft.com/en-us/cli/azure/monitor/log-analytics?view=azure-cli-latest)
- [Azure Container Apps ARM and YAML template specifications](https://learn.microsoft.com/en-us/azure/container-apps/azure-resource-manager-api-spec)

## Issues Found
1. **`--workspace myworkspace` uses a friendly name instead of a workspace GUID** (Step 3, Log Analytics query): The `az monitor log-analytics query --workspace` flag requires a Log Analytics workspace GUID (custom ID), not a friendly display name. Using `myworkspace` would cause the command to fail. Changed to `$WORKSPACE_ID` to indicate a variable placeholder, which is clearer for readers who need to substitute their own workspace ID.

## Review Notes
- The `az containerapp update` command with `--dapr-log-level` and `--dapr-enable-api-logging` flags (Step 2) is functional, but Microsoft's current documentation recommends using the dedicated `az containerapp dapr enable` subcommand for configuring Dapr settings on existing apps. Both approaches work; the blog's usage is not wrong but readers following official docs may expect the `dapr enable` subcommand.
- The `ContainerAppConsoleLogs_CL` table name and `_s` column suffixes (e.g., `ContainerName_s`, `Log_s`) are correct for Log Analytics workspace destinations (the default). If an environment uses Azure Monitor as the log destination instead, the table is `ContainerAppConsoleLogs` without suffixes. The blog doesn't note this distinction, which could confuse readers using non-default log destinations.
- All Dapr API endpoints (`/v1.0/healthz`, `/v1.0/metadata`) and the default port (3500) are correct per current Dapr documentation.
- All JMESPath queries for `az containerapp show` and `az containerapp list` use valid ARM schema paths.
- The `az containerapp exec`, `az containerapp revision restart`, and `az containerapp logs show` commands all use correct syntax and flags.
