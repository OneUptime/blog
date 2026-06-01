# How to Enable and Use Azure Storage Analytics Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Storage Analytics, Metric, Monitoring, Performance, Azure Monitor, Capacity Planning

Description: How to enable Azure Storage Analytics metrics and use them to monitor performance, track usage, and identify issues in your storage accounts.

---

Understanding how your Azure Storage account is performing requires metrics. How many requests per second is it handling? What is the average latency? How much data is stored? Are there failed requests that indicate a problem? Azure Storage provides metrics through two systems: the classic Storage Analytics metrics and the newer Azure Monitor metrics. This guide covers both, with a focus on practical queries and alerting.

## Classic Storage Analytics vs. Azure Monitor Metrics

Like logging, Azure Storage has both a legacy and modern metrics system:

**Storage Analytics Metrics (classic)**: Written to tables within the storage account itself ($MetricsTransactionsBlob, $MetricsCapacityBlob, etc.). Provides per-API-operation granularity but has a 1-minute or 1-hour aggregation period. Retired on January 9, 2024 in favor of Azure Monitor.

**Azure Monitor Metrics**: The modern approach. Metrics are available in Azure Monitor with up to 1-minute granularity, support dimensional filtering, and integrate with Azure Monitor alerts, dashboards, and workbooks.

Use Azure Monitor metrics for new monitoring setups. If you have existing tooling that reads from the $Metrics tables, migrate it to Azure Monitor metrics.

## Enabling Azure Monitor Metrics

Azure Monitor metrics are enabled by default for Azure Resource Manager storage accounts. You do not need to turn them on. As soon as your storage account exists and receives traffic, metrics start flowing to Azure Monitor.

You can view them immediately in the Azure Portal:

1. Navigate to your storage account
2. Click "Metrics" under Monitoring
3. Select a metric (e.g., Transactions, Ingress, E2E Latency)
4. Apply dimensional filters (e.g., API name, response type)

## Key Metrics to Monitor

Here are the metrics that matter most for day-to-day operations:

### Transaction Metrics

```bash
# Query total transactions in the last hour using Azure CLI

az monitor metrics list \
  --resource "/subscriptions/{sub-id}/resourceGroups/myRG/providers/Microsoft.Storage/storageAccounts/mystorageaccount/blobServices/default" \
  --metric "Transactions" \
  --interval PT1M \
  --start-time $(date -u -d "-1 hour" +%Y-%m-%dT%H:%MZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%MZ) \
  --aggregation Total
```

Transaction metrics support these dimensions for filtering:

- **ResponseType**: Success, ServerBusyError, ClientOtherError, etc.
- **ApiName**: GetBlob, PutBlob, ListBlobs, etc.
- **Authentication**: AccountKey, SAS, OAuth, Anonymous
- **GeoType**: Primary or Secondary
- **TransactionType**: User or System

### Latency Metrics

Two latency metrics are available:

- **SuccessE2ELatency**: End-to-end latency including network round-trip time
- **SuccessServerLatency**: Time the server spent processing the request (excludes network)

The difference between the two tells you if latency issues are on the server side or the network side.

```bash
# Query average E2E latency with API name dimension
az monitor metrics list \
  --resource "/subscriptions/{sub-id}/resourceGroups/myRG/providers/Microsoft.Storage/storageAccounts/mystorageaccount/blobServices/default" \
  --metric "SuccessE2ELatency" \
  --interval PT5M \
  --start-time $(date -u -d "-6 hours" +%Y-%m-%dT%H:%MZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%MZ) \
  --aggregation Average \
  --dimension ApiName
```

### Throughput Metrics

- **Ingress**: Total bytes uploaded to the storage account
- **Egress**: Total bytes downloaded from the storage account

```bash
# Query daily ingress and egress
az monitor metrics list \
  --resource "/subscriptions/{sub-id}/resourceGroups/myRG/providers/Microsoft.Storage/storageAccounts/mystorageaccount/blobServices/default" \
  --metric "Ingress" "Egress" \
  --interval PT1H \
  --start-time $(date -u -d "-24 hours" +%Y-%m-%dT%H:%MZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%MZ) \
  --aggregation Total
```

### Capacity Metrics

Capacity metrics are emitted hourly. For Blob Capacity and Blob Count, a background process computes the values and updates them multiple times a day:

- **BlobCapacity**: Total bytes stored in blob storage
- **BlobCount**: Total number of blobs
- **ContainerCount**: Total number of containers

## Migrating from Classic Storage Analytics Metrics

Classic Storage Analytics metrics retired on January 9, 2024. If you still have legacy tooling that depends on classic metrics settings, review the current settings and migrate the tooling to Azure Monitor metrics:

```bash
# Review classic metrics settings for blob service
az storage metrics show \
  --account-name mystorageaccount \
  --services b \
  --interval both
```

Parameters explained:
- `--services b`: Blob service (use `q` for queue, `t` for table, `f` for file)
- `--interval both`: Show both hourly and minute-level classic metrics settings

## Building a Monitoring Dashboard

Azure Monitor dashboards let you visualize multiple metrics in one view. In an Azure Monitor workbook, add metric items for the storage account or blob service resource, then select the metric namespace, metric name, aggregation, split, and time range in the workbook editor. For example, add:

- Transactions with Total aggregation and split by ResponseType
- SuccessE2ELatency with Average aggregation
- Ingress and Egress with Total aggregation

If you need a reusable workbook template, export the workbook from the Azure portal and parameterize the exported `serializedData` value rather than hand-writing a simplified JSON shape.

## Setting Up Alerts

Proactive alerting catches problems before users notice them.

### Alert on High Latency

```bash
# Alert when average E2E latency exceeds 500ms over a 5-minute window
az monitor metrics alert create \
  --name "StorageHighLatency" \
  --resource-group myRG \
  --scopes "/subscriptions/{sub-id}/resourceGroups/myRG/providers/Microsoft.Storage/storageAccounts/mystorageaccount/blobServices/default" \
  --condition "avg SuccessE2ELatency > 500" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --severity 2 \
  --action "/subscriptions/{sub-id}/resourceGroups/myRG/providers/Microsoft.Insights/actionGroups/ops-team" \
  --description "Storage E2E latency is above 500ms"
```

### Alert on Throttling

```bash
# Alert when throttled requests exceed a threshold
az monitor metrics alert create \
  --name "StorageThrottling" \
  --resource-group myRG \
  --scopes "/subscriptions/{sub-id}/resourceGroups/myRG/providers/Microsoft.Storage/storageAccounts/mystorageaccount/blobServices/default" \
  --condition "total Transactions > 100 where ResponseType includes ServerBusyError" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --severity 1 \
  --action "/subscriptions/{sub-id}/resourceGroups/myRG/providers/Microsoft.Insights/actionGroups/ops-team"
```

### Alert on Availability Drop

```bash
# Alert when availability drops below 99.9%
az monitor metrics alert create \
  --name "StorageAvailability" \
  --resource-group myRG \
  --scopes "/subscriptions/{sub-id}/resourceGroups/myRG/providers/Microsoft.Storage/storageAccounts/mystorageaccount/blobServices/default" \
  --condition "avg Availability < 99.9" \
  --window-size 15m \
  --evaluation-frequency 5m \
  --severity 1 \
  --action "/subscriptions/{sub-id}/resourceGroups/myRG/providers/Microsoft.Insights/actionGroups/ops-team"
```

## Querying Metrics Programmatically

For custom dashboards or automated analysis, query metrics using the Azure Monitor REST API or SDKs.

### Python Example

```python
from azure.monitor.query import MetricsQueryClient
from azure.identity import DefaultAzureCredential
from datetime import datetime, timezone, timedelta

credential = DefaultAzureCredential()
metrics_client = MetricsQueryClient(credential)

# Query transactions grouped by API name for the last 6 hours
resource_uri = (
    "/subscriptions/{sub-id}/resourceGroups/myRG/"
    "providers/Microsoft.Storage/storageAccounts/mystorageaccount/"
    "blobServices/default"
)

response = metrics_client.query_resource(
    resource_uri,
    metric_names=["Transactions"],
    timespan=timedelta(hours=6),
    granularity=timedelta(minutes=5),
    aggregations=["Total"],
    filter="ApiName eq 'GetBlob' or ApiName eq 'PutBlob'"
)

# Process the results
for metric in response.metrics:
    print(f"Metric: {metric.name}")
    for ts in metric.timeseries:
        for data_point in ts.data:
            if data_point.total is not None:
                print(f"  {data_point.timestamp}: {data_point.total}")
```

## Capacity Planning with Metrics

Use historical metrics to plan for storage growth:

```python
# Analyze storage growth trends over the past 30 days
import pandas as pd

# Assuming you have exported capacity metrics to a dataframe
# with columns: date, blob_capacity_gb
df = pd.DataFrame({
    "date": pd.date_range("2026-01-17", "2026-02-16"),
    "blob_capacity_gb": [100 + i for i in range(31)]  # Daily capacity values
})

# Calculate daily growth rate
df["daily_growth_gb"] = df["blob_capacity_gb"].diff()
avg_daily_growth = df["daily_growth_gb"].mean()

# Project 90 days into the future
current_capacity = df["blob_capacity_gb"].iloc[-1]
projected_90_days = current_capacity + (avg_daily_growth * 90)

print(f"Current capacity: {current_capacity:.1f} GB")
print(f"Average daily growth: {avg_daily_growth:.2f} GB")
print(f"Projected in 90 days: {projected_90_days:.1f} GB")
```

## Practical Tips

**Start with the default metrics.** Azure Monitor metrics are on by default and free. There is no reason not to set up basic alerts on availability, latency, and error rates from day one.

**Use dimensional filtering.** The power of Azure Monitor metrics is in the dimensions. Instead of looking at total transactions, filter by ResponseType to see error rates, or by ApiName to identify which operations are slow.

**Export metrics for long-term analysis.** Azure Monitor retains metrics for 93 days. If you need longer retention, export metrics to a Log Analytics workspace or a storage account using diagnostic settings.

**Correlate metrics with logs.** When a metric alert fires, switch to diagnostic logs for the detailed investigation. Metrics tell you there is a problem; logs tell you what specifically is going wrong.

**Watch for anomalies, not just thresholds.** A sudden 10x increase in transactions might be normal during a scheduled batch job, or it might indicate a misconfigured client in a tight retry loop. Context matters, so build dashboards that show trends alongside absolute values.

Azure Storage metrics are the eyes into your storage account's health. Set up the basics now - a few alerts on latency and error rates take 10 minutes and pay for themselves the first time they catch an issue before your users do.
