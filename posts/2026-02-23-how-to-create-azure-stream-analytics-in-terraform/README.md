# How to Create Azure Stream Analytics in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Stream Analytics, Real-Time Analytics, Infrastructure as Code, IoT

Description: A practical guide to provisioning Azure Stream Analytics jobs with Terraform, including inputs, outputs, transformation queries, and streaming unit configuration.

---

Azure Stream Analytics is a real-time analytics and event processing engine that can analyze and process high volumes of streaming data from multiple sources simultaneously. It uses a SQL-like query language to filter, aggregate, and join streaming data, making it accessible to anyone who knows SQL rather than requiring specialized stream processing skills.

Common use cases include IoT telemetry processing, real-time dashboards, fraud detection, log analytics, and clickstream analysis. If you need to process data as it arrives rather than in batches, Stream Analytics is a solid choice. And provisioning it through Terraform means your streaming pipelines are reproducible and version-controlled.

## How Stream Analytics Works

A Stream Analytics job has three main components:

- **Inputs** - data sources like Event Hubs, IoT Hub, or Blob Storage
- **Query** - a SQL-like transformation that processes the input data
- **Outputs** - destinations like SQL Database, Blob Storage, Power BI, Cosmos DB, or Event Hubs

The service runs your query continuously against the incoming data stream and writes results to the configured outputs.

## Prerequisites

- Terraform 1.3+
- Azure subscription with Contributor access
- Azure CLI authenticated

## Provider Configuration

```hcl
terraform {
  required_version = ">= 1.3.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
  }
}

provider "azurerm" {
  features {}
}
```

## Creating a Stream Analytics Job

```hcl
resource "azurerm_resource_group" "streaming" {
  name     = "rg-streaming-prod"
  location = "eastus"

  tags = {
    Environment = "Production"
    ManagedBy   = "Terraform"
  }
}

# Create a Stream Analytics job
resource "azurerm_stream_analytics_job" "main" {
  name                                     = "asa-telemetry-prod-001"
  location                                 = azurerm_resource_group.streaming.location
  resource_group_name                      = azurerm_resource_group.streaming.name
  compatibility_level                      = "1.2"
  data_locale                              = "en-US"
  events_late_arrival_max_delay_in_seconds = 60
  events_out_of_order_max_delay_in_seconds = 50
  events_out_of_order_policy               = "Adjust"
  output_error_policy                      = "Drop"

  # Streaming units (1, 3, 6, 12, 18, 24, 30, 36, 42, 48)
  # Each SU provides roughly 1 MB/s of throughput
  streaming_units = 6

  # Transformation query
  transformation_query = <<QUERY
    SELECT
        IoTHub.ConnectionDeviceId AS DeviceId,
        AVG(temperature) AS AvgTemperature,
        MAX(temperature) AS MaxTemperature,
        MIN(temperature) AS MinTemperature,
        COUNT(*) AS EventCount,
        System.Timestamp() AS WindowEnd
    INTO [sql-output]
    FROM [eventhub-input]
    TIMESTAMP BY EventEnqueuedUtcTime
    GROUP BY
        IoTHub.ConnectionDeviceId,
        TumblingWindow(minute, 5)
  QUERY

  # Managed identity for secure access to inputs/outputs
  identity {
    type = "SystemAssigned"
  }

  tags = {
    Environment = "Production"
    Pipeline    = "IoTTelemetry"
  }
}
```

## Setting Up Event Hub Input

```hcl
# Event Hub namespace and hub for streaming input
resource "azurerm_eventhub_namespace" "telemetry" {
  name                = "evhns-telemetry-prod-001"
  location            = azurerm_resource_group.streaming.location
  resource_group_name = azurerm_resource_group.streaming.name
  sku                 = "Standard"
  capacity            = 2

  tags = {
    Environment = "Production"
  }
}

resource "azurerm_eventhub" "telemetry" {
  name                = "evh-device-telemetry"
  namespace_name      = azurerm_eventhub_namespace.telemetry.name
  resource_group_name = azurerm_resource_group.streaming.name
  partition_count     = 4
  message_retention   = 7
}

# Consumer group for Stream Analytics
resource "azurerm_eventhub_consumer_group" "stream_analytics" {
  name                = "stream-analytics-cg"
  namespace_name      = azurerm_eventhub_namespace.telemetry.name
  eventhub_name       = azurerm_eventhub.telemetry.name
  resource_group_name = azurerm_resource_group.streaming.name
}

# Shared access policy for Stream Analytics to read from Event Hub
resource "azurerm_eventhub_authorization_rule" "stream_analytics" {
  name                = "stream-analytics-reader"
  namespace_name      = azurerm_eventhub_namespace.telemetry.name
  eventhub_name       = azurerm_eventhub.telemetry.name
  resource_group_name = azurerm_resource_group.streaming.name
  listen              = true
  send                = false
  manage              = false
}

# Configure Event Hub as input for Stream Analytics
resource "azurerm_stream_analytics_stream_input_eventhub" "telemetry" {
  name                         = "eventhub-input"
  stream_analytics_job_name    = azurerm_stream_analytics_job.main.name
  resource_group_name          = azurerm_resource_group.streaming.name
  eventhub_consumer_group_name = azurerm_eventhub_consumer_group.stream_analytics.name
  eventhub_name                = azurerm_eventhub.telemetry.name
  servicebus_namespace         = azurerm_eventhub_namespace.telemetry.name
  shared_access_policy_key     = azurerm_eventhub_authorization_rule.stream_analytics.primary_key
  shared_access_policy_name    = azurerm_eventhub_authorization_rule.stream_analytics.name

  serialization {
    type     = "Json"
    encoding = "UTF8"
  }
}
```

## Setting Up Blob Storage Input (Reference Data)

Reference data lets you enrich streaming data with slowly-changing lookup data:

```hcl
# Storage account for reference data
resource "azurerm_storage_account" "reference" {
  name                     = "strefprod001"
  resource_group_name      = azurerm_resource_group.streaming.name
  location                 = azurerm_resource_group.streaming.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "azurerm_storage_container" "reference" {
  name                  = "reference-data"
  storage_account_name  = azurerm_storage_account.reference.name
  container_access_type = "private"
}

# Reference data input from Blob Storage
resource "azurerm_stream_analytics_reference_input_blob" "device_lookup" {
  name                      = "device-lookup"
  stream_analytics_job_name = azurerm_stream_analytics_job.main.name
  resource_group_name       = azurerm_resource_group.streaming.name
  storage_account_name      = azurerm_storage_account.reference.name
  storage_account_key       = azurerm_storage_account.reference.primary_access_key
  storage_container_name    = azurerm_storage_container.reference.name

  # Path pattern for reference data files
  path_pattern = "devices/{date}/{time}/devices.json"
  date_format  = "yyyy-MM-dd"
  time_format  = "HH-mm"

  serialization {
    type     = "Json"
    encoding = "UTF8"
  }
}
```

## Configuring Outputs

### SQL Database Output

```hcl
# SQL Server and Database for output
resource "azurerm_mssql_server" "analytics" {
  name                         = "sql-analytics-prod-001"
  resource_group_name          = azurerm_resource_group.streaming.name
  location                     = azurerm_resource_group.streaming.location
  version                      = "12.0"
  administrator_login          = "sqladmin"
  administrator_login_password = var.sql_admin_password
}

resource "azurerm_mssql_database" "telemetry" {
  name      = "db-telemetry"
  server_id = azurerm_mssql_server.analytics.id
  sku_name  = "S1"
}

# SQL Database output
resource "azurerm_stream_analytics_output_mssql" "sql" {
  name                      = "sql-output"
  stream_analytics_job_name = azurerm_stream_analytics_job.main.name
  resource_group_name       = azurerm_resource_group.streaming.name
  server                    = azurerm_mssql_server.analytics.fully_qualified_domain_name
  user                      = "sqladmin"
  password                  = var.sql_admin_password
  database                  = azurerm_mssql_database.telemetry.name
  table                     = "DeviceTelemetryAggregates"
}

variable "sql_admin_password" {
  type      = string
  sensitive = true
}
```

### Blob Storage Output

```hcl
# Storage account for output archival
resource "azurerm_storage_account" "output" {
  name                     = "stoutprod001"
  resource_group_name      = azurerm_resource_group.streaming.name
  location                 = azurerm_resource_group.streaming.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "azurerm_storage_container" "output" {
  name                  = "telemetry-output"
  storage_account_name  = azurerm_storage_account.output.name
  container_access_type = "private"
}

# Blob Storage output for archival
resource "azurerm_stream_analytics_output_blob" "archive" {
  name                      = "blob-archive"
  stream_analytics_job_name = azurerm_stream_analytics_job.main.name
  resource_group_name       = azurerm_resource_group.streaming.name
  storage_account_name      = azurerm_storage_account.output.name
  storage_account_key       = azurerm_storage_account.output.primary_access_key
  storage_container_name    = azurerm_storage_container.output.name

  # Partition output files by date
  path_pattern = "telemetry/{date}/{time}"
  date_format  = "yyyy-MM-dd"
  time_format  = "HH"

  serialization {
    type     = "Parquet"
  }
}
```

### Event Hub Output

```hcl
# Event Hub for forwarding processed events
resource "azurerm_eventhub" "alerts" {
  name                = "evh-device-alerts"
  namespace_name      = azurerm_eventhub_namespace.telemetry.name
  resource_group_name = azurerm_resource_group.streaming.name
  partition_count     = 2
  message_retention   = 1
}

resource "azurerm_eventhub_authorization_rule" "alerts_sender" {
  name                = "asa-alerts-sender"
  namespace_name      = azurerm_eventhub_namespace.telemetry.name
  eventhub_name       = azurerm_eventhub.alerts.name
  resource_group_name = azurerm_resource_group.streaming.name
  listen              = false
  send                = true
  manage              = false
}

# Event Hub output for alerts
resource "azurerm_stream_analytics_output_eventhub" "alerts" {
  name                      = "alerts-output"
  stream_analytics_job_name = azurerm_stream_analytics_job.main.name
  resource_group_name       = azurerm_resource_group.streaming.name
  eventhub_name             = azurerm_eventhub.alerts.name
  servicebus_namespace      = azurerm_eventhub_namespace.telemetry.name
  shared_access_policy_key  = azurerm_eventhub_authorization_rule.alerts_sender.primary_key
  shared_access_policy_name = azurerm_eventhub_authorization_rule.alerts_sender.name

  serialization {
    type     = "Json"
    encoding = "UTF8"
    format   = "LineSeparated"
  }
}
```

## A More Complex Query with Reference Data Join

Here is a more realistic job that joins streaming data with reference data and produces multiple outputs:

```hcl
resource "azurerm_stream_analytics_job" "advanced" {
  name                                     = "asa-advanced-prod-001"
  location                                 = azurerm_resource_group.streaming.location
  resource_group_name                      = azurerm_resource_group.streaming.name
  compatibility_level                      = "1.2"
  streaming_units                          = 12
  events_late_arrival_max_delay_in_seconds = 60
  events_out_of_order_max_delay_in_seconds = 50
  events_out_of_order_policy               = "Adjust"
  output_error_policy                      = "Drop"

  transformation_query = <<QUERY
    -- Aggregate telemetry and enrich with device metadata
    SELECT
        t.DeviceId,
        d.DeviceName,
        d.Location,
        AVG(t.temperature) AS AvgTemp,
        MAX(t.temperature) AS MaxTemp,
        COUNT(*) AS ReadingCount,
        System.Timestamp() AS WindowEnd
    INTO [sql-output]
    FROM [eventhub-input] t
    TIMESTAMP BY t.EventEnqueuedUtcTime
    JOIN [device-lookup] d ON t.DeviceId = d.DeviceId
    GROUP BY
        t.DeviceId, d.DeviceName, d.Location,
        TumblingWindow(minute, 5)

    -- Detect temperature spikes and send alerts
    SELECT
        t.DeviceId,
        d.DeviceName,
        t.temperature AS CurrentTemp,
        'HighTemperature' AS AlertType,
        System.Timestamp() AS AlertTime
    INTO [alerts-output]
    FROM [eventhub-input] t
    TIMESTAMP BY t.EventEnqueuedUtcTime
    JOIN [device-lookup] d ON t.DeviceId = d.DeviceId
    WHERE t.temperature > d.MaxThreshold
  QUERY

  identity {
    type = "SystemAssigned"
  }

  tags = {
    Environment = "Production"
    Pipeline    = "AdvancedTelemetry"
  }
}
```

## Best Practices

**Right-size streaming units.** Start with 6 SUs and monitor the SU% utilization metric. If utilization consistently exceeds 80%, increase streaming units. Over-provisioning wastes money; under-provisioning causes backpressure and delays.

**Use partitioned queries when possible.** If your input is partitioned (like Event Hubs) and your query groups by the partition key, Stream Analytics can parallelize processing across partitions for better throughput.

**Handle late-arriving events.** Set appropriate late arrival and out-of-order tolerances. Too strict and you lose data; too lenient and your windows stay open longer than needed.

**Output to Parquet for archival.** When writing to Blob Storage for long-term storage, use Parquet format. It is compressed, columnar, and works well with downstream analytics tools like Databricks and Synapse.

**Test queries with sample data.** Before deploying, test your transformation query with sample data in the Azure portal. This catches syntax errors and logic issues before they affect production.

**Monitor job health.** Set up alerts on watermark delay, input/output events, and runtime errors. A healthy job should have low watermark delay and zero runtime errors.

## Conclusion

Azure Stream Analytics with Terraform provides a straightforward way to build real-time data processing pipelines as code. From simple aggregations to complex multi-output jobs with reference data joins, everything can be defined declaratively. The key is getting your streaming units, window functions, and late arrival policies right for your specific workload, and Terraform makes it easy to iterate on those settings.
