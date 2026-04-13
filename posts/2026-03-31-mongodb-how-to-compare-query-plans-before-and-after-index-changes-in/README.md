# How to Compare Query Plans Before and After Index Changes in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Query Optimization, Indexing, Explain Plan, Performance

Description: Learn how to systematically compare MongoDB query plans and execution statistics before and after index changes to validate performance improvements.

---

## Why Compare Plans Before and After

Creating or dropping indexes can dramatically change which plan MongoDB chooses and how efficiently queries execute. Without a before/after comparison, you can't know whether your index change actually improved things or accidentally made other queries worse.

## Step 1 - Capture the Baseline Plan

Before making any index changes, capture the current explain output and store it:

```javascript
// Baseline: capture plan for your key query
const baselinePlan = db.orders.explain("executionStats").find(
  { status: "pending", region: "west" }
).sort({ createdAt: -1 }).limit(50);

// Store the baseline for comparison
printjson(baselinePlan);
```

Save to a file:

```bash
mongosh mydb --eval '
  printjson(
    db.orders.explain("executionStats")
      .find({ status: "pending", region: "west" })
      .sort({ createdAt: -1 })
      .limit(50)
  );
' > baseline_plan.json
```

## Step 2 - Extract Key Metrics Helper

Write a helper to extract the metrics you care about:

```javascript
function extractMetrics(explainResult) {
  const stats = explainResult.executionStats;
  const plan = explainResult.queryPlanner.winningPlan;

  function findStages(node, stages = []) {
    if (node.stage) stages.push(node.stage);
    if (node.inputStage) findStages(node.inputStage, stages);
    if (node.inputStages) node.inputStages.forEach(s => findStages(s, stages));
    return stages;
  }

  function findIndexName(node) {
    if (node.stage === 'IXSCAN') return node.indexName;
    if (node.inputStage) return findIndexName(node.inputStage);
    if (node.inputStages) {
      for (const s of node.inputStages) {
        const found = findIndexName(s);
        if (found) return found;
      }
    }
    return null;
  }

  return {
    nReturned: stats.nReturned,
    executionTimeMillis: stats.executionTimeMillis,
    totalKeysExamined: stats.totalKeysExamined,
    totalDocsExamined: stats.totalDocsExamined,
    indexUsed: findIndexName(plan),
    stages: findStages(plan),
    hasInMemorySort: findStages(plan).includes('SORT'),
    hasCollScan: findStages(plan).includes('COLLSCAN'),
    examineRatio: stats.totalDocsExamined / (stats.nReturned || 1)
  };
}

// Capture baseline metrics
const baseline = extractMetrics(
  db.orders.explain("executionStats").find(
    { status: "pending", region: "west" }
  ).sort({ createdAt: -1 }).limit(50)
);

printjson(baseline);
```

## Step 3 - Make the Index Change

```javascript
// Before: only single-field indexes exist
db.orders.createIndex({ status: 1 });

// After: create compound index covering filter, sort, and projection
db.orders.createIndex(
  { status: 1, region: 1, createdAt: -1 },
  { name: "status_region_createdAt" }
);

// Check if the index build is still in progress
db.currentOp({ "command.createIndexes": "orders" });  // empty results when build is done
```

## Step 4 - Capture the New Plan

```javascript
const newPlan = db.orders.explain("executionStats").find(
  { status: "pending", region: "west" }
).sort({ createdAt: -1 }).limit(50);

const newMetrics = extractMetrics(newPlan);
printjson(newMetrics);
```

## Step 5 - Compare Plans Side by Side

```javascript
function comparePlans(before, after, label) {
  print(`\n=== Plan Comparison: ${label} ===`);
  print(`Metric                 Before       After        Change`);
  print(`------------------------------------------------------------`);

  const fields = [
    ['executionTimeMillis', 'ms'],
    ['totalKeysExamined', 'keys'],
    ['totalDocsExamined', 'docs'],
    ['examineRatio', 'ratio'],
    ['nReturned', 'docs']
  ];

  fields.forEach(([field, unit]) => {
    const b = before[field];
    const a = after[field];
    const pct = b > 0 ? (((a - b) / b) * 100).toFixed(1) + '%' : 'N/A';
    const arrow = a < b ? 'IMPROVED' : a > b ? 'WORSE' : 'SAME';
    print(`${field.padEnd(22)} ${String(b).padEnd(12)} ${String(a).padEnd(12)} ${pct} ${arrow}`);
  });

  print(`\nIndex used:    ${before.indexUsed} -> ${after.indexUsed}`);
  print(`Stages:        ${before.stages.join(',')} -> ${after.stages.join(',')}`);
  print(`In-mem sort:   ${before.hasInMemorySort} -> ${after.hasInMemorySort}`);
  print(`CollScan:      ${before.hasCollScan} -> ${after.hasCollScan}`);
}

comparePlans(baseline, newMetrics, "orders query after compound index");
```

## Example Output

```text
=== Plan Comparison: orders query after compound index ===
Metric                 Before       After        Change
------------------------------------------------------------
executionTimeMillis    245          3            -98.8% IMPROVED
totalKeysExamined      10000        50           -99.5% IMPROVED
totalDocsExamined      10000        50           -99.5% IMPROVED
examineRatio           200          1            -99.5% IMPROVED
nReturned              50           50           0.0% SAME

Index used:    status_1 -> status_region_createdAt
Stages:        SORT,FETCH,IXSCAN -> FETCH,IXSCAN
In-mem sort:   true -> false
CollScan:      false -> false
```

## Step 6 - Validate That Other Queries Were Not Harmed

```javascript
// Test a suite of queries against the new index
const testQueries = [
  { filter: { status: "confirmed" }, sort: { createdAt: -1 }, label: "confirmed orders" },
  { filter: { region: "east" }, sort: {}, label: "east region scan" },
  { filter: { customerId: "cust-123" }, sort: {}, label: "customer lookup" }
];

testQueries.forEach(({ filter, sort, label }) => {
  let cursor = db.orders.explain("executionStats").find(filter);
  if (Object.keys(sort).length > 0) cursor = cursor.sort(sort);
  const metrics = extractMetrics(cursor);
  print(`${label}: ${metrics.executionTimeMillis}ms, index: ${metrics.indexUsed}, collscan: ${metrics.hasCollScan}`);
});
```

## Rolling Back an Index Change

If the new index hurts other queries:

```javascript
// Drop the new index
db.orders.dropIndex("status_region_createdAt");

// Or use the index specification
db.orders.dropIndex({ status: 1, region: 1, createdAt: -1 });

// Verify the original plan is restored
const rollbackMetrics = extractMetrics(
  db.orders.explain("executionStats").find(
    { status: "pending", region: "west" }
  ).sort({ createdAt: -1 }).limit(50)
);
comparePlans(newMetrics, rollbackMetrics, "after rollback");
```

## Summary

Comparing MongoDB query plans before and after index changes requires capturing explain output with `executionStats` verbosity, extracting key metrics like execution time, keys examined, and stage composition, and then computing percentage changes. Always test a suite of representative queries - not just the one you optimized - to ensure the new index does not regress other access patterns. The `examineRatio` (docs examined divided by docs returned) is the single best indicator of index quality, with 1.0 being ideal.
