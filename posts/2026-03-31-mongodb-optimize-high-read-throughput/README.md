# How to Optimize MongoDB for High Read Throughput

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Performance, Read, Throughput, Query Optimization

Description: Learn how to maximize MongoDB read throughput using covered queries, read preferences, projections, connection pooling, and secondary reads in replica sets.

---

Read-heavy workloads - dashboards, APIs, search - require MongoDB to serve thousands of queries per second with low latency. The following techniques address the most impactful bottlenecks.

## 1. Use Covered Queries

A covered query is satisfied entirely from the index without touching documents. It is the fastest possible read:

```javascript
// Index covers all fields needed
db.users.createIndex({ status: 1, plan: 1, email: 1 })

// Projection matches only indexed fields - query is covered
db.users.find(
  { status: "active", plan: "pro" },
  { email: 1, _id: 0 }
)
```

Verify coverage:

```javascript
db.users.find(
  { status: "active", plan: "pro" },
  { email: 1, _id: 0 }
).explain("executionStats")
// "totalDocsExamined" should be 0 for a covered query
```

## 2. Project Only Needed Fields

Fetching large documents when only a few fields are needed wastes bandwidth and memory:

```javascript
// Slow: fetches full document
db.articles.find({ category: "tech" })

// Fast: fetches only what the API needs
db.articles.find({ category: "tech" }, { title: 1, slug: 1, publishedAt: 1, _id: 0 })
```

## 3. Read from Secondaries

Distribute read load across replica set members:

```javascript
// Node.js driver
const client = new MongoClient(uri, {
  readPreference: "secondaryPreferred"
})
```

For non-time-critical reads (analytics, reporting), use `secondary` or `secondaryPreferred` to offload the primary.

## 4. Increase Connection Pool Size

The default pool size is 100. For high-concurrency services, increase it:

```javascript
const client = new MongoClient(uri, {
  maxPoolSize: 200,
  minPoolSize: 20
})
```

## 5. Cache Frequently Accessed Data

For data that changes infrequently, cache results in Redis or an in-process LRU cache:

```javascript
const cached = await redis.get(`user:${userId}`)
if (cached) return JSON.parse(cached)

const user = await db.users.findOne({ _id: userId })
await redis.setex(`user:${userId}`, 300, JSON.stringify(user))
return user
```

## 6. Use Indexes for Sort Operations

Avoid in-memory sorts on large result sets by indexing the sort field:

```javascript
db.articles.createIndex({ category: 1, publishedAt: -1 })

// Uses index - no in-memory sort
db.articles.find({ category: "tech" }).sort({ publishedAt: -1 }).limit(20)
```

## 7. Add Aggregation Result Caching with $out

For expensive aggregations run periodically, write results to a summary collection:

```javascript
db.orders.aggregate([
  { $group: { _id: "$region", revenue: { $sum: "$amount" } } },
  { $out: "revenue_by_region" }
])

// Dashboards query the fast summary collection
db.revenue_by_region.find()
```

## 8. Monitor with serverStatus

Identify bottlenecks using connection and operation metrics:

```javascript
db.adminCommand({ serverStatus: 1 }).opcounters
// query, getmore, insert, update, delete cumulative counts since server start
```

## Summary

Maximize MongoDB read throughput with covered queries, field projections, secondary reads for replica sets, and larger connection pools. Cache hot data externally when possible and precompute expensive aggregations into summary collections. Monitor `opcounters` and `explain` output to identify and fix the slowest read paths.
