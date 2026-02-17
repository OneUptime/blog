# How to Join Reference Data with Streaming Data in Azure Stream Analytics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Stream Analytics, Reference Data, Stream Processing, Data Enrichment, Azure Blob Storage, Azure SQL, Real-Time Analytics

Description: A practical guide to joining reference data from Blob Storage or SQL Database with streaming data in Azure Stream Analytics for real-time enrichment.

---

One of the most common patterns in stream processing is enriching incoming events with additional context. A raw event might contain a device ID, but your downstream analytics need the device location, owner, and model number. A transaction event might have a customer ID, but your fraud detection logic needs the customer's risk profile. This is where reference data joins come in.

Azure Stream Analytics supports joining slowly-changing reference data with fast-moving streaming data. The reference data acts like a lookup table that your streaming query can use to enrich events as they pass through. In this post, we will cover the two supported reference data sources - Azure Blob Storage and Azure SQL Database - and walk through the configuration and query patterns you need to get this working.

## What Is Reference Data in Stream Analytics?

Reference data (sometimes called a lookup table or side input) is a dataset that changes infrequently compared to your streaming input. Examples include:

- Device metadata (location, model, firmware version)
- User profiles or customer segments
- Geographic lookup tables (zip code to city mappings)
- Product catalogs with pricing information
- Configuration tables or business rules

Azure Stream Analytics loads reference data into memory and uses it for join operations against your streaming input. The reference data is periodically refreshed, so changes to the underlying source are picked up without restarting your job.

## Reference Data from Azure Blob Storage

Blob Storage is the most commonly used reference data source. You upload your reference data as a file (CSV or JSON) to a blob container, and Stream Analytics reads it. The key feature here is that you can use a date/time path pattern to version your reference data over time.

### Setting Up the Blob Storage Input

First, prepare your reference data file. Let us say you have device metadata in CSV format:

```csv
DeviceId,Location,Model,Owner
device-001,Building-A-Floor-3,SensorV2,Engineering
device-002,Building-B-Floor-1,SensorV3,Operations
device-003,Building-A-Floor-5,SensorV2,Facilities
```

Upload this to a blob container with a path pattern that includes date components. This allows Stream Analytics to pick up updated versions of the reference data automatically.

The recommended path pattern looks like this:

```
reference-data/devices/{date}/{time}/devices.csv
```

For example:
```
reference-data/devices/2026-02-16/14-00-00/devices.csv
```

Now configure the reference data input in your Stream Analytics job. Here is how to do it with the Azure CLI:

```bash
# Create a reference data input from Blob Storage
# The path pattern uses {date} and {time} tokens for automatic refresh
az stream-analytics input create \
  --resource-group my-resource-group \
  --job-name my-stream-job \
  --name "DeviceReference" \
  --type "Reference" \
  --datasource '{
    "type": "Microsoft.Storage/Blob",
    "properties": {
      "storageAccounts": [{
        "accountName": "mystorageaccount",
        "accountKey": "your-storage-key"
      }],
      "container": "reference-data",
      "pathPattern": "devices/{date}/{time}/devices.csv",
      "dateFormat": "yyyy-MM-dd",
      "timeFormat": "HH-mm-ss"
    }
  }' \
  --serialization '{"type": "Csv", "properties": {"fieldDelimiter": ",", "encoding": "UTF8"}}'
```

### Refresh Behavior

Stream Analytics checks for new reference data snapshots based on the path pattern. When it finds a new file matching the pattern with a more recent date/time, it loads the new snapshot atomically. Your running query switches to the new reference data without any downtime or interruption.

If you need the reference data to refresh every hour, make sure you upload a new snapshot file every hour with the appropriate timestamp in the path.

## Reference Data from Azure SQL Database

For reference data that changes more frequently or that you manage in a relational database, Azure SQL Database is the better option. Stream Analytics can query SQL Database directly and refresh the data on a configurable schedule.

```bash
# Create a reference data input from Azure SQL Database
az stream-analytics input create \
  --resource-group my-resource-group \
  --job-name my-stream-job \
  --name "CustomerReference" \
  --type "Reference" \
  --datasource '{
    "type": "Microsoft.Sql/Server/Database",
    "properties": {
      "server": "myserver.database.windows.net",
      "database": "mydb",
      "user": "sqladmin",
      "password": "your-password",
      "table": "Customers",
      "refreshType": "RefreshPeriodicallyWithFull",
      "refreshRate": "00:05:00"
    }
  }'
```

The `refreshRate` controls how often Stream Analytics queries SQL Database for updated data. You can also use `RefreshPeriodicallyWithDelta` for incremental refreshes, which is more efficient for large reference datasets where only a few rows change between refreshes.

### Delta Refresh Configuration

With delta refresh, you provide a separate query that returns only the rows that changed since the last refresh:

```sql
-- Full query (used on initial load)
SELECT CustomerId, Name, Segment, RiskScore
FROM Customers

-- Delta query (used for periodic refreshes)
-- Only returns rows modified since the last refresh
SELECT CustomerId, Name, Segment, RiskScore
FROM Customers
WHERE LastModified > @lastRefreshTime
```

This significantly reduces the load on your SQL Database when your reference dataset is large but changes are sparse.

## Writing the Join Query

Now that your reference data input is configured, you can join it with your streaming data in the query. Here is a complete example that enriches IoT telemetry events with device metadata:

```sql
-- Join streaming telemetry events with device reference data
-- The reference data provides location and model info for each device
SELECT
    stream.DeviceId,
    ref.Location,
    ref.Model,
    ref.Owner,
    stream.Temperature,
    stream.Humidity,
    stream.EventTime,
    System.Timestamp() AS ProcessedTime
INTO [enriched-output]
FROM [telemetry-stream] stream
-- DATEDIFF specifies the temporal join condition
-- For reference data, this defines the snapshot timing
JOIN [DeviceReference] ref
    ON stream.DeviceId = ref.DeviceId
```

The join between streaming and reference data uses a simple equality condition on the key columns. Unlike stream-to-stream joins, you do not need to specify a temporal window because reference data is treated as a point-in-time snapshot.

## Handling Missing Reference Data

What happens when a streaming event has a key that does not exist in the reference data? By default, the event is dropped from the output because an inner join produces no result for unmatched keys.

If you want to keep events even when reference data is missing, use a LEFT JOIN:

```sql
-- Use LEFT JOIN to keep all streaming events
-- Events without matching reference data will have NULL for reference columns
SELECT
    stream.DeviceId,
    COALESCE(ref.Location, 'Unknown') AS Location,
    COALESCE(ref.Model, 'Unknown') AS Model,
    stream.Temperature,
    stream.Humidity,
    stream.EventTime
INTO [enriched-output]
FROM [telemetry-stream] stream
LEFT JOIN [DeviceReference] ref
    ON stream.DeviceId = ref.DeviceId
```

The `COALESCE` function provides default values for columns that would otherwise be NULL when no reference data match is found.

## Size Limits and Performance

Reference data is loaded entirely into memory for each streaming unit (SU) allocated to your job. This means there are practical limits on how large your reference data can be:

- **Blob Storage reference data**: Up to 5 GB per reference input (or 300 MB for jobs using compatibility level 1.1 or earlier)
- **SQL Database reference data**: Up to 5 GB

If your reference data exceeds these limits, consider filtering it down to only the columns and rows your query actually needs. You can also partition your Stream Analytics job and use partitioned reference data to distribute the memory load.

## Common Patterns and Tips

**Multiple reference data joins**: You can join multiple reference data inputs in a single query. For example, enriching events with both device metadata and customer information.

```sql
-- Join with two different reference data sources
SELECT
    stream.EventId,
    device.Location,
    customer.Segment,
    stream.Value
INTO [output]
FROM [events] stream
JOIN [DeviceRef] device ON stream.DeviceId = device.DeviceId
JOIN [CustomerRef] customer ON stream.CustomerId = customer.CustomerId
```

**Testing with local data**: During development, you can test your query with sample reference data using the "Test query" feature in the Azure portal. Upload a sample file and verify your join logic before deploying.

**Monitoring refresh failures**: If Stream Analytics fails to load reference data (for example, because the blob does not exist or the SQL query fails), it continues using the last successfully loaded snapshot. Monitor the "Input Events" and "Runtime Errors" metrics to catch these issues.

## Summary

Reference data joins are a fundamental building block in stream processing. Azure Stream Analytics makes it straightforward to enrich streaming events with lookup data from Blob Storage or SQL Database, with automatic periodic refresh to keep the reference data current. Choose Blob Storage for simpler scenarios with less frequent updates, and SQL Database when you need tighter refresh intervals or delta-based updates. Use LEFT JOIN when you cannot guarantee every streaming event will have a matching reference entry, and keep an eye on the memory limits to ensure your reference data fits within the allocated streaming units.
