# How to Fix Throttling (429 Too Many Requests) Errors in Azure Cosmos DB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Cosmos DB, Throttling, 429 Error, Performance, Database, NoSQL

Description: Learn how to diagnose and resolve 429 Too Many Requests throttling errors in Azure Cosmos DB with practical optimization strategies.

---

If you are using Azure Cosmos DB, you will eventually run into 429 (Too Many Requests) errors. It happens to everyone. The 429 is Cosmos DB's way of telling you that you have exceeded the provisioned throughput (Request Units per second) for your database or container. The request is not lost - the SDK automatically retries it - but if you are seeing 429s regularly, your application performance is suffering.

Let me walk through why this happens and the different strategies to fix it, from quick wins to architectural changes.

## Understanding Request Units (RUs)

Everything in Cosmos DB is measured in Request Units. A single point read of a 1 KB document costs 1 RU. A write costs around 5-10 RUs depending on the document size and indexing. A complex query can cost hundreds or thousands of RUs depending on what it scans.

When you provision throughput (say 10,000 RU/s), you are saying "I want this container to handle 10,000 RUs worth of operations per second." If your workload tries to consume 15,000 RU/s, the extra 5,000 RU/s worth of requests get throttled with a 429 status code.

The SDK handles 429s by waiting for the `x-ms-retry-after-ms` header duration and retrying, but this adds latency. Your p99 response times spike, and if the throttling is severe enough, retries can exhaust their budget and return errors to the application.

## Step 1: Find Out Where You Are Being Throttled

First, understand the scope of the problem. Open the Azure portal, go to your Cosmos DB account, and check the **Metrics** blade. Look at:

- **Total Request Units** - shows actual RU consumption over time
- **Throttled Requests (429s)** - shows how many requests were throttled
- **Normalized RU Consumption** - shows utilization as a percentage per partition key range

```bash
# Query Cosmos DB metrics using Azure CLI
az monitor metrics list \
  --resource "/subscriptions/<sub-id>/resourceGroups/myRG/providers/Microsoft.DocumentDB/databaseAccounts/myCosmosAccount" \
  --metric "TotalRequestUnits,ThrottledRequests" \
  --interval PT5M \
  --output table
```

The Normalized RU Consumption metric is particularly important. Even if your overall RU usage is below the provisioned amount, you can still get throttled if one partition key range is consuming more than its share. This is called a "hot partition."

## Step 2: Check for Hot Partitions

Cosmos DB distributes throughput evenly across physical partitions. If you provisioned 10,000 RU/s and have 5 physical partitions, each partition gets 2,000 RU/s. If all your traffic hits one partition (because of a bad partition key choice), that single partition gets throttled at 2,000 RU/s while the other 9,000 RU/s sit unused.

To check for hot partitions, look at the **Partition Key Statistics** in the portal or query the diagnostics logs:

```kusto
// Find the most consumed partition key ranges in the last hour
CDBDataPlaneRequests
| where TimeGenerated > ago(1h)
| where StatusCode == 429
| summarize ThrottledCount = count() by PartitionId = tostring(PartitionKeyRangeId)
| order by ThrottledCount desc
| take 10
```

If one partition key range has significantly more 429s than others, you have a hot partition problem.

**Fix**: Choose a better partition key. A good partition key has high cardinality and distributes reads and writes evenly. For example, if you are partitioning by `/region` and 80% of your users are in "us-east", that is a hot partition. Consider using `/userId` or a composite key instead.

Note: Changing the partition key requires creating a new container and migrating data. There is no way to change it in place.

## Step 3: Optimize Your Queries to Use Fewer RUs

Expensive queries are a major source of RU consumption. A single poorly written query can consume thousands of RUs per execution.

Check the RU charge of your queries by looking at the response headers:

```python
# Python SDK - check RU cost of a query
from azure.cosmos import CosmosClient

client = CosmosClient(url, credential)
database = client.get_database_client("mydb")
container = database.get_container_client("mycontainer")

# Execute a query and check the RU charge
query = "SELECT * FROM c WHERE c.status = 'active'"
items = list(container.query_items(
    query=query,
    enable_cross_partition_query=True
))

# The request charge is in the response headers
# For the Python SDK, access it from the last response headers
print(f"RU charge: {container.client_connection.last_response_headers['x-ms-request-charge']}")
```

Common query optimizations:

**Use point reads instead of queries when possible.** Reading a single document by its ID and partition key costs 1 RU for a 1 KB document. A query that does the same thing costs at least 2.5 RUs.

```python
# Point read - cheap (1 RU for 1 KB document)
item = container.read_item(item="doc123", partition_key="user456")

# Query that does the same thing - more expensive (2.5+ RUs)
items = list(container.query_items(
    query="SELECT * FROM c WHERE c.id = 'doc123'",
    partition_key="user456"
))
```

**Avoid cross-partition queries.** When a query does not include the partition key in the WHERE clause, it fans out to every partition. This multiplies the RU cost.

**Add appropriate indexes.** Check if your queries are doing full scans by looking at the query metrics. If a query scans many documents but returns few, you probably need a composite index.

```json
{
  "indexingPolicy": {
    "compositeIndexes": [
      [
        {"path": "/status", "order": "ascending"},
        {"path": "/createdDate", "order": "descending"}
      ]
    ]
  }
}
```

**Limit the fields returned.** Select only the fields you need instead of SELECT *:

```sql
-- Instead of this (returns entire document)
SELECT * FROM c WHERE c.status = 'active'

-- Do this (returns only needed fields, fewer RUs)
SELECT c.id, c.name, c.email FROM c WHERE c.status = 'active'
```

## Step 4: Increase Provisioned Throughput

Sometimes the simplest fix is the right one. If your workload genuinely needs more RU/s, increase the provisioned throughput.

```bash
# Update the throughput on a container
az cosmosdb sql container throughput update \
  --resource-group myResourceGroup \
  --account-name myCosmosAccount \
  --database-name myDatabase \
  --name myContainer \
  --throughput 20000
```

But before blindly increasing throughput, make sure you have addressed hot partitions and query optimization. Throwing more RU/s at a hot partition problem just wastes money.

## Step 5: Switch to Autoscale Throughput

If your workload has variable traffic patterns (peaks and valleys), autoscale is often a better choice than fixed provisioned throughput. Autoscale automatically adjusts between 10% and 100% of the maximum RU/s you configure.

```bash
# Migrate a container from manual to autoscale throughput
az cosmosdb sql container throughput migrate \
  --resource-group myResourceGroup \
  --account-name myCosmosAccount \
  --database-name myDatabase \
  --name myContainer \
  --throughput-type autoscale

# Set the maximum autoscale throughput
az cosmosdb sql container throughput update \
  --resource-group myResourceGroup \
  --account-name myCosmosAccount \
  --database-name myDatabase \
  --name myContainer \
  --max-throughput 40000
```

With autoscale set to a max of 40,000 RU/s, Cosmos DB will scale between 4,000 and 40,000 RU/s based on actual usage. You pay for the peak of each hour, so if you only hit 40,000 during a 5-minute burst, you pay for 40,000 for that hour. During quiet hours, you might only pay for 4,000.

## Step 6: Implement Client-Side Rate Limiting

If you cannot increase throughput or the 429s are caused by bursty workloads, implement client-side rate limiting to smooth out the request rate:

```csharp
// C# example - use a SemaphoreSlim to limit concurrent Cosmos DB operations
// This prevents overwhelming Cosmos DB with too many parallel requests
private static readonly SemaphoreSlim _semaphore = new SemaphoreSlim(50);

public async Task<ItemResponse<MyDocument>> CreateDocumentThrottled(MyDocument doc)
{
    await _semaphore.WaitAsync();
    try
    {
        return await _container.CreateItemAsync(doc, new PartitionKey(doc.PartitionKey));
    }
    finally
    {
        _semaphore.Release();
    }
}
```

## Step 7: Configure SDK Retry Policies

The Cosmos DB SDKs have built-in retry logic for 429s, but the defaults might not be right for your workload:

```csharp
// C# SDK - configure retry options
CosmosClientOptions options = new CosmosClientOptions
{
    // Maximum number of retries for 429 errors
    MaxRetryAttemptsOnRateLimitedRequests = 9,

    // Maximum wait time for retries
    MaxRetryWaitTimeOnRateLimitedRequests = TimeSpan.FromSeconds(30)
};

CosmosClient client = new CosmosClient(connectionString, options);
```

## Monitoring and Alerting

Set up alerts so you know about throttling before it impacts users:

```bash
# Create an alert for 429 errors exceeding a threshold
az monitor metrics alert create \
  --resource-group myResourceGroup \
  --name "CosmosDB-Throttling-Alert" \
  --scopes "/subscriptions/<sub-id>/resourceGroups/myRG/providers/Microsoft.DocumentDB/databaseAccounts/myCosmosAccount" \
  --condition "total ThrottledRequests > 100" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action-group myActionGroup \
  --description "Alert when Cosmos DB throttling exceeds 100 requests in 5 minutes"
```

## Summary

429 throttling in Cosmos DB is a capacity management problem. The fix depends on the root cause: if it is a hot partition, you need a better partition key; if it is expensive queries, optimize them; if it is genuinely high demand, increase throughput or switch to autoscale. Always start by checking the Normalized RU Consumption metric to understand whether the throttling is across all partitions or concentrated on one. That single metric tells you which direction to go.
