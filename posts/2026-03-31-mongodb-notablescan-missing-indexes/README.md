# How to Use notablescan to Find Queries Missing Indexes in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Index, Performance, Configuration

Description: Learn how to enable the notablescan parameter in MongoDB to detect and reject queries that perform full collection scans, helping you enforce index usage in production.

---

A collection scan (COLLSCAN) occurs when MongoDB reads every document in a collection to satisfy a query. On large collections, this is expensive and slow. MongoDB provides the `notablescan` parameter to detect or enforce indexed queries, making it a powerful tool for catching missing indexes before they cause production problems.

## What is notablescan?

When `notablescan` is set to `true`, MongoDB rejects any query that would require a collection scan. Instead of returning results slowly, the query fails immediately with an error. This makes it easy to identify unindexed queries during development and staging.

**Enable notablescan at runtime:**

```javascript
db.adminCommand({ setParameter: 1, notablescan: true });
```

**Disable it:**

```javascript
db.adminCommand({ setParameter: 1, notablescan: false });
```

**Via mongod.conf:**

```yaml
setParameter:
  notablescan: true
```

## Testing for Collection Scans

With `notablescan` enabled, any query lacking an index returns an error:

```javascript
// Assume no index on "email"
db.users.find({ email: "test@example.com" });
```

Error output:

```text
MongoServerError: No indexed plans available, and running with 'notablescan'
```

This signals that you need to create an index:

```javascript
db.users.createIndex({ email: 1 });
```

After creating the index, the query succeeds.

## Using explain() to Identify COLLSCANs Without notablescan

A safer approach for production is to use `explain()` to audit queries:

```javascript
db.orders.find({ status: "pending" }).explain("queryPlanner");
```

Look for `winningPlan.stage`:

```text
{
  "winningPlan": {
    "stage": "COLLSCAN",
    ...
  }
}
```

`COLLSCAN` means no index was used. Create the appropriate index and recheck.

## Using the Profiler to Catch Missing Indexes

Enable profiling for slow ops and look for `COLLSCAN` in the profiler:

```javascript
db.setProfilingLevel(1, { slowms: 100 });

db.system.profile.find({
  planSummary: "COLLSCAN"
}).sort({ millis: -1 });
```

## Recommended Workflow

Use `notablescan` in development and staging to catch missing indexes early:

```bash
# Start a dev mongod with notablescan
mongod --setParameter notablescan=true
```

Run your full application test suite. Any COLLSCAN will throw an error, surfacing missing indexes before deployment.

**Do not use `notablescan` in production** without careful consideration. Internal MongoDB operations (like administrative queries against internal collections) can perform collection scans and will fail if this parameter is enabled.

## Checking Current Setting

```javascript
db.adminCommand({ getParameter: 1, notablescan: 1 });
```

```text
{ notablescan: false, ok: 1 }
```

## Automating Index Coverage Checks

Combine `notablescan` with a test harness to enforce index coverage:

```javascript
// Jest/Node.js test setup
beforeAll(async () => {
  await db.adminCommand({ setParameter: 1, notablescan: true });
});

afterAll(async () => {
  await db.adminCommand({ setParameter: 1, notablescan: false });
});
```

Any test that triggers a COLLSCAN will now fail explicitly.

## Summary

`notablescan` forces MongoDB to reject queries requiring collection scans, making it an effective tool for discovering missing indexes in non-production environments. Use it in development and CI pipelines to enforce index coverage, and combine it with `explain()` and the slow query profiler for thorough index auditing in production.
