# How to Query Data in Azure Blob Storage Using Azure Blob Storage Query Acceleration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Blob Storage, Query Acceleration, Data Analytics, CSV, JSON, Cloud Storage

Description: Learn how to use Azure Blob Storage Query Acceleration to run SQL-like queries directly on CSV and JSON files without downloading them first.

---

One of the most common patterns in data engineering is storing large CSV or JSON files in Azure Blob Storage and then needing to analyze them. The traditional approach is to download the entire file, parse it locally, and filter out the rows you need. This wastes bandwidth and time, especially when you only need a fraction of the data.

Azure Blob Storage Query Acceleration changes this by letting you run SQL-like queries directly against CSV and JSON blobs. The storage service filters the data server-side and only returns the matching rows, dramatically reducing the amount of data transferred over the network.

## How Query Acceleration Works

When you issue a query against a blob, Azure processes it at the storage layer. The storage service reads the file, applies your SQL filter, and streams back only the matching rows. This means:

- You transfer less data over the network
- Processing is faster because filtering happens close to the data
- You do not need to provision any compute resources

Query Acceleration supports CSV and JSON file formats. It uses a subset of SQL syntax with SELECT, WHERE, and basic expressions. It does not support JOINs, GROUP BY, or aggregations - for those, you need Azure Synapse or Databricks.

## Prerequisites

Before using Query Acceleration, ensure the following:

- Your storage account is a general-purpose v2 or BlobStorage account
- The blobs are in the Hot or Cool access tier (Archive tier blobs must be rehydrated first)
- The blobs are block blobs (not append or page blobs)
- CSV files should have consistent delimiters and optionally a header row
- JSON files should be in JSON Lines format (one JSON object per line)

## Querying CSV Files

Let us start with a practical example. Suppose you have a large CSV file with server access logs stored in blob storage.

The following Python code queries a CSV blob to find all requests that resulted in a 500 error:

```python
from azure.storage.blob import BlobServiceClient

# Initialize the blob service client
connection_string = "DefaultEndpointsProtocol=https;AccountName=stlogs2026;..."
blob_service = BlobServiceClient.from_connection_string(connection_string)

# Get a reference to the blob
blob_client = blob_service.get_blob_client(
    container="access-logs",
    blob="2026-02-server-logs.csv"
)

# Define the SQL query
# This selects timestamp, url, and status_code columns
# where the status code is 500 (server error)
query = """
SELECT _1, _3, _4
FROM BlobStorage
WHERE _4 = '500'
"""

# Configure the input format (CSV without headers)
input_config = {
    "format": {"type": "csv", "has_headers": False, "delimiter": ","}
}

# Configure the output format
output_config = {
    "format": {"type": "csv"}
}

# Execute the query
reader = blob_client.query_blob(
    query,
    blob_format=input_config,
    output_format=output_config
)

# Read the results
result = reader.readall().decode("utf-8")
print(result)
```

In this example, `_1`, `_3`, and `_4` refer to columns by position (1-indexed) because the CSV has no headers. If your CSV has headers, you can reference columns by name.

## Querying CSV Files with Headers

When your CSV has a header row, queries become more readable. Here is an example with a sales dataset:

```python
from azure.storage.blob import BlobServiceClient, DelimitedTextDialect

# Initialize client
blob_service = BlobServiceClient.from_connection_string(connection_string)
blob_client = blob_service.get_blob_client(
    container="sales-data",
    blob="transactions-2026-q1.csv"
)

# Define input format with headers enabled
# DelimitedTextDialect specifies CSV parsing rules
input_format = DelimitedTextDialect(
    delimiter=",",
    quotechar='"',
    lineterminator="\n",
    escapechar="",
    has_header=True
)

# Output format also as CSV
output_format = DelimitedTextDialect(
    delimiter=",",
    quotechar='"',
    lineterminator="\n",
    escapechar="",
    has_header=False
)

# Query for high-value transactions in a specific region
# Column names come from the CSV header row
query = """
SELECT transaction_id, customer_name, amount, region
FROM BlobStorage
WHERE amount > '10000' AND region = 'West'
"""

# Execute and read results
reader = blob_client.query_blob(
    query,
    blob_format=input_format,
    output_format=output_format
)

# Process results line by line
content = reader.readall().decode("utf-8")
for line in content.strip().split("\n"):
    if line:
        fields = line.split(",")
        print(f"Transaction: {fields[0]}, Customer: {fields[1]}, Amount: ${fields[2]}")
```

## Querying JSON Files

Query Acceleration also works with JSON Lines format, where each line is a separate JSON object.

The following example queries a JSON Lines file containing IoT sensor readings:

```python
from azure.storage.blob import BlobServiceClient, DelimitedJsonDialect

# Initialize client
blob_service = BlobServiceClient.from_connection_string(connection_string)
blob_client = blob_service.get_blob_client(
    container="iot-data",
    blob="sensor-readings-2026-02.json"
)

# Input format for JSON Lines
input_format = DelimitedJsonDialect(delimiter="\n")

# Output format also as JSON Lines
output_format = DelimitedJsonDialect(delimiter="\n")

# Query for temperature readings above threshold
# JSON property names are used directly in the query
query = """
SELECT sensor_id, temperature, timestamp
FROM BlobStorage
WHERE temperature > '85.0' AND sensor_type = 'thermocouple'
"""

# Execute the query
reader = blob_client.query_blob(
    query,
    blob_format=input_format,
    output_format=output_format
)

# Parse the JSON results
import json
content = reader.readall().decode("utf-8")
for line in content.strip().split("\n"):
    if line:
        record = json.loads(line)
        print(f"Sensor {record['sensor_id']}: {record['temperature']}F at {record['timestamp']}")
```

## Supported SQL Syntax

Query Acceleration supports a specific subset of SQL. Here is what you can use:

**SELECT clause**:
- Column references by name (with headers) or position (`_1`, `_2`, etc.)
- Wildcard `*` to select all columns
- String functions: `SUBSTRING`, `CHARINDEX`
- Arithmetic expressions on numeric columns

**WHERE clause**:
- Comparison operators: `=`, `!=`, `<`, `>`, `<=`, `>=`
- Logical operators: `AND`, `OR`, `NOT`
- String comparisons (all values are treated as strings)
- `LIKE` with wildcard patterns
- `IN` for matching against a set of values
- `IS NULL` and `IS NOT NULL`

**Unsupported features**:
- JOIN operations
- GROUP BY and aggregations (SUM, COUNT, AVG)
- ORDER BY
- Subqueries
- HAVING

## Performance Comparison

To give you a sense of the performance benefit, here is a comparison for a typical scenario. Suppose you have a 10 GB CSV file with 100 million rows, and your query matches about 1% of rows.

Without Query Acceleration:
- Download: 10 GB of data transferred
- Processing: Parse all 100 million rows locally
- Time: Several minutes depending on bandwidth

With Query Acceleration:
- Download: ~100 MB of data transferred (only matching rows)
- Processing: Only parse 1 million matching rows
- Time: Seconds to tens of seconds

The savings scale linearly with selectivity. The more selective your query, the bigger the benefit.

## Handling Errors in Query Results

Query Acceleration can encounter errors when parsing malformed rows. You can configure error handling to either fail fast or skip bad records.

This example shows how to handle errors gracefully:

```python
from azure.storage.blob import BlobServiceClient, BlobQueryError

blob_client = blob_service.get_blob_client(
    container="raw-data",
    blob="messy-dataset.csv"
)

# Define an error handler function
def on_error(error: BlobQueryError):
    """Log parsing errors instead of failing"""
    print(f"Query error at position {error.position}: {error.description}")

# Execute query with error handling
reader = blob_client.query_blob(
    "SELECT * FROM BlobStorage WHERE _1 != ''",
    on_error=on_error
)

# Results will include all successfully parsed rows
# Errors are reported through the callback
result = reader.readall().decode("utf-8")
```

## Using Query Acceleration with Azure Data Factory

You can also use Query Acceleration in Azure Data Factory pipelines. In a Copy Data activity, configure the source dataset as a delimited text dataset pointing to your blob. Then add a query in the source settings. Data Factory will use Query Acceleration to filter data at the source, reducing the volume of data flowing through the pipeline.

## Cost Considerations

Query Acceleration is billed based on two factors:

1. **Data scanned**: The amount of data read from the blob
2. **Data returned**: The amount of data returned to the client

The scanning cost is the same whether you use Query Acceleration or download the full blob. But the egress and transfer costs are lower because less data leaves the storage service.

For frequent queries against the same data, consider whether a dedicated analytics service like Azure Synapse Serverless SQL Pools might be more cost-effective. Query Acceleration is best for ad-hoc or infrequent queries where spinning up compute is overkill.

## Wrapping Up

Azure Blob Storage Query Acceleration is a useful tool when you need to filter large CSV or JSON files without downloading them entirely. It works well for ad-hoc data exploration, ETL preprocessing, and simple data extraction tasks. The SQL syntax is limited but covers the most common filtering scenarios. For anything more complex - aggregations, joins, or sorting - you will need to bring in a proper compute engine. But for quick server-side filtering, Query Acceleration is hard to beat in terms of simplicity and cost.
