# How to Use Atlas Query Profiler for Cloud MongoDB Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Profiler, Cloud, Performance

Description: Learn how to use the MongoDB Atlas Query Profiler to identify slow operations, analyze query shapes, and optimize performance without direct database access.

---

MongoDB Atlas includes a built-in Query Profiler that surfaces slow operation data through a web UI, without requiring direct access to the `system.profile` collection. It is the primary tool for performance optimization on Atlas deployments.

## What the Atlas Query Profiler Provides

- Operations slower than your configured threshold
- Query shapes grouped by filter pattern
- Execution stats: keys examined, docs examined, execution time
- Namespace breakdown
- Historical trend data across time windows

## Accessing the Query Profiler

1. Log in to cloud.mongodb.com
2. Select your cluster
3. Click **Query Insights** in the left sidebar
4. Click the **Query Profiler** tab (available on M10+ clusters)

The Atlas UI requires no code changes or database access.

## Setting the Slow Query Threshold

Atlas uses a managed slow operation threshold by default, which dynamically adjusts based on average operation execution time across the cluster. If you opt out of the managed threshold, it falls back to a fixed 100 ms threshold.

You can set a custom threshold per database using `mongosh`:

```javascript
// Set profiling level 1 (log slow ops) with a 200ms threshold
db.setProfilingLevel(1, { slowms: 200 });
```

You can also toggle the Atlas-managed slow operation threshold via the Atlas Admin API:

```bash
# Disable the managed slow operation threshold (falls back to fixed 100ms)
curl -s --digest -u "api-public-key:api-private-key" \
  -X DELETE \
  "https://cloud.mongodb.com/api/atlas/v2/groups/{groupId}/managedSlowMs/disable"

# Re-enable the managed slow operation threshold
curl -s --digest -u "api-public-key:api-private-key" \
  -X POST \
  "https://cloud.mongodb.com/api/atlas/v2/groups/{groupId}/managedSlowMs/enable"
```

## Querying the System Profile Programmatically on Atlas

Even on Atlas, you can query `system.profile` via your connection string if profiling is enabled:

```javascript
const client = new MongoClient(atlasConnectionString);
const db = client.db("myapp");

const slowOps = await db.collection("system.profile").find(
  { millis: { $gt: 200 } }
).sort({ millis: -1 }).limit(20).toArray();

slowOps.forEach(op => {
  console.log(`${op.ns} | ${op.millis}ms | ${op.planSummary}`);
});
```

Note: Atlas restricts access to the `local` and `config` databases but allows access to `system.profile` in application databases.

## Reading Atlas Query Profiler Data

The Atlas Query Profiler groups operations by **query shape** - the structure of the query filter without actual values:

```text
Query Shape: { status: 1, userId: 1, createdAt: -1 }
Operations: 1,247 in last hour
Avg exec time: 342ms
Docs examined / returned: 8,450 / 12
Recommendation: Create index on { status: 1, userId: 1, createdAt: -1 }
```

## Atlas Performance Advisor vs Query Profiler

| Feature             | Performance Advisor        | Query Profiler             |
|---------------------|----------------------------|----------------------------|
| Index suggestions   | Yes, automated             | No, manual analysis        |
| Query history       | 24-hour rolling window     | 24-hour rolling window     |
| Query shape detail  | Aggregated                 | Individual operations      |
| Access requirement  | Atlas UI / API             | Atlas UI / system.profile  |

Use Performance Advisor for automated index recommendations. Use Query Profiler for detailed per-operation analysis.

## Exporting Profiler Data via Atlas API

```bash
# Get slow query logs (use the hostname of a specific node, not the cluster name)
curl -s --digest -u "api-public-key:api-private-key" \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/clusters/{hostName}/logs/mongodb.gz" \
  -o mongodb.log.gz

# Extract and grep for slow queries
gunzip -c mongodb.log.gz | grep '"slow query"' | jq '.durationMillis'
```

## Disabling Profiling on Atlas

If profiling overhead is noticeable:

```javascript
// Per-database setting via mongosh (Atlas allows this)
db.setProfilingLevel(0);
```

Note: Custom profiling settings set via `db.setProfilingLevel()` reset to default values (Level 0) after a node restart. The Atlas Query Profiler UI continues to work independently as it relies on log-based slow query capture.

## Summary

The Atlas Query Profiler provides a web-based view of slow operations grouped by query shape, without requiring direct database access or shell commands. Use it to identify high-impact slow queries, compare examine-to-return ratios, and act on index recommendations from the Performance Advisor. For programmatic access, query `system.profile` directly via your Atlas connection string. Adjust the slow query threshold through `mongosh` or the Atlas Admin API to balance observability with overhead.
