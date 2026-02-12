# How to Use DynamoDB Write Sharding for Even Distribution

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, DynamoDB, Write Sharding, Performance

Description: Implement write sharding in DynamoDB to distribute high-throughput writes evenly across partitions, preventing hot keys and throttling.

---

Write sharding is the go-to technique when you have a DynamoDB partition key that naturally attracts too much traffic. The idea is simple: add a random or calculated suffix to your partition key so that what would be one hot key becomes many cooler keys spread across multiple partitions.

It's an intentional trade-off. Writes become evenly distributed, but reads become more complex because you have to query multiple shards and combine the results. For write-heavy workloads, this trade-off is almost always worth it.

## When You Need Write Sharding

Write sharding is appropriate when:

- A single partition key value receives more than 1,000 writes per second
- You're seeing throttling despite having enough table-level capacity
- Your access pattern naturally funnels writes to a few keys (counters, leaderboards, popular items)
- DynamoDB's adaptive capacity can't keep up with your write spikes

Common scenarios that need sharding:

- Global event counters (every request increments the same key)
- Time-bucketed data (all current writes go to today's partition)
- Popular items in a marketplace (viral product gets all the attention)
- Real-time aggregation (summing values per category)

## Random Sharding

The simplest approach: append a random number to the partition key.

```javascript
const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

const SHARD_COUNT = 20;  // Number of shards

// Write: pick a random shard
async function writeEvent(eventType, eventData) {
  const shard = Math.floor(Math.random() * SHARD_COUNT);
  const partitionKey = `${eventType}#${shard}`;

  await docClient.put({
    TableName: 'Events',
    Item: {
      pk: partitionKey,
      sk: `${Date.now()}#${Math.random().toString(36).slice(2, 8)}`,
      eventType: eventType,
      data: eventData,
      timestamp: new Date().toISOString()
    }
  }).promise();
}

// Read: query all shards and merge
async function getEvents(eventType, startTime, endTime) {
  const promises = [];

  for (let shard = 0; shard < SHARD_COUNT; shard++) {
    const params = {
      TableName: 'Events',
      KeyConditionExpression: 'pk = :pk AND sk BETWEEN :start AND :end',
      ExpressionAttributeValues: {
        ':pk': `${eventType}#${shard}`,
        ':start': startTime,
        ':end': endTime
      }
    };
    promises.push(docClient.query(params).promise());
  }

  const results = await Promise.all(promises);
  const allItems = results.flatMap(r => r.Items);

  // Sort combined results by timestamp
  return allItems.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}
```

With 20 shards, your write throughput capacity for a single logical key is 20x higher (20 x 1,000 WCUs = 20,000 WCUs).

## Calculated Sharding

Instead of random shards, you can calculate the shard based on some attribute of the data. This makes reads more predictable:

```javascript
// Calculate shard based on a known attribute
function getShard(userId) {
  // Simple hash: take the last digit of a hash
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash |= 0;  // Convert to 32-bit integer
  }
  return Math.abs(hash) % SHARD_COUNT;
}

// Write: shard based on userId
async function logUserAction(eventType, userId, action) {
  const shard = getShard(userId);
  const partitionKey = `${eventType}#${shard}`;

  await docClient.put({
    TableName: 'UserActions',
    Item: {
      pk: partitionKey,
      sk: `${userId}#${Date.now()}`,
      action: action
    }
  }).promise();
}

// Read for a specific user: only need to query one shard
async function getUserActions(eventType, userId) {
  const shard = getShard(userId);
  const partitionKey = `${eventType}#${shard}`;

  const result = await docClient.query({
    TableName: 'UserActions',
    KeyConditionExpression: 'pk = :pk AND begins_with(sk, :userId)',
    ExpressionAttributeValues: {
      ':pk': partitionKey,
      ':userId': `${userId}#`
    }
  }).promise();

  return result.Items;
}
```

The advantage: when you know the user ID, you can calculate exactly which shard to query instead of querying all shards.

## Sharded Counters

The most common write sharding use case is high-throughput counters:

```javascript
const COUNTER_SHARDS = 10;

// Increment a sharded counter
async function incrementCounter(counterName) {
  const shard = Math.floor(Math.random() * COUNTER_SHARDS);

  await docClient.update({
    TableName: 'Counters',
    Key: { counterId: `${counterName}#${shard}` },
    UpdateExpression: 'ADD #count :inc',
    ExpressionAttributeNames: { '#count': 'count' },
    ExpressionAttributeValues: { ':inc': 1 }
  }).promise();
}

// Read the total counter value by summing all shards
async function getCounterValue(counterName) {
  const promises = [];

  for (let i = 0; i < COUNTER_SHARDS; i++) {
    promises.push(
      docClient.get({
        TableName: 'Counters',
        Key: { counterId: `${counterName}#${i}` }
      }).promise()
    );
  }

  const results = await Promise.all(promises);
  return results.reduce((total, r) => total + (r.Item?.count || 0), 0);
}
```

With 10 shards, you can handle 10,000 increments per second on a single logical counter. The read is still fast since you're doing 10 parallel GetItem operations.

## Choosing the Number of Shards

How many shards should you use? It depends on your peak write throughput:

```
Shards needed = Peak writes per second / 1,000 WCUs per partition
```

Add a buffer for safety:

```javascript
// Example calculation
const peakWritesPerSecond = 5000;
const wCUsPerPartition = 1000;
const safetyMultiplier = 1.5;

const shards = Math.ceil(
  (peakWritesPerSecond / wCUsPerPartition) * safetyMultiplier
);
// Result: 8 shards

console.log(`Recommended shards: ${shards}`);
```

More shards means better write distribution but more complex reads. Don't over-shard. If you need 5 shards, don't use 1,000.

## Scatter-Gather Read Pattern

The read pattern for sharded data is called scatter-gather. You scatter queries across all shards and gather the results:

```javascript
// Scatter-gather with pagination support
async function scatterGatherQuery(baseKey, shardCount, queryParams) {
  // Scatter: query all shards in parallel
  const promises = Array.from({ length: shardCount }, (_, shard) => {
    const params = {
      ...queryParams,
      KeyConditionExpression: queryParams.KeyConditionExpression.replace(
        ':pk', `:pk`
      ),
      ExpressionAttributeValues: {
        ...queryParams.ExpressionAttributeValues,
        ':pk': `${baseKey}#${shard}`
      }
    };
    return docClient.query(params).promise();
  });

  const results = await Promise.all(promises);

  // Gather: merge all results
  const allItems = results.flatMap(r => r.Items);

  return {
    items: allItems,
    count: allItems.length,
    // Track if any shard has more pages
    hasMore: results.some(r => r.LastEvaluatedKey)
  };
}
```

## Sharding Time-Series Data

For time-series writes that all target the current time window:

```javascript
// Time-bucketed sharding
function getShardedTimeKey(metricName, intervalMinutes = 5) {
  const now = new Date();
  const bucket = new Date(
    Math.floor(now.getTime() / (intervalMinutes * 60000)) * (intervalMinutes * 60000)
  );
  const timeStr = bucket.toISOString();
  const shard = Math.floor(Math.random() * SHARD_COUNT);

  return `${metricName}#${timeStr}#${shard}`;
}

// Write metric data point
async function writeMetric(metricName, value) {
  await docClient.put({
    TableName: 'Metrics',
    Item: {
      pk: getShardedTimeKey(metricName),
      sk: `${Date.now()}`,
      value: value
    }
  }).promise();
}

// Read metrics for a time range
async function readMetrics(metricName, startTime, endTime, intervalMinutes = 5) {
  const buckets = [];
  let current = new Date(startTime);
  const end = new Date(endTime);

  while (current <= end) {
    buckets.push(current.toISOString());
    current = new Date(current.getTime() + intervalMinutes * 60000);
  }

  // Query all buckets x all shards
  const promises = [];
  for (const bucket of buckets) {
    for (let shard = 0; shard < SHARD_COUNT; shard++) {
      promises.push(
        docClient.query({
          TableName: 'Metrics',
          KeyConditionExpression: 'pk = :pk',
          ExpressionAttributeValues: {
            ':pk': `${metricName}#${bucket}#${shard}`
          }
        }).promise()
      );
    }
  }

  const results = await Promise.all(promises);
  return results.flatMap(r => r.Items);
}
```

## Dynamic Shard Count

If your traffic patterns change, you might want to adjust shard counts dynamically. A metadata table can track the shard count per key:

```javascript
// Store shard configuration
async function setShardCount(logicalKey, count) {
  await docClient.put({
    TableName: 'ShardConfig',
    Item: { key: logicalKey, shardCount: count }
  }).promise();
}

// Get current shard count
async function getShardCount(logicalKey) {
  const result = await docClient.get({
    TableName: 'ShardConfig',
    Key: { key: logicalKey }
  }).promise();
  return result.Item?.shardCount || 1;
}
```

When increasing shards, old shards still have data. When reading, query the maximum historical shard count to avoid missing data.

## Monitoring Shard Distribution

Make sure your sharding is actually distributing writes evenly. Log which shards get traffic and look for imbalances:

```javascript
// Monitor write distribution across shards
const shardWriteCounts = {};

function trackShardWrite(counterName, shard) {
  const key = `${counterName}#${shard}`;
  shardWriteCounts[key] = (shardWriteCounts[key] || 0) + 1;
}

// Periodically log distribution
setInterval(() => {
  console.log('Shard distribution:', JSON.stringify(shardWriteCounts));
  // Reset counters
  Object.keys(shardWriteCounts).forEach(k => delete shardWriteCounts[k]);
}, 60000);
```

Use [OneUptime](https://oneuptime.com/blog/post/aws-cloudwatch-alarms/view) to track throttling metrics across your DynamoDB tables. If you see throttling drop after implementing sharding, you know it's working.

## Wrapping Up

Write sharding is a proven pattern for overcoming DynamoDB's per-partition throughput limits. The mechanics are straightforward: add a suffix to your partition key to spread writes, query all shards and merge for reads. Choose between random sharding (simplest, best for pure writes) and calculated sharding (deterministic, allows single-shard reads). Size your shard count based on peak throughput with a safety buffer. It's extra complexity, but when you need thousands of writes per second on a single logical key, there's no better option.
