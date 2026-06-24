# How to Send Dapr Logs to Azure Monitor

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure Monitor, Logging, Kubernetes, Observability

Description: Configure Azure Monitor Container Insights or OMS Agent to collect and analyze Dapr sidecar logs from AKS clusters.

---

Azure Monitor provides centralized log management for AKS workloads. This guide shows how to forward Dapr sidecar logs to Azure Monitor Log Analytics using Container Insights and how to query them with KQL.

## Option 1 - Container Insights (Recommended for AKS)

Azure Monitor Container Insights automatically collects container logs from all pods including Dapr sidecars.

### Enable Container Insights on AKS

```bash
az aks enable-addons \
  --resource-group myResourceGroup \
  --name myAKSCluster \
  --addons monitoring \
  --workspace-resource-id /subscriptions/<sub>/resourceGroups/myRG/providers/Microsoft.OperationalInsights/workspaces/myWorkspace
```

### Verify Collection

```bash
# Check the Azure Monitor Agent pods are running
kubectl get pods -n kube-system | grep ama-logs
```

Container Insights collects all container stdout logs by default, which includes the Dapr sidecar (`daprd`).

## Step 2 - Enable JSON Logging in Dapr

Enable JSON format so Azure Monitor can parse structured fields:

```yaml
metadata:
  annotations:
    dapr.io/log-as-json: "true"
    dapr.io/log-level: "info"
```

## Step 3 - Query Dapr Logs in Log Analytics

Navigate to your Log Analytics workspace in the Azure portal and use KQL:

```kusto
// All Dapr sidecar logs from the last hour
ContainerLogV2
| where ContainerName == "daprd"
| where TimeGenerated > ago(1h)
| project TimeGenerated, PodName, LogMessage
| order by TimeGenerated desc
```

```kusto
// Parse JSON log entries for structured fields
ContainerLogV2
| where ContainerName == "daprd"
| extend ParsedLog = parse_json(LogMessage)
| project TimeGenerated, PodName,
    LogLevel = ParsedLog.level,
    Message = ParsedLog.msg,
    AppId = ParsedLog.app_id
| where LogLevel == "error"
| order by TimeGenerated desc
```

```kusto
// Error rate by Dapr app over time
ContainerLogV2
| where ContainerName == "daprd"
| extend ParsedLog = parse_json(LogMessage)
| where ParsedLog.level == "error"
| summarize ErrorCount = count() by
    bin(TimeGenerated, 5m),
    AppId = tostring(ParsedLog.app_id)
| render timechart
```

## Step 4 - Create Log-Based Alerts

Create an alert rule in Azure Monitor for Dapr errors:

```bash
az monitor scheduled-query create \
  --resource-group myResourceGroup \
  --name "DaprSidecarErrors" \
  --scopes /subscriptions/<sub>/resourceGroups/myRG/providers/Microsoft.OperationalInsights/workspaces/myWorkspace \
  --condition-query Placeholder_1="ContainerLogV2 | where ContainerName == 'daprd' | extend L = parse_json(LogMessage) | where L.level == 'error'" \
  --condition "count 'Placeholder_1' > 10" \
  --evaluation-frequency 5m \
  --window-size 10m \
  --severity 2 \
  --action-groups /subscriptions/<sub>/resourceGroups/myRG/providers/microsoft.insights/actionGroups/myActionGroup
```

## Option 2 - Azure Monitor Agent with Custom DCR

For more control, use a Data Collection Rule to filter which container logs are collected:

```json
{
  "properties": {
    "dataFlows": [
      {
        "streams": ["Microsoft-ContainerLogV2"],
        "destinations": ["logAnalytics"],
        "transformKql": "source | where ContainerName == 'daprd'"
      }
    ]
  }
}
```

This filters to collect only Dapr sidecar logs, reducing ingestion costs.

## Summary

Azure Monitor Container Insights provides zero-configuration log collection for Dapr sidecars on AKS. Enable JSON logging in Dapr to unlock structured KQL queries that filter by log level, app ID, and message. Create alert rules using scheduled query alerts to notify on error spikes, and use Data Collection Rules to reduce ingestion costs by filtering to only sidecar logs.
