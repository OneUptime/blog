# How to Implement Bulk Operations in Azure Cosmos DB with the .NET SDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Cosmos DB, Bulk Operations, .NET SDK, Performance, Data Import

Description: Learn how to use the Azure Cosmos DB .NET SDK bulk execution feature to efficiently create, update, and delete large numbers of documents at high throughput.

---

When you need to insert, update, or delete thousands or millions of documents in Cosmos DB, doing it one at a time is painfully slow. Each individual operation requires a network round trip, and you will barely scratch the surface of your provisioned throughput. The .NET SDK has built-in bulk execution support that batches operations together, parallelizes them across partitions, and maximizes throughput. This guide shows you how to use it effectively.

## Enabling Bulk Execution

Bulk mode is enabled at the CosmosClient level. When turned on, the SDK automatically groups operations by partition key and sends them in optimized batches.

```csharp
using Microsoft.Azure.Cosmos;

// Create a client with bulk execution enabled
// This changes how all operations through this client are processed
CosmosClient client = new CosmosClient(
    accountEndpoint: "https://myaccount.documents.azure.com:443/",
    authKeyOrResourceToken: "YOUR_KEY",
    clientOptions: new CosmosClientOptions
    {
        AllowBulkExecution = true,
        // Optional: tune connection settings for bulk operations
        MaxRetryAttemptsOnRateLimitedRequests = 20,
        MaxRetryWaitTimeOnRateLimitedRequests = TimeSpan.FromSeconds(60),
        // Use Direct mode for best bulk performance
        ConnectionMode = ConnectionMode.Direct
    }
);

Container container = client.GetContainer("mydb", "mycontainer");
```

## Bulk Insert

The basic pattern is to create a list of tasks and execute them concurrently. The SDK handles the batching and parallelism internally.

```csharp
// Bulk insert 10,000 documents
// Each document is created as a separate task
// The SDK batches them together automatically
int documentCount = 10000;
List<Task> tasks = new List<Task>(documentCount);

for (int i = 0; i < documentCount; i++)
{
    // Create a document with a partition key
    dynamic document = new
    {
        id = Guid.NewGuid().ToString(),
        partitionKey = $"pk-{i % 100}", // Spread across 100 partitions
        name = $"Item {i}",
        category = $"category-{i % 10}",
        price = Math.Round(Random.Shared.NextDouble() * 100, 2),
        createdAt = DateTime.UtcNow
    };

    // Add the create operation to the task list
    // Do not await each one individually - collect them all
    tasks.Add(container.CreateItemAsync(
        item: document,
        partitionKey: new PartitionKey(document.partitionKey)
    ));
}

// Execute all operations concurrently
// The SDK handles batching, parallelism, and retries
await Task.WhenAll(tasks);
Console.WriteLine($"Inserted {documentCount} documents");
```

## Bulk Insert with Error Handling

The basic pattern above will throw an AggregateException if any operation fails. For production code, handle errors per operation:

```csharp
// Bulk insert with per-operation error handling
// This captures the result of each operation individually
int documentCount = 50000;
List<Task<ItemResponse<dynamic>>> tasks = new List<Task<ItemResponse<dynamic>>>(documentCount);
int successCount = 0;
int failureCount = 0;
double totalRUs = 0;

for (int i = 0; i < documentCount; i++)
{
    dynamic document = new
    {
        id = Guid.NewGuid().ToString(),
        partitionKey = $"pk-{i % 200}",
        name = $"Product {i}",
        description = $"Description for product {i}",
        price = Math.Round(Random.Shared.NextDouble() * 500, 2)
    };

    tasks.Add(container.CreateItemAsync<dynamic>(
        item: document,
        partitionKey: new PartitionKey((string)document.partitionKey)
    ));
}

// Process results, handling each task's outcome
foreach (Task<ItemResponse<dynamic>> task in tasks)
{
    try
    {
        ItemResponse<dynamic> response = await task;
        successCount++;
        totalRUs += response.RequestCharge;
    }
    catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.Conflict)
    {
        // Document already exists - might be a retry
        failureCount++;
    }
    catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
    {
        // Throttled - the SDK should retry, but if retries are exhausted
        failureCount++;
        Console.Error.WriteLine($"Throttled after retries: {ex.Message}");
    }
    catch (Exception ex)
    {
        failureCount++;
        Console.Error.WriteLine($"Error: {ex.Message}");
    }
}

Console.WriteLine($"Success: {successCount}, Failures: {failureCount}");
Console.WriteLine($"Total RUs consumed: {totalRUs:N0}");
```

## Bulk Upsert

Upsert creates the document if it does not exist or replaces it if it does. This is useful for data synchronization:

```csharp
// Bulk upsert - create or replace documents
// Useful for syncing data from an external source
List<Task> upsertTasks = new List<Task>();

foreach (var record in externalRecords)
{
    dynamic document = new
    {
        id = record.ExternalId,
        partitionKey = record.Region,
        name = record.Name,
        email = record.Email,
        lastSyncedAt = DateTime.UtcNow
    };

    // UpsertItemAsync creates if not exists, replaces if exists
    upsertTasks.Add(container.UpsertItemAsync(
        item: document,
        partitionKey: new PartitionKey(record.Region)
    ));
}

await Task.WhenAll(upsertTasks);
Console.WriteLine($"Upserted {upsertTasks.Count} documents");
```

## Bulk Delete

Deleting documents in bulk follows the same pattern:

```csharp
// Bulk delete documents matching certain criteria
// First, query for the documents to delete
List<Task> deleteTasks = new List<Task>();

// Query for documents to delete
var query = new QueryDefinition(
    "SELECT c.id, c.partitionKey FROM c WHERE c.status = 'expired'"
);

using FeedIterator<dynamic> iterator = container.GetItemQueryIterator<dynamic>(query);

while (iterator.HasMoreResults)
{
    FeedResponse<dynamic> batch = await iterator.ReadNextAsync();
    foreach (dynamic item in batch)
    {
        string id = item.id;
        string pk = item.partitionKey;

        // Add each delete to the task list
        deleteTasks.Add(container.DeleteItemAsync<dynamic>(
            id: id,
            partitionKey: new PartitionKey(pk)
        ));
    }
}

// Execute all deletes
await Task.WhenAll(deleteTasks);
Console.WriteLine($"Deleted {deleteTasks.Count} documents");
```

## Bulk Read

For reading many documents by their IDs, use bulk point reads instead of a query:

```csharp
// Bulk read documents by ID and partition key
// Much more efficient than a query when you know the keys
List<(string id, PartitionKey pk)> keysToRead = new List<(string, PartitionKey)>
{
    ("doc-1", new PartitionKey("pk-1")),
    ("doc-2", new PartitionKey("pk-2")),
    ("doc-3", new PartitionKey("pk-3")),
    // ... potentially thousands of keys
};

List<Task<ItemResponse<dynamic>>> readTasks = keysToRead
    .Select(key => container.ReadItemAsync<dynamic>(key.id, key.pk))
    .ToList();

var results = await Task.WhenAll(readTasks);
Console.WriteLine($"Read {results.Length} documents");
Console.WriteLine($"Total RUs: {results.Sum(r => r.RequestCharge)}");
```

## Streaming Bulk Operations

For very large datasets that do not fit in memory, process in streaming batches:

```csharp
// Stream bulk insert from a file or database cursor
// Process in batches to control memory usage
int batchSize = 1000;
int totalProcessed = 0;

// Simulating a data stream - replace with your actual data source
IAsyncEnumerable<dynamic> dataStream = ReadDataFromSourceAsync();

List<Task> currentBatch = new List<Task>(batchSize);

await foreach (var record in dataStream)
{
    dynamic document = new
    {
        id = record.Id,
        partitionKey = record.PartitionKey,
        data = record.Data
    };

    currentBatch.Add(container.CreateItemAsync(
        item: document,
        partitionKey: new PartitionKey((string)document.partitionKey)
    ));

    // When the batch is full, wait for it to complete before continuing
    if (currentBatch.Count >= batchSize)
    {
        await Task.WhenAll(currentBatch);
        totalProcessed += currentBatch.Count;
        Console.WriteLine($"Processed {totalProcessed} documents");
        currentBatch.Clear();
    }
}

// Process any remaining documents
if (currentBatch.Count > 0)
{
    await Task.WhenAll(currentBatch);
    totalProcessed += currentBatch.Count;
}

Console.WriteLine($"Total processed: {totalProcessed}");
```

## Performance Tuning

### Throughput Provisioning

Bulk operations will consume all available throughput. Make sure you have enough RU/s provisioned, or use autoscale:

```csharp
// Temporarily increase throughput for a bulk import
// Then scale back down afterward
ThroughputResponse currentThroughput = await container.ReadThroughputAsync(new RequestOptions());

// Scale up for the import
await container.ReplaceThroughputAsync(
    ThroughputProperties.CreateManualThroughput(50000) // 50,000 RU/s for import
);

// ... run your bulk operations ...

// Scale back down after import
await container.ReplaceThroughputAsync(
    ThroughputProperties.CreateManualThroughput(4000) // Back to normal
);
```

### Connection Settings

Tune the client for maximum throughput:

```csharp
// Optimized client settings for bulk operations
CosmosClientOptions options = new CosmosClientOptions
{
    AllowBulkExecution = true,
    ConnectionMode = ConnectionMode.Direct,
    // Increase connection limits for parallel operations
    MaxRequestsPerTcpConnection = 30,
    MaxTcpConnectionsPerEndpoint = 10,
    // Tune retry behavior
    MaxRetryAttemptsOnRateLimitedRequests = 30,
    MaxRetryWaitTimeOnRateLimitedRequests = TimeSpan.FromMinutes(2)
};
```

### Partition Key Distribution

Bulk operations are fastest when data is spread across many partition keys. If all documents go to the same partition, you are limited by that single partition's throughput:

```csharp
// Good: Documents spread across many partitions
// Each partition can be written to in parallel
for (int i = 0; i < 100000; i++)
{
    var doc = new { id = $"doc-{i}", partitionKey = $"pk-{i % 500}" };
    // 500 different partition keys = high parallelism
}

// Bad: All documents in one partition
// Limited to single-partition throughput
for (int i = 0; i < 100000; i++)
{
    var doc = new { id = $"doc-{i}", partitionKey = "same-key" };
    // All operations funnel through one partition
}
```

## Measuring Throughput

Track your actual throughput during bulk operations:

```csharp
// Measure bulk operation throughput
var stopwatch = System.Diagnostics.Stopwatch.StartNew();
double totalRUs = 0;
int totalDocs = 0;

// ... run bulk operations and accumulate totalRUs and totalDocs ...

stopwatch.Stop();
double docsPerSecond = totalDocs / stopwatch.Elapsed.TotalSeconds;
double rusPerSecond = totalRUs / stopwatch.Elapsed.TotalSeconds;

Console.WriteLine($"Duration: {stopwatch.Elapsed}");
Console.WriteLine($"Documents/second: {docsPerSecond:N0}");
Console.WriteLine($"RU/second: {rusPerSecond:N0}");
```

With proper tuning, bulk operations on Cosmos DB can easily achieve tens of thousands of operations per second. The key ingredients are: enable bulk mode on the client, spread data across partitions, provision enough throughput, and let the SDK handle the batching. Do not try to micro-manage the batching yourself - the SDK does a better job of it than hand-rolled solutions.
