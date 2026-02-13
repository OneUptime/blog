# How to Configure the Azure Data Explorer Exporter in the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Exporters, Azure, Azure Data Explorer, ADX, Kusto, Observability

Description: Learn how to configure the Azure Data Explorer exporter in the OpenTelemetry Collector for high-performance analytics and long-term telemetry data storage.

Azure Data Explorer (ADX), also known as Kusto, is a fast and highly scalable data analytics service optimized for time-series data and log analytics. The OpenTelemetry Collector's Azure Data Explorer exporter enables you to send traces, metrics, and logs to ADX for advanced analytics, long-term retention, and custom data exploration.

## Understanding the Azure Data Explorer Exporter

Azure Data Explorer excels at handling massive volumes of telemetry data with sub-second query response times. The ADX exporter ingests OpenTelemetry data into ADX tables, where you can perform sophisticated analytics using Kusto Query Language (KQL). This makes it ideal for scenarios requiring complex queries, long-term data retention, or integration with machine learning pipelines.

The exporter supports batching, compression, and automatic schema management, making it suitable for high-throughput production environments.

## Architecture Overview

Here's how the Azure Data Explorer exporter fits into your observability pipeline:

```mermaid
graph LR
    A[Applications] -->|OTLP| B[OpenTelemetry Collector]
    B -->|Receivers| C[Processors]
    C -->|Transform| D[ADX Exporter]
    D -->|Batch Ingest| E[Azure Data Explorer]
    E -->|Analytics| F[KQL Queries]
    E -->|ML| G[Time Series Analysis]
    E -->|Dashboard| H[Azure Dashboards]
    E -->|Export| I[Power BI]
```

## Prerequisites

Before configuring the Azure Data Explorer exporter, you need:

- An Azure subscription
- An Azure Data Explorer cluster and database
- Service principal credentials with ingestion permissions
- OpenTelemetry Collector Contrib installed (version 0.80.0 or later)

## Setting Up Azure Data Explorer

Create an ADX cluster and database:

```bash
# Create ADX cluster (this takes several minutes)
az kusto cluster create \
  --name myadxcluster \
  --resource-group my-resource-group \
  --location eastus \
  --sku name="Standard_D11_v2" tier="Standard"

# Create a database
az kusto database create \
  --cluster-name myadxcluster \
  --database-name telemetry \
  --resource-group my-resource-group \
  --read-write-database soft-delete-period=P365D hot-cache-period=P31D
```

Create a service principal for authentication:

```bash
# Create service principal
az ad sp create-for-rbac \
  --name otel-collector-sp \
  --role Contributor \
  --scopes /subscriptions/{subscription-id}/resourceGroups/my-resource-group/providers/Microsoft.Kusto/Clusters/myadxcluster

# Output will include:
# - appId (client ID)
# - password (client secret)
# - tenant (tenant ID)
```

Grant ingestion permissions:

```kql
// Connect to your ADX database and run:
.add database telemetry ingestors ('aadapp=<client-id>;<tenant-id>') 'OpenTelemetry Collector'
```

## Creating Tables for Telemetry Data

Create tables in ADX for storing traces, metrics, and logs:

```kql
// Create traces table
.create table Traces (
    TraceId: string,
    SpanId: string,
    ParentSpanId: string,
    Name: string,
    Kind: string,
    StartTime: datetime,
    EndTime: datetime,
    Duration: long,
    StatusCode: string,
    StatusMessage: string,
    ServiceName: string,
    ServiceNamespace: string,
    Attributes: dynamic,
    Resource: dynamic,
    Events: dynamic,
    Links: dynamic
)

// Create metrics table
.create table Metrics (
    Timestamp: datetime,
    MetricName: string,
    MetricType: string,
    Value: real,
    ServiceName: string,
    Attributes: dynamic,
    Resource: dynamic
)

// Create logs table
.create table Logs (
    Timestamp: datetime,
    SeverityText: string,
    SeverityNumber: int,
    Body: string,
    ServiceName: string,
    TraceId: string,
    SpanId: string,
    Attributes: dynamic,
    Resource: dynamic
)

// Enable streaming ingestion for low latency
.alter table Traces policy streamingingestion enable
.alter table Metrics policy streamingingestion enable
.alter table Logs policy streamingingestion enable
```

## Basic Configuration

Here's a minimal configuration for the Azure Data Explorer exporter:

```yaml
# OpenTelemetry Collector configuration for Azure Data Explorer
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    # Batch data for efficient ingestion
    timeout: 10s
    send_batch_size: 1024

exporters:
  azuredataexplorer:
    # ADX cluster ingestion endpoint
    cluster_uri: "https://ingest-myadxcluster.eastus.kusto.windows.net"

    # Database name
    database: "telemetry"

    # Authentication using service principal
    tenant_id: "${AZURE_TENANT_ID}"
    client_id: "${AZURE_CLIENT_ID}"
    client_secret: "${AZURE_CLIENT_SECRET}"

    # Table mappings for each signal type
    traces_table: "Traces"
    metrics_table: "Metrics"
    logs_table: "Logs"

    # Ingestion type (streaming or queued)
    ingestion_type: "streaming"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [azuredataexplorer]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [azuredataexplorer]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [azuredataexplorer]
```

This configuration sets up three pipelines that ingest OpenTelemetry data into corresponding ADX tables.

## Advanced Configuration Options

For production deployments, customize additional parameters:

```yaml
exporters:
  azuredataexplorer:
    cluster_uri: "https://ingest-myadxcluster.eastus.kusto.windows.net"
    database: "telemetry"

    # Authentication
    tenant_id: "${AZURE_TENANT_ID}"
    client_id: "${AZURE_CLIENT_ID}"
    client_secret: "${AZURE_CLIENT_SECRET}"

    # Alternative: Use managed identity
    # use_managed_identity: true

    # Table names
    traces_table: "Traces"
    metrics_table: "Metrics"
    logs_table: "Logs"

    # Ingestion configuration
    ingestion_type: "streaming"  # Options: streaming, queued

    # Batch size for ingestion (in MB)
    max_batch_size_mb: 10

    # Maximum time to wait before flushing
    flush_interval: 30s

    # Queue settings for handling bursts
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 10000

    # Retry configuration
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s

    # Timeout for ingestion operations
    timeout: 60s

    # Compression (gzip, none)
    compression: "gzip"

    # Custom mapping names (optional)
    traces_mapping: "OtelTracesMapping"
    metrics_mapping: "OtelMetricsMapping"
    logs_mapping: "OtelLogsMapping"
```

## Ingestion Mappings

Create ingestion mappings to transform OpenTelemetry data into your table schema:

```kql
// Create mapping for traces
.create table Traces ingestion json mapping 'OtelTracesMapping'
```
[
    {"column": "TraceId", "path": "$.traceId", "datatype": "string"},
    {"column": "SpanId", "path": "$.spanId", "datatype": "string"},
    {"column": "ParentSpanId", "path": "$.parentSpanId", "datatype": "string"},
    {"column": "Name", "path": "$.name", "datatype": "string"},
    {"column": "Kind", "path": "$.kind", "datatype": "string"},
    {"column": "StartTime", "path": "$.startTime", "datatype": "datetime"},
    {"column": "EndTime", "path": "$.endTime", "datatype": "datetime"},
    {"column": "Duration", "path": "$.duration", "datatype": "long"},
    {"column": "StatusCode", "path": "$.status.code", "datatype": "string"},
    {"column": "StatusMessage", "path": "$.status.message", "datatype": "string"},
    {"column": "ServiceName", "path": "$.resource['service.name']", "datatype": "string"},
    {"column": "ServiceNamespace", "path": "$.resource['service.namespace']", "datatype": "string"},
    {"column": "Attributes", "path": "$.attributes", "datatype": "dynamic"},
    {"column": "Resource", "path": "$.resource", "datatype": "dynamic"},
    {"column": "Events", "path": "$.events", "datatype": "dynamic"},
    {"column": "Links", "path": "$.links", "datatype": "dynamic"}
]
```

// Create mapping for metrics
.create table Metrics ingestion json mapping 'OtelMetricsMapping'
```
[
    {"column": "Timestamp", "path": "$.timestamp", "datatype": "datetime"},
    {"column": "MetricName", "path": "$.name", "datatype": "string"},
    {"column": "MetricType", "path": "$.type", "datatype": "string"},
    {"column": "Value", "path": "$.value", "datatype": "real"},
    {"column": "ServiceName", "path": "$.resource['service.name']", "datatype": "string"},
    {"column": "Attributes", "path": "$.attributes", "datatype": "dynamic"},
    {"column": "Resource", "path": "$.resource", "datatype": "dynamic"}
]
```

// Create mapping for logs
.create table Logs ingestion json mapping 'OtelLogsMapping'
```
[
    {"column": "Timestamp", "path": "$.timestamp", "datatype": "datetime"},
    {"column": "SeverityText", "path": "$.severityText", "datatype": "string"},
    {"column": "SeverityNumber", "path": "$.severityNumber", "datatype": "int"},
    {"column": "Body", "path": "$.body", "datatype": "string"},
    {"column": "ServiceName", "path": "$.resource['service.name']", "datatype": "string"},
    {"column": "TraceId", "path": "$.traceId", "datatype": "string"},
    {"column": "SpanId", "path": "$.spanId", "datatype": "string"},
    {"column": "Attributes", "path": "$.attributes", "datatype": "dynamic"},
    {"column": "Resource", "path": "$.resource", "datatype": "dynamic"}
]
```
```

Update your collector configuration to use these mappings:

```yaml
exporters:
  azuredataexplorer:
    cluster_uri: "https://ingest-myadxcluster.eastus.kusto.windows.net"
    database: "telemetry"
    tenant_id: "${AZURE_TENANT_ID}"
    client_id: "${AZURE_CLIENT_ID}"
    client_secret: "${AZURE_CLIENT_SECRET}"

    traces_table: "Traces"
    traces_mapping: "OtelTracesMapping"

    metrics_table: "Metrics"
    metrics_mapping: "OtelMetricsMapping"

    logs_table: "Logs"
    logs_mapping: "OtelLogsMapping"
```

## Streaming vs. Queued Ingestion

Choose the right ingestion type for your use case:

**Streaming Ingestion:**
- Low latency (seconds)
- Suitable for real-time monitoring
- Higher cost per operation
- Requires enabling streaming on tables

```yaml
exporters:
  azuredataexplorer:
    ingestion_type: "streaming"
```

**Queued Ingestion:**
- Higher latency (minutes)
- Cost-effective for large volumes
- Better for batch processing
- Default ingestion method

```yaml
exporters:
  azuredataexplorer:
    ingestion_type: "queued"
```

For most production scenarios, streaming ingestion is recommended for operational monitoring.

## Data Partitioning and Retention

Configure partitioning and retention policies to optimize query performance and manage costs:

```kql
// Set data retention policy (365 days)
.alter-merge table Traces policy retention softdelete = 365d

// Set caching policy (hot data for 31 days)
.alter table Traces policy caching hot = 31d

// Create partitioning policy by date
.alter table Traces policy partitioning
```
{
  "PartitionKeys": [
    {
      "ColumnName": "StartTime",
      "Kind": "UniformRange",
      "Properties": {
        "Reference": "2026-01-01T00:00:00",
        "RangeSize": "1.00:00:00",
        "OverrideCreationTime": false
      }
    }
  ]
}
```

// Set update policy to automatically aggregate data
.alter table TraceSummary policy update
@'[{"IsEnabled": true, "Source": "Traces", "Query": "Traces | summarize Count=count(), AvgDuration=avg(Duration) by bin(StartTime, 5m), ServiceName", "IsTransactional": false, "PropagateIngestionProperties": false}]'
```

## Querying Telemetry Data in ADX

Use Kusto Query Language to analyze your telemetry:

```kql
// Query traces by service and operation
Traces
| where StartTime > ago(1h)
| where ServiceName == "payment-service"
| summarize
    RequestCount = count(),
    AvgDuration = avg(Duration) / 1000000,  // Convert to milliseconds
    P95Duration = percentile(Duration, 95) / 1000000,
    ErrorCount = countif(StatusCode == "ERROR")
  by Name
| order by RequestCount desc

// Analyze distributed traces
Traces
| where TraceId == "abc123..."
| order by StartTime asc
| project StartTime, Name, Duration, ServiceName, Attributes

// Query metrics with aggregation
Metrics
| where Timestamp > ago(1h)
| where MetricName == "http.server.duration"
| summarize avg(Value), percentile(Value, 50), percentile(Value, 95), percentile(Value, 99)
  by bin(Timestamp, 5m), ServiceName
| render timechart

// Query logs with severity filtering
Logs
| where Timestamp > ago(1h)
| where SeverityNumber >= 17  // Error and above
| where ServiceName == "payment-service"
| order by Timestamp desc
| take 100

// Join traces and logs for correlation
Traces
| where StartTime > ago(1h)
| where StatusCode == "ERROR"
| join kind=inner (
    Logs
    | where Timestamp > ago(1h)
  ) on TraceId, SpanId
| project StartTime, Name, ServiceName, Body, Attributes
```

## Performance Optimization

Optimize ADX performance with these strategies:

**1. Use Materialized Views for Common Queries:**

```kql
.create materialized-view with (backfill=true) ServiceMetrics on table Traces
{
    Traces
    | summarize
        RequestCount = count(),
        AvgDuration = avg(Duration),
        ErrorCount = countif(StatusCode == "ERROR")
      by bin(StartTime, 5m), ServiceName
}
```

**2. Create Indexes on Frequently Queried Columns:**

```kql
// Create string index for faster text searches
.create table Traces column-index ServiceNameIndex on (ServiceName)
```

**3. Use Extent Tags for Efficient Data Filtering:**

```kql
.alter-merge table Traces policy extent_tags_retention
```
{
  "TagPrefix": "drop-by:",
  "RetentionPeriod": "00:00:00"
}
```
```

**4. Optimize Batch Sizes:**

```yaml
processors:
  batch:
    # Larger batches reduce ingestion overhead
    timeout: 30s
    send_batch_size: 4096
```

## Multi-Database Configuration

For large deployments, separate data by environment or tenant:

```yaml
exporters:
  # Production environment
  azuredataexplorer/prod:
    cluster_uri: "https://ingest-prod.eastus.kusto.windows.net"
    database: "telemetry_prod"
    tenant_id: "${AZURE_TENANT_ID}"
    client_id: "${AZURE_CLIENT_ID}"
    client_secret: "${AZURE_CLIENT_SECRET}"
    traces_table: "Traces"
    metrics_table: "Metrics"
    logs_table: "Logs"

  # Staging environment
  azuredataexplorer/staging:
    cluster_uri: "https://ingest-staging.eastus.kusto.windows.net"
    database: "telemetry_staging"
    tenant_id: "${AZURE_TENANT_ID}"
    client_id: "${AZURE_CLIENT_ID}"
    client_secret: "${AZURE_CLIENT_SECRET}"
    traces_table: "Traces"
    metrics_table: "Metrics"
    logs_table: "Logs"

processors:
  # Route by environment attribute
  routing:
    from_attribute: "deployment.environment"
    table:
      - value: "production"
        exporters: [azuredataexplorer/prod]
      - value: "staging"
        exporters: [azuredataexplorer/staging]

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [routing, batch]
      exporters: [azuredataexplorer/prod, azuredataexplorer/staging]
```

## Security Best Practices

Secure your ADX ingestion pipeline:

**1. Use Azure Key Vault for Credentials:**

```bash
# Store client secret in Key Vault
az keyvault secret set \
  --vault-name my-keyvault \
  --name adx-client-secret \
  --value "your-client-secret"

# Grant collector access
az keyvault set-policy \
  --name my-keyvault \
  --object-id <collector-managed-identity-id> \
  --secret-permissions get
```

**2. Use Managed Identity When Possible:**

```yaml
exporters:
  azuredataexplorer:
    cluster_uri: "https://ingest-myadxcluster.eastus.kusto.windows.net"
    database: "telemetry"
    use_managed_identity: true  # No need for client secrets
```

**3. Enable Private Endpoints:**

Configure private endpoints to keep traffic within your virtual network.

**4. Implement Row Level Security:**

```kql
.create function with (folder="Security") FilterByService(userId:string)
{
    Traces
    | where ServiceName in (GetAllowedServices(userId))
}

.alter table Traces policy restricted_view_access true
```

## Cost Management

ADX pricing is based on compute and storage. Optimize costs:

**1. Use Auto-Scale:**

```bash
az kusto cluster update \
  --name myadxcluster \
  --resource-group my-resource-group \
  --enable-auto-stop true \
  --auto-stop-idle-minutes 30
```

**2. Implement Data Sampling:**

```yaml
processors:
  probabilistic_sampler:
    sampling_percentage: 10  # Sample 10% of traces
```

**3. Configure Retention Policies:**

```kql
// Keep hot data for 7 days, total retention 90 days
.alter-merge table Traces policy retention softdelete = 90d
.alter table Traces policy caching hot = 7d
```

**4. Use Queued Ingestion for Non-Critical Data:**

```yaml
exporters:
  azuredataexplorer:
    ingestion_type: "queued"  # Lower cost than streaming
```

## Complete Production Example

Here's a comprehensive configuration for production use:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  # Add resource attributes
  resource:
    attributes:
      - key: service.name
        value: "${SERVICE_NAME}"
        action: upsert
      - key: deployment.environment
        value: "${ENVIRONMENT}"
        action: upsert

  # Filter health checks
  filter/healthcheck:
    traces:
      span:
        - 'attributes["http.target"] == "/health"'

  # Tail sampling for intelligent retention
  tail_sampling:
    decision_wait: 10s
    num_traces: 100000
    expected_new_traces_per_sec: 1000
    policies:
      - name: error-traces
        type: status_code
        status_code:
          status_codes: [ERROR]
      - name: slow-traces
        type: latency
        latency:
          threshold_ms: 1000
      - name: sampled-traces
        type: probabilistic
        probabilistic:
          sampling_percentage: 5

  # Batch for efficiency
  batch:
    timeout: 30s
    send_batch_size: 4096

exporters:
  azuredataexplorer:
    cluster_uri: "${ADX_CLUSTER_URI}"
    database: "${ADX_DATABASE}"
    tenant_id: "${AZURE_TENANT_ID}"
    client_id: "${AZURE_CLIENT_ID}"
    client_secret: "${AZURE_CLIENT_SECRET}"

    traces_table: "Traces"
    traces_mapping: "OtelTracesMapping"
    metrics_table: "Metrics"
    metrics_mapping: "OtelMetricsMapping"
    logs_table: "Logs"
    logs_mapping: "OtelLogsMapping"

    ingestion_type: "streaming"
    max_batch_size_mb: 10
    flush_interval: 30s
    compression: "gzip"

    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 10000

    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s

    timeout: 60s

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resource, filter/healthcheck, tail_sampling, batch]
      exporters: [azuredataexplorer]

    metrics:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [azuredataexplorer]

    logs:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [azuredataexplorer]

  telemetry:
    logs:
      level: info
    metrics:
      address: 0.0.0.0:8888
```

## Troubleshooting Common Issues

**Issue: Ingestion failures with authentication errors**

Solutions:
- Verify service principal has ingestion permissions
- Check that client secret hasn't expired
- Ensure tenant ID and client ID are correct

**Issue: Slow query performance**

Optimize by:
- Creating appropriate indexes on frequently queried columns
- Using materialized views for common aggregations
- Implementing partitioning policies
- Adjusting cache policy for hot data

**Issue: High ingestion latency**

Solutions:
- Switch to streaming ingestion
- Increase batch size to reduce overhead
- Check network connectivity to ADX
- Verify cluster isn't throttling

## Conclusion

The Azure Data Explorer exporter provides a powerful solution for storing and analyzing OpenTelemetry data at scale. With its high-performance query engine and flexible data management capabilities, ADX is ideal for organizations requiring advanced analytics and long-term telemetry retention.

For more information on OpenTelemetry exporters, check out these related articles:
- https://oneuptime.com/blog/post/2026-02-06-azure-monitor-exporter-opentelemetry-collector/view
- https://oneuptime.com/blog/post/2026-02-06-google-cloud-operations-exporter-opentelemetry-collector/view

For detailed information about the Azure Data Explorer exporter configuration options, refer to the official OpenTelemetry Collector documentation.
