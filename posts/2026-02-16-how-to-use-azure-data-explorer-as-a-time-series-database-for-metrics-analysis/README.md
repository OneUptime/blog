# How to Use Azure Data Explorer as a Time Series Database for Metrics Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Data Explorer, Time Series, Metrics, KQL, Kusto, Monitoring, Data Analytics

Description: Use Azure Data Explorer as a time series database for ingesting, storing, and analyzing high-volume metrics data with Kusto Query Language.

---

When you are dealing with millions of metric data points per second - server CPU readings, application response times, IoT sensor values - you need a database purpose-built for time series data. Azure Data Explorer (ADX), also known as Kusto, is exactly that. It is optimized for high-throughput ingestion and fast analytical queries over time-stamped data.

ADX is not a general-purpose database. It excels at append-heavy workloads where data arrives continuously and queries scan large time ranges to find patterns, anomalies, and trends. Its column-oriented storage, aggressive compression, and purpose-built query language (KQL) make it ideal for metrics analysis at scale.

## Why ADX for Metrics

Compared to other time series databases, ADX offers:

- **Massive ingestion throughput**: Millions of events per second
- **Fast queries**: Sub-second responses on billions of rows
- **Built-in time series functions**: Moving averages, anomaly detection, forecasting
- **Long retention**: Store years of data cost-effectively with tiered storage
- **Native integration**: Works with Azure Monitor, Grafana, and Power BI

## Prerequisites

- An Azure subscription
- An Azure Data Explorer cluster (Dev/Test SKU for learning, production SKUs for real workloads)
- The Kusto.Explorer desktop tool or the ADX web UI for querying
- Python 3.9+ for programmatic ingestion

## Step 1: Create an ADX Cluster and Database

```bash
# Create an Azure Data Explorer cluster
az kusto cluster create \
    --name adx-metrics-cluster \
    --resource-group rg-monitoring \
    --location eastus \
    --sku name="Dev(No SLA)_Standard_E2a_v4" tier="Basic" capacity=1

# Create a database for metrics
az kusto database create \
    --cluster-name adx-metrics-cluster \
    --database-name MetricsDB \
    --resource-group rg-monitoring \
    --soft-delete-period P365D \
    --hot-cache-period P31D
```

The `soft-delete-period` defines how long data is retained. The `hot-cache-period` defines how long data stays in the fast SSD cache (queries on cached data are significantly faster).

## Step 2: Create Tables for Metrics Data

Connect to your ADX database using the web UI (https://dataexplorer.azure.com) or Kusto.Explorer and create tables:

```kql
// Create a table for server metrics
// Using the .create command in KQL
.create table ServerMetrics (
    Timestamp: datetime,
    ServerName: string,
    MetricName: string,
    MetricValue: real,
    Region: string,
    Environment: string,
    Tags: dynamic
)

// Create a table for application metrics
.create table AppMetrics (
    Timestamp: datetime,
    ServiceName: string,
    Endpoint: string,
    ResponseTimeMs: real,
    StatusCode: int,
    IsError: bool,
    RequestId: string
)

// Configure streaming ingestion for near-real-time data
.alter table ServerMetrics policy streamingingestion enable

// Configure the ingestion batching policy for higher throughput
.alter table ServerMetrics policy ingestionbatching
```
```
@'{"MaximumBatchingTimeSpan":"00:00:30", "MaximumNumberOfItems": 10000, "MaximumRawDataSizeMB": 100}'
```

## Step 3: Ingest Metrics Data

ADX supports multiple ingestion methods. For metrics, the most common are streaming ingestion (for real-time) and queued ingestion (for batch).

```python
# ingest_metrics.py - Ingest metrics data into Azure Data Explorer
from azure.kusto.data import KustoClient, KustoConnectionStringBuilder
from azure.kusto.ingest import (
    QueuedIngestClient,
    IngestionProperties,
    DataFormat,
    ReportLevel
)
import json
from datetime import datetime, timedelta
import random

# Build the connection string using Azure AD authentication
cluster_url = "https://adx-metrics-cluster.eastus.kusto.windows.net"
database = "MetricsDB"

# Using managed identity or Azure CLI credentials
kcsb = KustoConnectionStringBuilder.with_az_cli_authentication(cluster_url)
ingest_kcsb = KustoConnectionStringBuilder.with_az_cli_authentication(
    "https://ingest-adx-metrics-cluster.eastus.kusto.windows.net"
)

# Create the ingestion client
ingest_client = QueuedIngestClient(ingest_kcsb)

# Configure ingestion properties
ingestion_props = IngestionProperties(
    database=database,
    table="ServerMetrics",
    data_format=DataFormat.JSON,
    report_level=ReportLevel.FailuresAndSuccesses
)

# Generate sample metrics data
def generate_metrics(num_points: int) -> list:
    """Generate sample server metrics for ingestion."""
    servers = ["prod-web-01", "prod-web-02", "prod-api-01", "prod-db-01"]
    metrics = ["cpu_percent", "memory_percent", "disk_io_read", "disk_io_write", "network_in"]
    regions = ["eastus", "westus2", "westeurope"]

    data = []
    base_time = datetime.utcnow()

    for i in range(num_points):
        timestamp = base_time - timedelta(seconds=i * 10)
        server = random.choice(servers)
        metric = random.choice(metrics)

        data.append({
            "Timestamp": timestamp.isoformat(),
            "ServerName": server,
            "MetricName": metric,
            "MetricValue": round(random.uniform(10, 95), 2),
            "Region": random.choice(regions),
            "Environment": "production",
            "Tags": {"cluster": "primary", "tier": "web"}
        })

    return data

# Ingest the data
metrics_data = generate_metrics(10000)
json_data = "\n".join(json.dumps(m) for m in metrics_data)

# Write to a temporary file and ingest
import tempfile
with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
    f.write(json_data)
    temp_path = f.name

ingest_client.ingest_from_file(temp_path, ingestion_properties=ingestion_props)
print(f"Ingested {len(metrics_data)} metric points")
```

## Step 4: Query Metrics with KQL

KQL (Kusto Query Language) is where ADX really shines for metrics analysis. Here are common query patterns:

```kql
// Basic time range query: Get CPU metrics for the last hour
ServerMetrics
| where Timestamp > ago(1h)
| where MetricName == "cpu_percent"
| project Timestamp, ServerName, MetricValue
| order by Timestamp desc

// Aggregation: Average CPU by server in 5-minute bins
ServerMetrics
| where Timestamp > ago(6h)
| where MetricName == "cpu_percent"
| summarize AvgCPU = avg(MetricValue),
            MaxCPU = max(MetricValue),
            P95CPU = percentile(MetricValue, 95)
    by ServerName, bin(Timestamp, 5m)
| order by Timestamp asc

// Time series chart: Plot CPU trend with a moving average
ServerMetrics
| where Timestamp > ago(24h)
| where MetricName == "cpu_percent"
| where ServerName == "prod-web-01"
| make-series AvgCPU = avg(MetricValue)
    on Timestamp
    from ago(24h) to now()
    step 5m
| extend MovingAvg = series_fir(AvgCPU, repeat(1, 12), true, true)
| render timechart

// Anomaly detection: Find unusual CPU spikes
ServerMetrics
| where Timestamp > ago(7d)
| where MetricName == "cpu_percent"
| make-series AvgCPU = avg(MetricValue)
    on Timestamp
    from ago(7d) to now()
    step 1h
    by ServerName
| extend (anomalies, score, baseline) = series_decompose_anomalies(AvgCPU, 1.5)
| mv-expand Timestamp, AvgCPU, anomalies, score, baseline
| where anomalies == 1
| project Timestamp, ServerName, AvgCPU, score
| order by score desc
```

## Step 5: Create Materialized Views for Fast Dashboards

For frequently accessed aggregations, create materialized views that pre-compute results:

```kql
// Create a materialized view that maintains hourly aggregates
// This dramatically speeds up dashboard queries
.create materialized-view ServerMetricsHourly on table ServerMetrics
{
    ServerMetrics
    | summarize
        AvgValue = avg(MetricValue),
        MaxValue = max(MetricValue),
        MinValue = min(MetricValue),
        P95Value = percentile(MetricValue, 95),
        SampleCount = count()
        by ServerName, MetricName, Region, bin(Timestamp, 1h)
}

// Query the materialized view for fast dashboard rendering
ServerMetricsHourly
| where Timestamp > ago(30d)
| where MetricName == "cpu_percent"
| project Timestamp, ServerName, AvgValue, P95Value
| render timechart
```

## Step 6: Set Up Alerts with KQL Queries

Use ADX queries as the basis for alerting. You can connect ADX to Azure Monitor or run alert queries directly:

```kql
// Alert query: Find servers with sustained high CPU (>90% for 10+ minutes)
ServerMetrics
| where Timestamp > ago(15m)
| where MetricName == "cpu_percent"
| summarize AvgCPU = avg(MetricValue), Samples = count()
    by ServerName
| where AvgCPU > 90 and Samples > 5
| project ServerName, AvgCPU, Samples

// Alert query: Detect response time degradation
// Compare last 15 minutes against the 24-hour baseline
let baseline = AppMetrics
    | where Timestamp between (ago(24h) .. ago(1h))
    | summarize BaselineP95 = percentile(ResponseTimeMs, 95) by ServiceName;
let current = AppMetrics
    | where Timestamp > ago(15m)
    | summarize CurrentP95 = percentile(ResponseTimeMs, 95) by ServiceName;
baseline
| join current on ServiceName
| extend DegradationFactor = CurrentP95 / BaselineP95
| where DegradationFactor > 2.0
| project ServiceName, BaselineP95, CurrentP95, DegradationFactor
```

## Step 7: Connect to Grafana

ADX integrates natively with Grafana, making it easy to build real-time dashboards:

1. Install the Azure Data Explorer Grafana plugin
2. Configure a data source pointing to your ADX cluster
3. Use KQL in your Grafana panels

```kql
// Example Grafana panel query with template variables
ServerMetrics
| where Timestamp > $__timeFrom and Timestamp < $__timeTo
| where ServerName == "$server"
| where MetricName == "$metric"
| summarize Value = avg(MetricValue) by bin(Timestamp, $__interval)
| order by Timestamp asc
```

## Data Retention and Cost Management

ADX has tiered storage to manage costs for long-term metric retention:

```kql
// Configure hot cache (SSD) for 30 days, retain for 2 years
.alter database MetricsDB policy caching hot = 30d

// Configure retention for 730 days (2 years)
.alter table ServerMetrics policy retention softdelete = 730d recoverability = disabled

// Check current data size
.show table ServerMetrics extents
| summarize TotalSize = sum(ExtentSize), CompressedSize = sum(CompressedSize),
            RowCount = sum(RowCount)
```

## Summary

Azure Data Explorer is built for exactly the kind of high-volume, time-stamped data that metrics generate. Its combination of fast ingestion, columnar storage, and the powerful KQL query language makes it ideal for monitoring, observability, and operational analytics. The built-in time series functions (anomaly detection, forecasting, moving averages) save you from building those capabilities yourself. Start with streaming ingestion for real-time metrics, use materialized views for dashboard performance, and leverage tiered storage for cost-effective long-term retention.
