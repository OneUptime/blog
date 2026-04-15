# Validation Summary: How to Enable Dapr Sidecar on Azure Container Apps

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Container Apps
- Dapr (Distributed Application Runtime)
- Azure CLI (`az containerapp` commands)
- Dapr HTTP API (service invocation, state management)
- Python (`requests` library)
- gRPC protocol configuration

## Sources Consulted
- Microsoft Azure CLI reference for `az containerapp create`: https://learn.microsoft.com/en-us/cli/azure/containerapp?view=azure-cli-latest
- Microsoft Azure CLI reference for `az containerapp dapr`: https://learn.microsoft.com/en-us/cli/azure/containerapp/dapr?view=azure-cli-latest
- Microsoft "Configure Dapr" guide for Azure Container Apps: https://learn.microsoft.com/en-us/azure/container-apps/enable-dapr
- Dapr service invocation API docs: https://docs.dapr.io/developing-applications/building-blocks/service-invocation/howto-invoke-discover-services/
- Dapr state management API reference: https://docs.dapr.io/reference/api/state_api/

## Issues Found

### Issue 1: Wrong command for enabling Dapr API logging (Step 4)
- **What was wrong:** The post used `az containerapp update` to configure Dapr logging settings (`--dapr-enable-api-logging` and `--dapr-log-level`). The official documentation recommends using `az containerapp dapr enable` for configuring Dapr settings on an existing container app, not `az containerapp update`.
- **What was changed:** Replaced `az containerapp update` with `az containerapp dapr enable`.
- **Why:** The `az containerapp dapr enable` command is the documented way to configure Dapr settings (including logging) on existing container apps.

### Issue 2: Boolean flag passed with explicit value (Step 4)
- **What was wrong:** The post used `--dapr-enable-api-logging true`, passing an explicit `true` value. This flag is a boolean flag that does not take a value — its presence on the command line enables the feature.
- **What was changed:** Removed the `true` argument, changing to just `--dapr-enable-api-logging`.
- **Why:** Passing `true` as a value to a boolean flag may cause it to be interpreted as a positional argument or produce an error.

## Review Notes
- The Azure CLI version prerequisite of "v2.50+" is reasonable but not officially documented. Microsoft's guidance is to ensure the latest `containerapp` extension is installed (`az extension add --name containerapp --upgrade`). The version cited is not incorrect but could be more precise.
- The `az containerapp show` JSON output may include additional fields (e.g., `httpMaxRequestSize`, `httpReadBufferSize`, `maxConcurrency`) depending on configuration, but all fields shown in the blog are correctly named.
- The Dapr HTTP API paths and default port 3500 are correct and match official Dapr documentation.
