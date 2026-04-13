# How to Use MongoDB Atlas Performance Advisor

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Performance Advisor, Index, Query Optimization

Description: Use MongoDB Atlas Performance Advisor to automatically identify slow queries and get recommended index improvements for your collections.

---

## What Is the Performance Advisor?

The Performance Advisor analyzes your query patterns and identifies slow-running operations. It then suggests indexes that would improve performance based on actual traffic. It's the easiest way to find missing indexes without manually reviewing query plans.

Performance Advisor is available on M10 and higher dedicated tiers.

## How It Works

Atlas continuously monitors queries that take longer than the slow query threshold (default 100ms). The advisor analyzes the execution plans of these queries and identifies opportunities for better indexes, surfacing specific `createIndex()` recommendations.

## Step 1: Access the Performance Advisor

1. In Atlas, navigate to your cluster
2. Click the **Performance Advisor** tab in the cluster view
3. The advisor shows recommendations sorted by impact

## Step 2: Understand the Recommendations

Each recommendation shows:
- **Impact**: Average query execution time improvement
- **Collection**: Database and collection affected
- **Recommended Index**: The exact index to create
- **Query Patterns**: Sample queries that will benefit
- **Execution Stats**: Before-improvement metrics

Example recommendation:

```text
Create Index
db.orders.createIndex({ "status": 1, "createdAt": -1 })

Impact: Average query execution time reduced by ~95%
Affected Queries: 1,243 in the past 24 hours
Average Execution Time: 2,340ms -> ~120ms
```

## Step 3: Review the Query Pattern

Click on a recommendation to see the exact query patterns that prompted it:

```javascript
// Query pattern detected
db.orders.find({
  "status": "pending",
  "createdAt": { "$gte": ISODate("2024-01-01") }
}).sort({ "createdAt": -1 })
```

The advisor shows the shape of the query (with actual values replaced by type placeholders).

## Step 4: Create the Recommended Index

Apply the suggestion directly from the UI with one click, or copy the command and run it yourself:

```javascript
// Run in mongosh
db.orders.createIndex(
  { "status": 1, "createdAt": -1 },
  {
    background: true,     // Non-blocking in older versions
    name: "status_1_createdAt_-1"
  }
)
```

On MongoDB 4.2+, index builds use an optimized build process and the `background` option is ignored. Monitor progress:

```javascript
db.currentOp({ "command.createIndexes": { $exists: true } })
```

## Step 5: Use the Atlas CLI to Get Recommendations

```bash
# List performance advisor suggestions
atlas performanceAdvisor suggestedIndexes list \
  --clusterName myCluster \
  --projectId myProjectId

# Get suggestions for a specific namespace
atlas performanceAdvisor suggestedIndexes list \
  --clusterName myCluster \
  --nExamples 5 \
  --namespaces "appdb.orders"
```

## Step 6: Check Slow Query Log

Alongside the advisor, review slow query logs:

```bash
atlas performanceAdvisor slowQueryLogs list \
  --clusterName myCluster \
  --namespaces "appdb.orders" \
  --since 1704067200 \
  --duration 86400000
```

The output shows each slow query, execution time, and execution stats.

## Step 7: Adjust the Slow Query Threshold

The default threshold is 100ms. Atlas automatically manages this threshold on dedicated clusters. To set a custom threshold, first disable the managed threshold:

```bash
# Disable Atlas-managed slow operation threshold
atlas performanceAdvisor slowOperationThreshold disable \
  --projectId myProjectId
```

Then set the threshold via mongosh:

```javascript
// Set threshold to 50ms to catch more slow queries
db.setProfilingLevel(1, { slowms: 50 })
```

To re-enable automatic threshold management:

```bash
atlas performanceAdvisor slowOperationThreshold enable \
  --projectId myProjectId
```

## Step 8: Validate Index Effectiveness

After creating a recommended index, verify it's being used:

```javascript
db.orders.find({
  status: "pending",
  createdAt: { $gte: new Date("2024-01-01") }
}).sort({ createdAt: -1 }).explain("executionStats")
```

Look for `IXSCAN` in the `winningPlan` and check that `totalDocsExamined` is much lower than `totalDocsReturned` would suggest without the index.

## Understanding Index Recommendations

The advisor recommends indexes based on the ESR rule (Equality, Sort, Range):
1. Equality fields first
2. Sort fields second
3. Range fields last

```javascript
// Query: find by status (equality), sort by date (sort), filter by amount (range)
db.orders.find({ status: "active", amount: { $gt: 100 } }).sort({ createdAt: -1 })

// Recommended index follows ESR:
db.orders.createIndex({ status: 1, createdAt: -1, amount: 1 })
```

## Summary

Atlas Performance Advisor continuously analyzes slow queries on M10+ clusters and recommends specific indexes to improve their performance. Access recommendations from the cluster's Performance Advisor tab, review the query patterns and estimated impact, then apply indexes directly or via mongosh. Combine with slow query log analysis and `explain()` to validate improvements and progressively optimize your collections.
