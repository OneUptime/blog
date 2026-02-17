# How to Use Azure Cosmos DB Table API as a Replacement for Azure Table Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Cosmos DB, Table API, Azure Table Storage, NoSQL, Migration

Description: Migrate from Azure Table Storage to Cosmos DB Table API for better performance, global distribution, and SLA-backed latency guarantees with minimal code changes.

---

Azure Table Storage has been around since the early days of Azure. It is cheap, simple, and works fine for basic key-value lookups. But it has real limitations - no SLA on latency, limited querying capabilities, no global distribution, and throughput that depends on partition heat. Azure Cosmos DB Table API is a drop-in replacement that uses the same Table Storage SDK and data model but runs on the Cosmos DB engine. This gives you guaranteed single-digit millisecond latency, global distribution, and automatic indexing while keeping your existing code mostly unchanged.

## Why Switch from Table Storage?

Here is a practical comparison:

| Feature | Azure Table Storage | Cosmos DB Table API |
|---------|-------------------|---------------------|
| Latency SLA | None | < 10ms reads, < 15ms writes (99th percentile) |
| Throughput | 20,000 ops/s per partition | Configurable, autoscale up to millions |
| Global distribution | Geo-redundant storage only | Active multi-region replication |
| Indexing | Primary key only | Automatic indexing on all properties |
| Consistency | Eventual (across regions) | 5 configurable levels |
| SLA availability | 99.9% | Up to 99.999% |
| Querying | PartitionKey + RowKey efficient, everything else is a scan | All properties indexed, efficient filtering |

The biggest wins are guaranteed latency and the automatic secondary indexing. With Table Storage, querying on any property other than PartitionKey and RowKey means a full table scan. With Cosmos DB Table API, every property is indexed by default.

## Creating a Cosmos DB Table API Account

```bash
# Create a Cosmos DB account with Table API
az cosmosdb create \
    --name myTableAccount \
    --resource-group myResourceGroup \
    --capabilities EnableTable \
    --locations regionName=eastus failoverPriority=0 \
    --default-consistency-level Session

# Create a table
az cosmosdb table create \
    --account-name myTableAccount \
    --name customers \
    --throughput 4000 \
    --resource-group myResourceGroup
```

## Updating Your Connection String

The migration starts with changing the connection string. Your existing Table Storage code can point to Cosmos DB with just a connection string swap.

```bash
# Get the Cosmos DB Table API connection string
az cosmosdb keys list \
    --name myTableAccount \
    --resource-group myResourceGroup \
    --type connection-strings \
    --query "connectionStrings[?contains(description, 'Table')].connectionString" -o tsv
```

The connection string format changes from:

```
DefaultEndpointsProtocol=https;AccountName=mystorageaccount;AccountKey=xxx;EndpointSuffix=core.windows.net
```

To:

```
DefaultEndpointsProtocol=https;AccountName=myTableAccount;AccountKey=xxx;TableEndpoint=https://myTableAccount.table.cosmos.azure.com:443/
```

## Using the Azure.Data.Tables SDK (.NET)

The newer `Azure.Data.Tables` SDK works with both Table Storage and Cosmos DB Table API:

```csharp
using Azure.Data.Tables;

// Create a table client - just change the connection string
// to switch between Table Storage and Cosmos DB
string connectionString = Environment.GetEnvironmentVariable("COSMOS_TABLE_CONNECTION_STRING");
TableServiceClient serviceClient = new TableServiceClient(connectionString);

// Get a reference to the table
TableClient tableClient = serviceClient.GetTableClient("customers");

// Create the table if it does not exist
await tableClient.CreateIfNotExistsAsync();
```

### Insert an Entity

```csharp
// Define an entity using TableEntity (dictionary-style)
var customer = new TableEntity("US", "cust-001")
{
    { "Name", "Alice Johnson" },
    { "Email", "alice@example.com" },
    { "City", "Portland" },
    { "SignupDate", DateTimeOffset.UtcNow },
    { "OrderCount", 15 },
    { "TotalSpent", 2499.99 }
};

// Insert or replace the entity
await tableClient.UpsertEntityAsync(customer);
Console.WriteLine("Entity inserted");
```

### Query Entities

```csharp
// Query by PartitionKey and RowKey (most efficient)
TableEntity entity = await tableClient.GetEntityAsync<TableEntity>("US", "cust-001");
Console.WriteLine($"Customer: {entity["Name"]}");

// Query with filter - this is where Cosmos DB shines
// In Table Storage, filtering on City would scan the partition
// In Cosmos DB, it uses the automatic index
var queryResults = tableClient.QueryAsync<TableEntity>(
    filter: $"PartitionKey eq 'US' and City eq 'Portland'"
);

await foreach (TableEntity item in queryResults)
{
    Console.WriteLine($"  {item["Name"]} - {item["City"]}");
}

// Range query on a numeric property
var highValueCustomers = tableClient.QueryAsync<TableEntity>(
    filter: $"PartitionKey eq 'US' and TotalSpent gt 1000.0"
);

await foreach (TableEntity item in highValueCustomers)
{
    Console.WriteLine($"  High value: {item["Name"]} spent {item["TotalSpent"]}");
}
```

### Using Strongly Typed Entities

```csharp
// Define a strongly typed entity class
public class CustomerEntity : ITableEntity
{
    public string PartitionKey { get; set; }    // Region
    public string RowKey { get; set; }          // Customer ID
    public DateTimeOffset? Timestamp { get; set; }
    public ETag ETag { get; set; }

    // Custom properties
    public string Name { get; set; }
    public string Email { get; set; }
    public string City { get; set; }
    public int OrderCount { get; set; }
    public double TotalSpent { get; set; }
}

// Insert a typed entity
var customer = new CustomerEntity
{
    PartitionKey = "US",
    RowKey = "cust-002",
    Name = "Bob Smith",
    Email = "bob@example.com",
    City = "Seattle",
    OrderCount = 8,
    TotalSpent = 1250.00
};

await tableClient.UpsertEntityAsync(customer);

// Query with typed results
var results = tableClient.QueryAsync<CustomerEntity>(
    filter: $"PartitionKey eq 'US'"
);

await foreach (CustomerEntity c in results)
{
    Console.WriteLine($"{c.Name} ({c.City}): {c.OrderCount} orders");
}
```

## Using Python

```python
# Python SDK works with both Table Storage and Cosmos DB Table API
from azure.data.tables import TableServiceClient, TableClient
import os

connection_string = os.environ["COSMOS_TABLE_CONNECTION_STRING"]

# Create the table service client
service_client = TableServiceClient.from_connection_string(connection_string)
table_client = service_client.get_table_client("customers")

# Insert an entity
customer = {
    "PartitionKey": "US",
    "RowKey": "cust-003",
    "Name": "Carol Davis",
    "Email": "carol@example.com",
    "City": "Austin",
    "OrderCount": 22,
    "TotalSpent": 3500.00
}
table_client.upsert_entity(customer)

# Query entities with a filter
# Both PartitionKey filter and property filter use indexes in Cosmos DB
entities = table_client.query_entities(
    query_filter="PartitionKey eq 'US' and City eq 'Austin'"
)

for entity in entities:
    print(f"{entity['Name']} - {entity['City']}")
```

## Migrating Existing Data

To move data from Table Storage to Cosmos DB Table API, you have several options:

### Option 1: AzCopy

```bash
# Export from Table Storage to JSON
azcopy copy \
    "https://mystorageaccount.table.core.windows.net/customers?sv=..." \
    "/tmp/customers/" \
    --include-pattern "*"

# Import into Cosmos DB Table API
# Note: AzCopy direct table-to-table copy may have limitations
# Consider using the Data Migration Tool instead
```

### Option 2: Azure Data Factory

Create a pipeline in Azure Data Factory with:
- Source: Azure Table Storage linked service
- Sink: Azure Cosmos DB Table API linked service
- Map the columns and run the pipeline

This is the easiest approach for large tables because ADF handles batching, retrying, and parallelism.

### Option 3: Custom Migration Script

```csharp
// Custom migration script using both SDKs
// Read from Table Storage and write to Cosmos DB
var sourceClient = new TableClient(tableStorageConnectionString, "customers");
var targetClient = new TableClient(cosmosConnectionString, "customers");

// Page through source entities
AsyncPageable<TableEntity> sourceEntities = sourceClient.QueryAsync<TableEntity>();

int count = 0;
await foreach (TableEntity entity in sourceEntities)
{
    // Write to Cosmos DB
    await targetClient.UpsertEntityAsync(entity);
    count++;

    if (count % 1000 == 0)
        Console.WriteLine($"Migrated {count} entities...");
}

Console.WriteLine($"Migration complete. Total: {count} entities.");
```

## Throughput Planning

Table Storage pricing is based on storage and transactions. Cosmos DB Table API pricing is based on provisioned throughput (RU/s) and storage.

Rough RU costs for Table API operations:

| Operation | Approximate RU Cost |
|-----------|-------------------|
| Point read (1 KB entity) | 1 RU |
| Insert (1 KB entity) | 5 RU |
| Update (1 KB entity) | 5 RU |
| Query returning 1 entity | 3 RU |
| Query returning 10 entities | ~10 RU |

To estimate your needed throughput:

```
Total RU/s = (reads/second * 1) + (writes/second * 5) + (queries/second * avg_results * 3)
```

Start with autoscale throughput so the system adjusts to your actual load.

## Key Differences to Watch For

1. **Entity size limit**: Table Storage allows 1 MB entities. Cosmos DB Table API allows 2 MB.

2. **Batch operations**: Both support batch operations within a single partition. Cosmos DB has a 100-operation batch limit.

3. **Continuation tokens**: The format differs between Table Storage and Cosmos DB. If your code stores continuation tokens, they are not interchangeable.

4. **Throughput model**: Table Storage scales automatically (within limits). Cosmos DB requires you to provision or configure autoscale throughput.

5. **Cost structure**: For high-volume, read-heavy workloads, Cosmos DB may cost more. For workloads that need low latency guarantees, the premium is justified.

Switching from Azure Table Storage to Cosmos DB Table API is one of the smoothest migration paths in Azure. The SDK is compatible, the data model is the same, and you get dramatically better performance and features. The main consideration is cost - run the numbers for your specific workload to make sure the improved latency and indexing justify the higher price per operation.
