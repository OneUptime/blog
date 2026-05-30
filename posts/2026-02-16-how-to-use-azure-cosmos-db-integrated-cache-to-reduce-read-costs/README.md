# How to Use Azure Cosmos DB Integrated Cache to Reduce Read Costs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Cosmos DB, Integrated Cache, Caching, Cost Optimization, Performance

Description: Configure and use the Azure Cosmos DB integrated cache to serve repeated reads from an in-memory cache, reducing both RU consumption and read latency.

---

If your application reads the same documents or runs the same queries repeatedly, you are paying full RU costs for each read even though the data has not changed. The Azure Cosmos DB integrated cache is a built-in, in-memory cache that sits in front of your Cosmos DB account. It transparently caches point reads and query results, serving subsequent requests from memory instead of hitting the database. This reduces both your RU costs and your read latency.

## How the Integrated Cache Works

The integrated cache runs on your Cosmos DB dedicated gateway. When a read request comes in:

1. The gateway checks if the result is in the cache
2. If yes (cache hit), it returns the cached result - zero RU cost
3. If no (cache miss), it reads from Cosmos DB, caches the result, and returns it

```mermaid
graph LR
    A[Application] -->|Read Request| B[Dedicated Gateway<br/>with Integrated Cache]
    B -->|Cache Hit| A
    B -->|Cache Miss| C[Cosmos DB Backend]
    C -->|Response| B
    B -->|Cache + Return| A
```

The cache is fully transparent to your application. You do not need to change your data access code, manage cache invalidation, or handle cache-aside logic. It all happens at the gateway level.

## Prerequisites

The integrated cache requires:

- A Cosmos DB dedicated gateway (this is the compute layer that runs the cache)
- Your application must connect through the gateway endpoint (not the direct endpoint)
- The account must use the API for NoSQL (formerly SQL/Core API)

## Setting Up the Dedicated Gateway

### Using Azure Portal

1. Navigate to your Cosmos DB account
2. Under Settings, click Dedicated Gateway
3. Select the SKU (D4s, D8s, or D16s)
4. Choose the number of instances
5. Click Save

### Using Azure CLI

```bash
# Create a dedicated gateway for your Cosmos DB account

# The SKU determines the cache size
az cosmosdb service create \
    --account-name myCosmosAccount \
    --resource-group myResourceGroup \
    --name SqlDedicatedGateway \
    --kind SqlDedicatedGateway \
    --count 1 \
    --size Cosmos.D4s
```

Available SKUs and their approximate cache capacity:

| SKU | vCores | RAM | Approximate Cache Capacity |
|-----|--------|-----|------------|
| Cosmos.D4s | 4 | 16 GB | ~8 GB |
| Cosmos.D8s | 8 | 32 GB | ~16 GB |
| Cosmos.D16s | 16 | 64 GB | ~32 GB |

The integrated cache uses approximately 50% of the node memory; the remaining memory is used for metadata and request routing. Choose the SKU based on how much data you want to cache. If your hot data set is 8 GB, the D4s may be enough, while D8s or D16s gives more room for growth and query results.

## Connecting Through the Dedicated Gateway

The integrated cache only works when you connect through the dedicated gateway endpoint, not the standard endpoint. The gateway endpoint has a different URL format:

```text
Standard endpoint: https://myCosmosAccount.documents.azure.com:443/
Gateway endpoint:  https://myCosmosAccount.sqlx.cosmos.azure.com:443/
```

Note the `.sqlx.` in the gateway endpoint.

### .NET SDK Configuration

```csharp
// Connect through the dedicated gateway to enable the integrated cache
// The key difference is the endpoint URL and ConnectionMode
CosmosClient client = new CosmosClient(
    // Use the dedicated gateway endpoint (note the .sqlx. subdomain)
    accountEndpoint: "https://myCosmosAccount.sqlx.cosmos.azure.com:443/",
    authKeyOrResourceToken: "YOUR_KEY",
    clientOptions: new CosmosClientOptions
    {
        // IMPORTANT: Must use Gateway mode, not Direct
        // The cache only works with Gateway connection mode
        ConnectionMode = ConnectionMode.Gateway
    }
);
```

### Python SDK Configuration

```python
# Connect through the dedicated gateway in Python
from azure.cosmos import CosmosClient

# Use the dedicated gateway endpoint
client = CosmosClient(
    url="https://myCosmosAccount.sqlx.cosmos.azure.com:443/",
    credential="YOUR_KEY",
    connection_mode="Gateway"  # Must be Gateway mode
)
```

### Java SDK Configuration

```java
// Connect through the dedicated gateway in Java
CosmosClient client = new CosmosClientBuilder()
    .endpoint("https://myCosmosAccount.sqlx.cosmos.azure.com:443/")
    .key("YOUR_KEY")
    .gatewayMode()  // Required for integrated cache
    .buildClient();
```

## Controlling Cache Behavior

You can control caching behavior per request using the DedicatedGatewayRequestOptions:

### Setting Maximum Cache Staleness

```csharp
// Control how stale cached data can be
// maxIntegratedCacheStaleness determines the acceptable age of cached data
Container container = client.GetContainer("mydb", "mycontainer");

// Accept cached data up to 5 minutes old
ItemRequestOptions options = new ItemRequestOptions
{
    DedicatedGatewayRequestOptions = new DedicatedGatewayRequestOptions
    {
        MaxIntegratedCacheStaleness = TimeSpan.FromMinutes(5)
    }
};

// This read will use cached data if it is less than 5 minutes old
ItemResponse<MyDoc> response = await container.ReadItemAsync<MyDoc>(
    "doc-123",
    new PartitionKey("pk-1"),
    options
);

Console.WriteLine($"RU charge: {response.RequestCharge}");
// If cache hit: 0 RUs
// If cache miss: normal RU cost
```

### Bypassing the Cache

For operations that must always read the latest data, bypass the cache:

```csharp
// Bypass the cache for critical reads that need fresh data
ItemRequestOptions freshReadOptions = new ItemRequestOptions
{
    DedicatedGatewayRequestOptions = new DedicatedGatewayRequestOptions
    {
        BypassIntegratedCache = true
    }
};

// This reads from the backend and does not populate the integrated cache
var freshResponse = await container.ReadItemAsync<MyDoc>(
    "doc-123",
    new PartitionKey("pk-1"),
    freshReadOptions
);
```

### Caching Query Results

The integrated cache also caches query results:

```csharp
// Cache query results for repeated queries
QueryRequestOptions queryOptions = new QueryRequestOptions
{
    DedicatedGatewayRequestOptions = new DedicatedGatewayRequestOptions
    {
        MaxIntegratedCacheStaleness = TimeSpan.FromMinutes(10)
    }
};

var query = new QueryDefinition("SELECT * FROM c WHERE c.category = @cat")
    .WithParameter("@cat", "electronics");

var iterator = container.GetItemQueryIterator<MyDoc>(query, requestOptions: queryOptions);
var results = await iterator.ReadNextAsync();

Console.WriteLine($"Query RU charge: {results.RequestCharge}");
// Second time running this same query: 0 RUs (cached)
```

## What Gets Cached

The integrated cache operates on two levels:

### Item Cache

Point reads (ReadItemAsync) are cached individually by their ID and partition key. Each cached item takes up space proportional to the document size.

### Query Cache

Query results are cached by the exact query text, parameters, and request options that affect the results. If you run the same query with the same parameters and result-affecting options, the cached result set is returned. Changing a parameter creates a new cache entry.

```csharp
// These two queries are cached separately because the parameter differs
var query1 = "SELECT * FROM c WHERE c.status = 'active'";   // Cached as entry A
var query2 = "SELECT * FROM c WHERE c.status = 'inactive'"; // Cached as entry B

// Running query1 again hits cache entry A
```

## Measuring Cache Effectiveness

Monitor cache hit rates and RU savings:

```csharp
// Track cache hits by monitoring RU charges
// A cache hit results in 0 RU charge
double totalRUs = 0;
double totalMissRUs = 0;
int cacheHits = 0;
int cacheMisses = 0;

for (int i = 0; i < 100; i++)
{
    var response = await container.ReadItemAsync<MyDoc>(
        "popular-doc",
        new PartitionKey("pk-1"),
        new ItemRequestOptions
        {
            DedicatedGatewayRequestOptions = new DedicatedGatewayRequestOptions
            {
                MaxIntegratedCacheStaleness = TimeSpan.FromMinutes(5)
            }
        }
    );

    totalRUs += response.RequestCharge;

    if (response.RequestCharge == 0)
    {
        cacheHits++;
    }
    else
    {
        cacheMisses++;
        totalMissRUs += response.RequestCharge;
    }
}

double hitRate = (double)cacheHits / (cacheHits + cacheMisses) * 100;
double averageMissRUs = cacheMisses == 0 ? 0 : totalMissRUs / cacheMisses;
Console.WriteLine($"Cache hit rate: {hitRate:F1}%");
Console.WriteLine($"Total RUs consumed: {totalRUs}");
Console.WriteLine($"RUs avoided by cache hits: approximately {cacheHits * averageMissRUs:F1} RUs");
```

In Azure Monitor, check these metrics:

```bash
# Monitor dedicated gateway metrics
az monitor metrics list \
    --resource "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.DocumentDB/databaseAccounts/myCosmosAccount" \
    --metric "DedicatedGatewayAverageCPUUsage" \
    --interval PT5M

# Also check: DedicatedGatewayMaximumCPUUsage, DedicatedGatewayMemoryUsage,
# DedicatedGatewayRequests, IntegratedCacheItemHitRate, IntegratedCacheQueryHitRate
```

## Cache Eviction

The cache uses an LRU (Least Recently Used) eviction policy. When the cache is full, the least recently accessed items are evicted to make room for new ones. There is no way to manually evict specific items or clear the cache.

If you need deterministic cache invalidation, the integrated cache might not be the right choice. Consider an external cache like Azure Cache for Redis instead.

## Cost Analysis

The dedicated gateway has a fixed hourly cost based on the SKU and region. For example, in East US at 730 hours per month:

| SKU | Approximate Monthly Cost |
|-----|------------------------|
| Cosmos.D4s (1 instance) | ~$277/month |
| Cosmos.D8s (1 instance) | ~$554/month |
| Cosmos.D16s (1 instance) | ~$1,110/month |

For the cache to be cost-effective, the money saved from lower RU usage must exceed the gateway cost. With serverless pricing, you can estimate breakeven from consumed RUs:

```text
Monthly RU savings needed = Gateway cost / RU price per million
Example: $277 / $0.25 per million RU = 1.108 billion RUs saved per month
```

This means you need to save about 1.1 billion RUs per month to break even on a D4s gateway at those example prices. For provisioned throughput or autoscale accounts, translate cache hits into the lower RU/s capacity you can actually provision; reducing consumed RUs only lowers the bill if it lets you reduce provisioned or autoscale throughput.

## When to Use the Integrated Cache

The integrated cache works best for:

- Read-heavy workloads with repeated access patterns (same documents read many times)
- Dashboard queries that run the same aggregations repeatedly
- Product catalog reads where the same popular items are fetched constantly
- Configuration data that changes infrequently but is read often

It is less effective for:

- Write-heavy workloads
- Unique reads where every request fetches a different document
- Data that changes every few seconds (the cache just adds latency)

The integrated cache is the easiest way to add caching to your Cosmos DB reads because it requires zero application code changes beyond updating the endpoint URL and connection mode. If your workload has a clear hot data set that is read repeatedly, it can cut your RU costs substantially while also reducing read latency.
