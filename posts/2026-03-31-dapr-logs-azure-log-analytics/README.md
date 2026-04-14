# How to Send Dapr Logs to Azure Log Analytics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure, Log Analytics, Logging, AKS

Description: Learn how to send Dapr sidecar and application logs to Azure Log Analytics using the Azure Monitor Agent or Container Insights on AKS clusters.

---

## Overview

Azure Log Analytics is the logging and analytics backbone of Azure Monitor. For Dapr applications running on Azure Kubernetes Service (AKS), you can forward Dapr logs to Log Analytics using Container Insights or the Azure Monitor Agent, enabling KQL-based querying and alerting.

## Enabling Container Insights on AKS

Enable Container Insights for your AKS cluster to automatically collect container logs:

```bash
# Enable Container Insights on an existing AKS cluster
az aks enable-addons \
  --resource-group my-resource-group \
  --name my-aks-cluster \
  --addons monitoring \
  --workspace-resource-id /subscriptions/{sub-id}/resourceGroups/my-rg/providers/Microsoft.OperationalInsights/workspaces/my-workspace
```

## Enabling Dapr JSON Logging

Add Dapr JSON logging annotations to your deployments:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: invoice-service
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "invoice-service"
        dapr.io/app-port: "8080"
        dapr.io/log-as-json: "true"
        dapr.io/log-level: "info"
```

## Querying Dapr Logs with KQL

Once Container Insights is enabled and Dapr JSON logging is active, query logs in Log Analytics:

```kql
// All Dapr sidecar logs from the last hour
ContainerLog
| where TimeGenerated > ago(1h)
| where ContainerName == "daprd"
| extend ParsedLog = parse_json(LogEntry)
| project TimeGenerated, AppId = ParsedLog.app_id, Level = ParsedLog.level, Message = ParsedLog.msg

// Error count by Dapr service
ContainerLog
| where ContainerName == "daprd"
| extend ParsedLog = parse_json(LogEntry)
| where ParsedLog.level == "error"
| summarize ErrorCount = count() by AppId = tostring(ParsedLog.app_id), bin(TimeGenerated, 5m)
| order by TimeGenerated desc

// Circuit breaker events
ContainerLog
| where ContainerName == "daprd"
| extend ParsedLog = parse_json(LogEntry)
| where ParsedLog.msg contains "circuit breaker"
| project TimeGenerated, AppId = ParsedLog.app_id, Message = ParsedLog.msg
```

## Configuring a Log Analytics Workspace

Create a Log Analytics workspace via Azure CLI:

```bash
az monitor log-analytics workspace create \
  --resource-group my-resource-group \
  --workspace-name dapr-logs-workspace \
  --location eastus \
  --sku PerGB2018 \
  --retention-time 30
```

Retrieve the workspace ID for Dapr configuration:

```bash
az monitor log-analytics workspace show \
  --resource-group my-resource-group \
  --workspace-name dapr-logs-workspace \
  --query customerId \
  --output tsv
```

## Sending Custom Log Fields via Dapr

Enrich your application logs with fields that are useful for Log Analytics queries:

```javascript
const logger = {
  info: (msg, extra = {}) => {
    console.log(JSON.stringify({
      level: 'info',
      msg,
      timestamp: new Date().toISOString(),
      ...extra
    }));
  }
};

// Log with correlation fields
logger.info('Order processed', {
  orderId: order.id,
  customerId: order.customerId,
  processingTimeMs: elapsed,
  daprAppId: process.env.APP_ID
});
```

## Creating Azure Monitor Alerts

Set up an alert rule in Azure Monitor for Dapr error spikes:

```bash
az monitor scheduled-query create \
  --resource-group my-resource-group \
  --name "DaprHighErrorRate" \
  --scopes /subscriptions/{sub-id}/resourceGroups/my-rg/providers/Microsoft.OperationalInsights/workspaces/dapr-logs-workspace \
  --condition "count 'DaprErrors' > 50" \
  --condition-query DaprErrors="ContainerLog | where ContainerName == 'daprd' | extend L = parse_json(LogEntry) | where L.level == 'error'" \
  --evaluation-frequency 5m \
  --window-size 5m \
  --severity 2 \
  --action-groups /subscriptions/{sub-id}/resourceGroups/my-rg/providers/microsoft.insights/actionGroups/dapr-alerts
```

## Summary

Sending Dapr logs to Azure Log Analytics via Container Insights gives AKS users a native, low-configuration path to centralized log management. Enable Container Insights on your cluster, configure Dapr JSON logging, and use KQL to build powerful queries, dashboards, and alerts that correlate Dapr service health with broader Azure infrastructure metrics.
