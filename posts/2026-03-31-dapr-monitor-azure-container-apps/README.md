# How to Monitor Dapr Applications on Azure Container Apps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure Container Apps, Monitoring, Azure Monitor, Observability

Description: Monitor Dapr applications on Azure Container Apps using Azure Monitor, Log Analytics, and distributed tracing with Application Insights integration.

---

## Overview

Azure Container Apps integrates Dapr telemetry with Azure Monitor and Application Insights. You can query Dapr sidecar logs, trace service invocations, and alert on error rates using native Azure tooling.

## Step 1: Enable Log Analytics

```bash
LOG_WS=$(az monitor log-analytics workspace create \
  --resource-group rg-dapr \
  --workspace-name dapr-logs \
  --query customerId -o tsv)

LOG_KEY=$(az monitor log-analytics workspace get-shared-keys \
  --resource-group rg-dapr \
  --workspace-name dapr-logs \
  --query primarySharedKey -o tsv)

az containerapp env create \
  --name aca-env \
  --resource-group rg-dapr \
  --logs-workspace-id $LOG_WS \
  --logs-workspace-key $LOG_KEY
```

## Step 2: View Dapr Sidecar Logs

```bash
az containerapp logs show \
  --name orders-service \
  --resource-group rg-dapr \
  --container daprd \
  --tail 100
```

Query from Log Analytics:

```bash
az monitor log-analytics query \
  --workspace $LOG_WS \
  --analytics-query "
    ContainerAppConsoleLogs_CL
    | where ContainerName_s == 'daprd'
    | where Log_s contains 'error'
    | project TimeGenerated, ContainerAppName_s, Log_s
    | order by TimeGenerated desc
    | limit 50
  " \
  --output table
```

## Step 3: Enable Application Insights Tracing

Create an Application Insights resource and configure the Container Apps environment:

```bash
APPINSIGHTS_CONN=$(az monitor app-insights component create \
  --app dapr-insights \
  --resource-group rg-dapr \
  --location eastus \
  --query connectionString -o tsv)

az containerapp env update \
  --name aca-env \
  --resource-group rg-dapr \
  --dapr-connection-string $APPINSIGHTS_CONN
```

Or include it when creating the environment:

```bash
az containerapp env create \
  --name aca-env \
  --resource-group rg-dapr \
  --logs-workspace-id $LOG_WS \
  --logs-workspace-key $LOG_KEY \
  --dapr-connection-string $APPINSIGHTS_CONN
```

## Step 4: Monitor Service Invocation Metrics

```bash
az monitor log-analytics query \
  --workspace $LOG_WS \
  --analytics-query "
    ContainerAppConsoleLogs_CL
    | where Log_s contains 'invoke'
    | parse Log_s with * 'method=' method ' status=' status *
    | summarize count() by method, status, bin(TimeGenerated, 5m)
    | render timechart
  "
```

## Step 5: Set Up Alerts

```bash
az monitor metrics alert create \
  --name dapr-error-alert \
  --resource-group rg-dapr \
  --scopes /subscriptions/<sub>/resourceGroups/rg-dapr/providers/Microsoft.App/containerApps/orders-service \
  --condition "count Requests >= 10 where statusCodeCategory includes 5xx" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action /subscriptions/<sub>/resourceGroups/rg-dapr/providers/microsoft.insights/actionGroups/ops-team
```

## Step 6: Dapr Dashboard on ACA

Access the Container Apps dashboard in Azure Portal:
1. Navigate to your Container App
2. Select "Monitoring" - "Log stream" for live Dapr logs
3. Select "Metrics" to chart request counts and latency

## Summary

Monitoring Dapr on Azure Container Apps uses native Azure Monitor tooling, including Log Analytics queries for sidecar logs and Application Insights for distributed tracing. Log Analytics workspace integration is configured at the environment level, capturing logs from all apps and their Dapr sidecars. Alerting on HTTP error counts and latency metrics ensures proactive incident detection.
