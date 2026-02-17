# How to Optimize Azure Cosmos DB Request Unit Consumption and Reduce Costs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Cosmos DB, Request Units, Cost Optimization, NoSQL, Database Performance, Cloud Database

Description: Practical techniques for reducing Azure Cosmos DB request unit consumption through query optimization, indexing strategies, and provisioning best practices.

---

Cosmos DB pricing revolves around Request Units (RUs). Every read, write, and query operation consumes a certain number of RUs, and you pay for the RUs you provision. The problem is that RU consumption can be wildly different depending on how you structure your data, write your queries, and configure your indexes. I have seen teams reduce their Cosmos DB costs by 60-80% without any loss in functionality just by optimizing their RU consumption.

Let me walk you through the most impactful optimizations.

## Understanding Request Unit Costs

A single point read (fetching one document by its ID and partition key) costs 1 RU for a 1 KB document. Everything else is more expensive:

- A point read of a 10 KB document costs roughly 3 RUs
- A query that scans 100 documents might cost 50-500 RUs depending on complexity
- A write of a 1 KB document costs about 5 RUs
- A cross-partition query can cost 10-100x more than a single-partition query

The first step in optimization is understanding where your RUs are going. Enable diagnostic logging and review the request charge header that comes back with every response.

```javascript
// Node.js example: Check RU cost of each operation
// The x-ms-request-charge header tells you exactly how many RUs were consumed
const { resource, headers } = await container.items
  .query("SELECT * FROM c WHERE c.category = 'electronics'")
  .fetchAll();

console.log(`Query consumed ${headers['x-ms-request-charge']} RUs`);
console.log(`Returned ${resource.length} documents`);
```

## Optimize Partition Key Selection

The partition key is the single most important decision for Cosmos DB performance and cost. A bad partition key leads to hot partitions, cross-partition queries, and wasted RUs.

Your partition key should:
- Distribute data evenly across partitions
- Be included in most of your queries (to avoid cross-partition queries)
- Have high cardinality (many distinct values)

A common anti-pattern is using a status field like "active" or "pending" as a partition key. If 90% of documents are "active," you have a hot partition. Instead, use something like userId, tenantId, or a composite key that distributes evenly.

```javascript
// Bad: Low cardinality partition key
// Most documents have status "active", creating a hot partition
{
  "id": "order-123",
  "partitionKey": "active",  // Don't do this
  "customerId": "cust-456"
}

// Good: High cardinality partition key
// Distributes evenly across customers
{
  "id": "order-123",
  "partitionKey": "cust-456",  // Customer ID as partition key
  "status": "active"
}
```

## Write Efficient Queries

The difference between an efficient and inefficient Cosmos DB query can be hundreds of RUs. Here are the most impactful query optimizations.

**Use point reads instead of queries.** If you know the document ID and partition key, use a point read. It is always cheaper than a query.

```javascript
// Point read: ~1 RU for a 1KB document
// This is the cheapest possible read operation
const { resource } = await container.item("order-123", "cust-456").read();

// Query to achieve the same result: ~3-5 RUs minimum
// Even a simple query costs more than a point read
const { resources } = await container.items
  .query({
    query: "SELECT * FROM c WHERE c.id = @id",
    parameters: [{ name: "@id", value: "order-123" }]
  })
  .fetchAll();
```

**Project only the fields you need.** SELECT * returns entire documents. If you only need three fields, select only those three fields. Smaller response payloads use fewer RUs.

```sql
-- Expensive: Returns full documents including large nested objects
SELECT * FROM c WHERE c.category = 'electronics'

-- Cheaper: Returns only the fields the application needs
SELECT c.id, c.name, c.price FROM c WHERE c.category = 'electronics'
```

**Avoid cross-partition queries.** Queries that do not include the partition key in the WHERE clause fan out to all partitions. Each partition consumes RUs independently, and the total cost is the sum across all partitions.

```sql
-- Cross-partition query (expensive): No partition key filter
SELECT * FROM c WHERE c.createdDate > '2026-01-01'

-- Single-partition query (cheap): Includes partition key
SELECT * FROM c WHERE c.customerId = 'cust-456' AND c.createdDate > '2026-01-01'
```

## Optimize Indexing Policy

By default, Cosmos DB indexes every property in every document. This is convenient but wasteful if you have properties that are never queried. Each indexed property adds to the RU cost of writes.

Customize your indexing policy to only index the properties you actually query on.

```json
{
  "indexingMode": "consistent",
  "automatic": true,
  "includedPaths": [
    {
      "path": "/customerId/?"
    },
    {
      "path": "/category/?"
    },
    {
      "path": "/createdDate/?"
    },
    {
      "path": "/status/?"
    }
  ],
  "excludedPaths": [
    {
      "path": "/*"
    }
  ],
  "compositeIndexes": [
    [
      { "path": "/category", "order": "ascending" },
      { "path": "/createdDate", "order": "descending" }
    ]
  ]
}
```

This policy excludes all paths by default and only indexes the four properties we query on. Composite indexes support queries with ORDER BY on multiple properties without requiring a full scan.

For write-heavy workloads, reducing the number of indexed properties can cut write RU costs by 30-50%.

## Use the Right Consistency Level

Cosmos DB offers five consistency levels, each with different RU cost implications:

- **Strong**: 2x the RU cost of eventual consistency
- **Bounded staleness**: 2x the RU cost of eventual consistency
- **Session**: 1x (the default)
- **Consistent prefix**: 1x
- **Eventual**: 1x (cheapest reads)

If your application can tolerate eventual consistency for some operations, you can halve the read RU cost for those operations by overriding the default consistency level per request.

```javascript
// Override consistency level for a specific read operation
// Use eventual consistency when strong consistency is not needed
const { resource } = await container.item("order-123", "cust-456").read({
  consistencyLevel: "Eventual"
});
```

## Right-Size Provisioned Throughput

If you are using provisioned throughput, review your actual RU consumption against provisioned RUs. Azure Monitor shows this clearly.

```bash
# Query Cosmos DB metrics for actual vs provisioned RU consumption
az monitor metrics list \
  --resource "/subscriptions/{sub-id}/resourceGroups/myRG/providers/Microsoft.DocumentDB/databaseAccounts/myCosmosDB" \
  --metric "TotalRequestUnits" \
  --interval PT1H \
  --aggregation Total \
  --start-time 2026-02-09T00:00:00Z \
  --end-time 2026-02-16T00:00:00Z \
  -o table
```

If your peak consumption is 2,000 RU/s but you have provisioned 10,000 RU/s, you are paying for 8,000 unused RUs every second. Either reduce provisioned throughput or switch to autoscale.

Autoscale automatically adjusts between 10% and 100% of a maximum RU/s value. You pay for the actual peak in each hour. For workloads with variable traffic patterns, autoscale often costs 30-40% less than fixed provisioned throughput.

## Use the Serverless Tier for Low-Traffic Workloads

For development environments, proof-of-concept projects, or low-traffic applications that consume fewer than a few hundred thousand RUs per day, the serverless tier is significantly cheaper. You pay per RU consumed with no hourly provisioning cost.

The serverless tier has some limitations (5 GB per partition, no geo-replication, no dedicated throughput guarantees), but for appropriate workloads, the cost savings are substantial.

## Bulk Operations

If you need to insert or update many documents at once, use bulk mode in the SDK. Bulk operations batch multiple requests together, reducing the per-operation overhead and improving throughput.

```javascript
// Enable bulk mode for high-volume operations
// This batches requests and optimizes RU consumption
const container = database.container("orders");

const operations = documents.map(doc => ({
  operationType: "Create",
  resourceBody: doc,
  partitionKey: doc.customerId
}));

// Bulk execute - more efficient than individual creates
const response = await container.items.bulk(operations);
console.log(`Bulk operation consumed ${response.headers['x-ms-request-charge']} RUs`);
```

## TTL for Automatic Cleanup

If you have data that is only needed for a limited time (logs, session data, temporary records), set a time-to-live (TTL) on the container or individual documents. Cosmos DB automatically deletes expired documents without consuming RUs from your provisioned throughput.

```json
{
  "id": "session-abc",
  "customerId": "cust-456",
  "ttl": 86400,
  "data": { "cart": [] }
}
```

This document will be automatically deleted 24 hours (86400 seconds) after it was last modified.

Optimizing Cosmos DB RU consumption is an ongoing practice. Start by identifying your most expensive operations through diagnostic logs, then apply the optimizations that give you the biggest return. Partition key selection and query patterns are usually the highest-impact changes, followed by indexing policy and throughput sizing.
