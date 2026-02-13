# How to Use DynamoDB Scan vs Query (and When to Use Each)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, DynamoDB, Query, Performance

Description: Understand the critical differences between DynamoDB Scan and Query operations, their costs, performance characteristics, and when each is appropriate.

---

If you take one thing away from this post, let it be this: prefer Query over Scan whenever possible. A Scan reads every item in your table. A Query reads only the items that match your key condition. The difference in cost and speed can be orders of magnitude.

That said, Scan isn't evil. There are legitimate use cases for it. The problem is when developers use Scan by default because it feels simpler, not realizing the performance implications.

## How Query Works

A Query operation targets a specific partition. You provide a partition key value, and DynamoDB goes directly to that partition and reads only the items there. If you also specify a sort key condition, it narrows the read even further.

```javascript
const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

// Query: reads items from ONE partition
async function getCustomerOrders(customerId) {
  const params = {
    TableName: 'Orders',
    KeyConditionExpression: 'customerId = :cid',
    ExpressionAttributeValues: {
      ':cid': customerId
    }
  };

  const result = await docClient.query(params).promise();
  console.log(`Read ${result.Count} items, scanned ${result.ScannedCount} items`);
  return result.Items;
}
```

Key characteristics of Query:
- Requires a partition key value
- Reads from a single partition
- Returns items in sort key order
- Supports sort key conditions (=, <, >, between, begins_with)
- Up to 1MB of data per call
- Single-digit millisecond latency

## How Scan Works

A Scan reads every item in the table (or index), sequentially moving through all partitions. It then optionally applies a filter to the results.

```javascript
// Scan: reads EVERY item in the table
async function getAllActiveUsers() {
  const params = {
    TableName: 'Users',
    FilterExpression: '#status = :active',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: { ':active': 'active' }
  };

  const result = await docClient.scan(params).promise();
  console.log(`Returned ${result.Count} items, scanned ${result.ScannedCount} items`);
  return result.Items;
}
```

Key characteristics of Scan:
- Reads every item in the table
- No partition key required
- Returns items in no particular order
- Filters applied after reading (you still pay for unfiltered items)
- 1MB per call, paginate for full results
- Gets slower and more expensive as table grows

## The Cost Difference

Let's put real numbers to this. Consider a table with 1 million items, each 1KB in size.

**Query for one customer's 25 orders:**
```
Items read: 25
Data read: 25 KB
RCUs consumed: ~7 (eventually consistent)
Cost: negligible
Latency: ~5ms
```

**Scan for all active users (500,000 of 1,000,000):**
```
Items read: 1,000,000 (reads everything first)
Data read: ~1 GB
RCUs consumed: ~125,000 (eventually consistent)
Cost: ~$0.03125
Latency: several seconds to minutes
```

Even though the Scan filter returns only 500,000 items, it reads all 1,000,000. You pay for the full table read.

## When to Use Query

Use Query as your default for almost everything:

**Fetching items by primary key:**
```javascript
// Get all orders for a specific customer
const params = {
  TableName: 'Orders',
  KeyConditionExpression: 'customerId = :cid',
  ExpressionAttributeValues: { ':cid': 'cust-001' }
};
```

**Time-range queries:**
```javascript
// Get orders from the last week
const params = {
  TableName: 'Orders',
  KeyConditionExpression: 'customerId = :cid AND orderDate >= :weekAgo',
  ExpressionAttributeValues: {
    ':cid': 'cust-001',
    ':weekAgo': '2026-02-05T00:00:00Z'
  }
};
```

**Querying secondary indexes:**
```javascript
// Find orders by status using a GSI
const params = {
  TableName: 'Orders',
  IndexName: 'status-date-index',
  KeyConditionExpression: '#status = :status AND orderDate >= :date',
  ExpressionAttributeNames: { '#status': 'status' },
  ExpressionAttributeValues: {
    ':status': 'shipped',
    ':date': '2026-02-01'
  }
};
```

## When to Use Scan

Scan is legitimate in these scenarios:

### Data Export

When you need to export all data to another system:

```javascript
// Export all items for data migration
async function exportTable(tableName) {
  let items = [];
  let lastKey = undefined;

  do {
    const params = {
      TableName: tableName,
      ExclusiveStartKey: lastKey
    };

    const result = await docClient.scan(params).promise();
    items = items.concat(result.Items);
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return items;
}
```

For large exports, consider using [DynamoDB's native S3 export](https://oneuptime.com/blog/post/2026-02-12-dynamodb-export-s3/view) instead.

### Small Tables

If your table has fewer than a few thousand items and doesn't grow much, Scan is fine. The cost and latency are negligible:

```javascript
// Configuration table with 50 items - Scan is fine
async function getAllConfigs() {
  const result = await docClient.scan({
    TableName: 'AppConfig'
  }).promise();
  return result.Items;
}
```

### One-Time Analytics

For ad-hoc analysis or one-time reports where you need to examine every item:

```javascript
// One-time analysis - count items by status
async function analyzeOrderStatuses() {
  const statusCounts = {};
  let lastKey = undefined;

  do {
    const result = await docClient.scan({
      TableName: 'Orders',
      ProjectionExpression: '#s',
      ExpressionAttributeNames: { '#s': 'status' },
      ExclusiveStartKey: lastKey
    }).promise();

    for (const item of result.Items) {
      statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
    }
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return statusCounts;
}
```

### Parallel Scan for Speed

If you must scan a large table, use parallel scan to speed it up. DynamoDB divides the table into segments, and you scan multiple segments simultaneously:

```javascript
// Parallel scan with 4 workers
async function parallelScan(tableName, totalSegments) {
  const promises = [];

  for (let segment = 0; segment < totalSegments; segment++) {
    promises.push(scanSegment(tableName, segment, totalSegments));
  }

  const results = await Promise.all(promises);
  return results.flat();
}

async function scanSegment(tableName, segment, totalSegments) {
  let items = [];
  let lastKey = undefined;

  do {
    const params = {
      TableName: tableName,
      Segment: segment,
      TotalSegments: totalSegments,
      ExclusiveStartKey: lastKey
    };

    const result = await docClient.scan(params).promise();
    items = items.concat(result.Items);
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return items;
}

// Run with 4 parallel segments
const allItems = await parallelScan('Orders', 4);
```

Parallel scan is faster but consumes more throughput. Make sure your table has enough capacity.

## Converting Scans to Queries

If you find yourself using Scan frequently, it usually means your table design doesn't support your access patterns well. Here's how to fix common scenarios:

### "Find all items with status = shipped"

**Before (Scan with filter):**
```javascript
// Bad: scans entire table
const params = {
  TableName: 'Orders',
  FilterExpression: '#s = :status',
  ExpressionAttributeNames: { '#s': 'status' },
  ExpressionAttributeValues: { ':status': 'shipped' }
};
```

**After (Query on GSI):**
```javascript
// Good: create a GSI with status as partition key
const params = {
  TableName: 'Orders',
  IndexName: 'status-index',
  KeyConditionExpression: '#s = :status',
  ExpressionAttributeNames: { '#s': 'status' },
  ExpressionAttributeValues: { ':status': 'shipped' }
};
```

### "Find all items created today"

**Before (Scan with filter):**
```javascript
// Bad: reads every item
const params = {
  TableName: 'Events',
  FilterExpression: 'begins_with(createdAt, :today)',
  ExpressionAttributeValues: { ':today': '2026-02-12' }
};
```

**After (Query on GSI):**
```javascript
// Good: create a GSI with date as partition key
const params = {
  TableName: 'Events',
  IndexName: 'date-index',
  KeyConditionExpression: 'dateKey = :today',
  ExpressionAttributeValues: { ':today': '2026-02-12' }
};
```

## Rate Limiting Scans

If you must scan in production, rate-limit it to avoid consuming all your table's throughput:

```javascript
// Rate-limited scan - process in batches with delays
async function rateLimitedScan(tableName) {
  let lastKey = undefined;
  let totalProcessed = 0;

  do {
    const result = await docClient.scan({
      TableName: tableName,
      Limit: 100,  // Read only 100 items per call
      ExclusiveStartKey: lastKey
    }).promise();

    // Process batch
    await processBatch(result.Items);
    totalProcessed += result.Items.length;

    lastKey = result.LastEvaluatedKey;

    // Wait 100ms between batches to avoid throttling
    if (lastKey) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  } while (lastKey);

  return totalProcessed;
}
```

## Monitoring

Track `ScannedCount` vs `Count` in your operations to identify inefficient queries. If `ScannedCount` is much larger than `Count`, your filters are doing too much work:

```javascript
const result = await docClient.query(params).promise();
const efficiency = (result.Count / result.ScannedCount * 100).toFixed(1);
console.log(`Query efficiency: ${efficiency}% (${result.Count}/${result.ScannedCount})`);
```

Monitor these metrics in production with [OneUptime](https://oneuptime.com/blog/post/2026-02-06-aws-cloudwatch-logs-exporter-opentelemetry-collector/view) to catch scan-heavy patterns before they cause throttling.

## Wrapping Up

The rule is simple: use Query by default, Scan by exception. Design your table and indexes to support your access patterns with Query operations. When you genuinely need to read every item - for exports, analytics on small tables, or data migrations - Scan is the right tool. But always be aware of the cost and capacity implications, especially on large tables. If you find yourself reaching for Scan in hot code paths, step back and reconsider your table design.
