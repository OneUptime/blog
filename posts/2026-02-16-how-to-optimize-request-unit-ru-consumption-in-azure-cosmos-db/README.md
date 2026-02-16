# How to Optimize Request Unit (RU) Consumption in Azure Cosmos DB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Cosmos DB, Request Units, Cost Optimization, Performance Tuning, NoSQL

Description: Practical strategies to reduce Request Unit consumption in Azure Cosmos DB and lower your database costs without sacrificing performance.

---

Request Units (RUs) are the currency of Azure Cosmos DB. Every operation - reads, writes, queries, stored procedures - costs a certain number of RUs. Your monthly bill is directly tied to how many RUs you consume (serverless) or provision (provisioned throughput). Optimizing RU consumption is therefore both a performance exercise and a cost exercise. This guide covers concrete techniques to reduce RU usage across reads, writes, and queries.

## Understanding RU Costs

Before optimizing, you need to understand what drives RU costs:

- **Document size**: Larger documents cost more to read and write
- **Indexing**: More indexed properties means higher write costs
- **Query complexity**: Filters, sorts, aggregations, and cross-partition queries all add cost
- **Consistency level**: Strong and Bounded Staleness reads cost 2x
- **Number of results**: Queries that return more documents cost more

Here are approximate RU costs for common operations on a 1 KB document:

| Operation | Approximate RU Cost |
|-----------|-------------------|
| Point read (by ID + partition key) | 1 RU |
| Write (create/replace) | ~5-7 RU |
| Delete | ~5-7 RU |
| Query (single result, single partition) | ~3 RU |
| Query (10 results, single partition) | ~10 RU |
| Cross-partition query (10 results) | ~30+ RU |

## Technique 1: Use Point Reads Instead of Queries

The single most impactful optimization is using point reads (ReadItemAsync) instead of queries when you know the document's ID and partition key. A point read costs 1 RU for a 1 KB document. The equivalent query costs 3+ RU.

```csharp
// BAD: Using a query to read a document by ID (3+ RU)
var query = new QueryDefinition("SELECT * FROM c WHERE c.id = @id")
    .WithParameter("@id", "doc-123");
var iterator = container.GetItemQueryIterator<MyDoc>(query,
    requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey("pk-1") });
var response = await iterator.ReadNextAsync();
double queryCost = response.RequestCharge; // ~3 RU

// GOOD: Using a point read (1 RU)
var pointRead = await container.ReadItemAsync<MyDoc>(
    "doc-123", new PartitionKey("pk-1"));
double pointReadCost = pointRead.RequestCharge; // ~1 RU
```

If your application reads by ID frequently, this alone can cut your read RU costs by 60-70%.

## Technique 2: Project Only Needed Fields

When querying, return only the fields your application actually needs. Every byte in the response costs RUs.

```csharp
// BAD: Returning all fields including a large 'description' field
var allFields = new QueryDefinition("SELECT * FROM c WHERE c.status = 'active'");

// GOOD: Project only the fields you need
var projectedQuery = new QueryDefinition(
    "SELECT c.id, c.name, c.status, c.price FROM c WHERE c.status = 'active'"
);

// Compare the RU costs
var result1 = await container.GetItemQueryIterator<dynamic>(allFields).ReadNextAsync();
Console.WriteLine($"All fields: {result1.RequestCharge} RUs");

var result2 = await container.GetItemQueryIterator<dynamic>(projectedQuery).ReadNextAsync();
Console.WriteLine($"Projected: {result2.RequestCharge} RUs");
// Projected queries typically cost 30-50% less
```

## Technique 3: Optimize Indexing Policy

By default, Cosmos DB indexes every property. If you have large documents with many properties you never filter or sort on, excluding them from the index reduces write RU costs significantly.

```json
{
    "indexingMode": "consistent",
    "includedPaths": [
        { "path": "/status/?" },
        { "path": "/customerId/?" },
        { "path": "/createdAt/?" },
        { "path": "/category/?" }
    ],
    "excludedPaths": [
        { "path": "/*" }
    ]
}
```

Impact on a document with 20 properties:
- Default indexing (all properties): ~7 RU per write
- Selective indexing (4 properties): ~4 RU per write

That is a 43% reduction in write costs across every single write operation.

## Technique 4: Avoid Cross-Partition Queries

Cross-partition queries fan out to every physical partition, which multiplies the RU cost. Always include the partition key in your query filters when possible.

```csharp
// BAD: Cross-partition query (fans out to all partitions)
// No partition key specified - the query hits every partition
var crossPartition = new QueryDefinition(
    "SELECT * FROM c WHERE c.email = 'alice@example.com'"
);
var cpResult = await container.GetItemQueryIterator<dynamic>(crossPartition).ReadNextAsync();
Console.WriteLine($"Cross-partition: {cpResult.RequestCharge} RUs");

// GOOD: Single-partition query (targets one partition)
var singlePartition = new QueryDefinition(
    "SELECT * FROM c WHERE c.customerId = @custId AND c.email = 'alice@example.com'"
).WithParameter("@custId", "cust-123");

var spResult = await container.GetItemQueryIterator<dynamic>(
    singlePartition,
    requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey("cust-123") }
).ReadNextAsync();
Console.WriteLine($"Single-partition: {spResult.RequestCharge} RUs");
```

## Technique 5: Reduce Document Size

Smaller documents cost less for every operation. Consider these strategies:

```json
// BEFORE: Verbose property names and unnecessary data
{
    "id": "order-123",
    "partitionKey": "cust-456",
    "customerFirstName": "Alice",
    "customerLastName": "Johnson",
    "customerEmailAddress": "alice@example.com",
    "orderCreatedTimestamp": "2026-02-16T10:30:00Z",
    "orderStatusDescription": "Processing",
    "orderTotalAmount": 149.99,
    "orderCurrencyCode": "USD",
    "shippingAddressLine1": "123 Main St",
    "shippingAddressLine2": "",
    "shippingAddressCity": "Portland",
    "shippingAddressState": "OR",
    "shippingAddressZipCode": "97201"
}

// AFTER: Shorter property names and no empty values
{
    "id": "order-123",
    "pk": "cust-456",
    "fn": "Alice",
    "ln": "Johnson",
    "em": "alice@example.com",
    "ts": "2026-02-16T10:30:00Z",
    "st": "Processing",
    "tot": 149.99,
    "cur": "USD",
    "addr": {
        "l1": "123 Main St",
        "city": "Portland",
        "state": "OR",
        "zip": "97201"
    }
}
```

The trade-off is readability. Use this technique for high-volume containers where the RU savings justify the less readable property names. Map them to readable names in your application layer.

## Technique 6: Use Lower Consistency Levels

Strong and Bounded Staleness reads cost 2x the RUs of Session, Consistent Prefix, or Eventual. If your read does not require the strongest consistency, override it per request:

```csharp
// Override to Eventual consistency for non-critical reads
// This halves the read RU cost compared to Strong
ItemRequestOptions options = new ItemRequestOptions
{
    ConsistencyLevel = ConsistencyLevel.Eventual
};

var response = await container.ReadItemAsync<MyDoc>(
    "doc-123", new PartitionKey("pk-1"), options);
// Costs ~0.5 RU instead of ~1 RU for a 1 KB document
```

## Technique 7: Optimize Query Patterns

Certain query patterns are more expensive than others:

```sql
-- EXPENSIVE: ORDER BY without a composite index
-- Forces a sort in memory, high RU cost
SELECT * FROM c WHERE c.status = 'active' ORDER BY c.createdAt DESC

-- CHEAPER: Add a composite index, then the same query is much cheaper
-- See indexing policy documentation for composite index setup

-- EXPENSIVE: Aggregate functions on large datasets
SELECT COUNT(1), AVG(c.price) FROM c WHERE c.category = 'electronics'

-- CHEAPER: Maintain a summary document that you update incrementally
-- Read the summary document with a point read (1 RU) instead of aggregating
```

## Technique 8: Cache Frequently Read Data

If you read the same documents repeatedly, use client-side caching or the integrated cache:

```csharp
// Simple in-memory cache for frequently accessed documents
// Reduces RU consumption for hot data
private static readonly MemoryCache _cache = new MemoryCache(new MemoryCacheOptions
{
    SizeLimit = 10000 // Maximum number of cached items
});

async Task<MyDoc> GetDocumentCached(string id, string partitionKey)
{
    string cacheKey = $"{partitionKey}/{id}";

    if (_cache.TryGetValue(cacheKey, out MyDoc cached))
    {
        return cached; // Cache hit - 0 RUs
    }

    // Cache miss - read from Cosmos DB
    var response = await container.ReadItemAsync<MyDoc>(
        id, new PartitionKey(partitionKey));

    // Cache for 5 minutes
    _cache.Set(cacheKey, response.Resource, new MemoryCacheEntryOptions
    {
        AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5),
        Size = 1
    });

    return response.Resource;
}
```

## Technique 9: Use Pagination Wisely

Fetch only what you need. Do not read 1000 documents when your UI shows 20:

```csharp
// Use MaxItemCount to limit the page size
// Smaller pages = lower RU cost per request
var queryOptions = new QueryRequestOptions
{
    MaxItemCount = 20, // Only fetch 20 items per page
    PartitionKey = new PartitionKey("pk-1")
};

var query = new QueryDefinition("SELECT * FROM c WHERE c.status = 'active'");
var iterator = container.GetItemQueryIterator<MyDoc>(query, requestOptions: queryOptions);

// First page only
if (iterator.HasMoreResults)
{
    var page = await iterator.ReadNextAsync();
    Console.WriteLine($"Got {page.Count} items for {page.RequestCharge} RUs");
    // Store the continuation token for the next page
    string continuationToken = page.ContinuationToken;
}
```

## Measuring Your Optimization Progress

Track RU costs before and after each optimization:

```csharp
// RU tracking wrapper for measuring optimization impact
async Task<(T Result, double RUCost)> TrackRUs<T>(Func<Task<T>> operation, string label)
{
    T result = await operation();

    double rus = result switch
    {
        ItemResponse<dynamic> r => r.RequestCharge,
        FeedResponse<dynamic> r => r.RequestCharge,
        _ => 0
    };

    Console.WriteLine($"[{label}] Cost: {rus} RUs");
    return (result, rus);
}
```

The path to RU optimization is iterative. Start by measuring your current costs, identify the most expensive operations, apply the relevant techniques, and measure again. Even small per-operation savings compound into significant cost reductions at scale. A 1 RU savings on an operation that runs 10 million times per month saves you $2.50/month - and most optimizations save much more than 1 RU per operation.
