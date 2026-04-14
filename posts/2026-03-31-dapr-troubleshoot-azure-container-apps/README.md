# How to Troubleshoot Dapr Issues on Azure Container Apps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure Container Apps, Troubleshooting, Debug, Logging

Description: Diagnose and fix common Dapr issues on Azure Container Apps including sidecar failures, component errors, and service invocation problems using logs and diagnostics.

---

## Overview

Troubleshooting Dapr on Azure Container Apps requires checking sidecar logs, component configuration, network connectivity, and identity permissions. This guide covers the most common failure scenarios and how to resolve them.

## Common Issues and Causes

| Issue | Common Cause |
|-------|-------------|
| Sidecar not starting | Missing app port or wrong protocol |
| Component load failure | Invalid secret reference or wrong scope |
| Service invocation 404 | App ID mismatch or internal ingress not set |
| State store errors | Cosmos DB RBAC or firewall blocking |
| Secret store errors | Key Vault access policy missing |

## Step 1: Check Sidecar Logs

```bash
# Stream Dapr sidecar logs
az containerapp logs show \
  --name orders-service \
  --resource-group rg-dapr \
  --container daprd \
  --follow

# Recent logs
az containerapp logs show \
  --name orders-service \
  --resource-group rg-dapr \
  --container daprd \
  --tail 200
```

## Step 2: Enable Debug Logging

```bash
az containerapp update \
  --name orders-service \
  --resource-group rg-dapr \
  --dapr-log-level debug \
  --dapr-enable-api-logging true
```

## Step 3: Diagnose Component Failures

Query Log Analytics for component errors:

```bash
az monitor log-analytics query \
  --workspace $WORKSPACE_ID \
  --analytics-query "
    ContainerAppConsoleLogs_CL
    | where ContainerName_s == 'daprd'
    | where Log_s contains 'component' and Log_s contains 'error'
    | project TimeGenerated, Log_s
    | order by TimeGenerated desc
    | limit 20
  " --output table
```

Common component fixes:

```bash
# Verify Key Vault access
az keyvault secret show \
  --vault-name dapr-keyvault \
  --name my-secret

# Check Managed Identity assignment
az containerapp identity show \
  --name orders-service \
  --resource-group rg-dapr
```

## Step 4: Debug Service Invocation

```bash
# Check that target app has internal ingress and Dapr enabled
az containerapp show \
  --name inventory-service \
  --resource-group rg-dapr \
  --query 'properties.configuration.{ingress:ingress.external,dapr:dapr}' \
  --output json

# Verify app IDs match
az containerapp list \
  --resource-group rg-dapr \
  --query '[].{name:name,appId:properties.configuration.dapr.appId}' \
  --output table
```

## Step 5: Test Dapr Sidecar Health

Exec into the app container and test the sidecar:

```bash
az containerapp exec \
  --name orders-service \
  --resource-group rg-dapr \
  --command "curl http://localhost:3500/v1.0/healthz"
```

```bash
# Check metadata
az containerapp exec \
  --name orders-service \
  --resource-group rg-dapr \
  --command "curl http://localhost:3500/v1.0/metadata"
```

## Step 6: Restart the Container App

```bash
# Force restart to reload components
az containerapp revision restart \
  --name orders-service \
  --resource-group rg-dapr \
  --revision $(az containerapp revision list \
    --name orders-service \
    --resource-group rg-dapr \
    --query '[0].name' -o tsv)
```

## Summary

Troubleshooting Dapr on Azure Container Apps starts with sidecar logs - enable debug logging and check for component load errors, authentication failures, and service resolution issues. Most problems fall into three categories: wrong Dapr configuration, missing permissions on Azure resources, or network/ingress misconfiguration. The `dapr-enable-api-logging` flag is invaluable for tracing exactly which requests are being processed by the sidecar.
