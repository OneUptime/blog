# How to Read the allPlansExecution Output in MongoDB explain()

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Query Optimization, Explain Plan, Performance, Indexing

Description: Learn how to interpret MongoDB's allPlansExecution explain output to compare candidate query plans by their actual execution statistics during the trial phase.

---

## What Is allPlansExecution Verbosity

MongoDB's `explain()` has three verbosity levels: `queryPlanner`, `executionStats`, and `allPlansExecution`. The `allPlansExecution` level is the most detailed - it shows execution statistics for both the winning plan and all candidate plans that were evaluated during the optimizer's trial period.

This is invaluable when you want to understand why the optimizer chose one plan over another, or why a seemingly better index is being ignored.

## Running explain with allPlansExecution

```javascript
// Run with allPlansExecution verbosity
db.orders.explain("allPlansExecution").find(
  { status: "pending", region: "west" }
);

// Using runCommand
db.runCommand({
  explain: {
    find: "orders",
    filter: { status: "pending", region: "west" }
  },
  verbosity: "allPlansExecution"
});

// For aggregation pipelines
db.orders.explain("allPlansExecution").aggregate([
  { $match: { status: "pending", region: "west" } },
  { $group: { _id: "$region", total: { $sum: "$amount" } } }
]);
```

## Sample allPlansExecution Output

```javascript
{
  "queryPlanner": {
    "winningPlan": {
      "stage": "FETCH",
      "inputStage": {
        "stage": "IXSCAN",
        "indexName": "status_region_1",
        "indexBounds": {
          "status": ["[\"pending\", \"pending\"]"],
          "region": ["[\"west\", \"west\"]"]
        }
      }
    },
    "rejectedPlans": [ ... ]
  },
  "executionStats": {
    "executionSuccess": true,
    "nReturned": 142,
    "executionTimeMillis": 3,
    "totalKeysExamined": 142,
    "totalDocsExamined": 142,
    "executionStages": { ... },
    "allPlansExecution": [
      {
        "nReturned": 101,
        "executionTimeMillisEstimate": 0,
        "totalKeysExamined": 101,
        "totalDocsExamined": 101,
        "executionStages": {
          "stage": "FETCH",
          "nReturned": 101,
          "inputStage": {
            "stage": "IXSCAN",
            "indexName": "status_region_1",
            "keysExamined": 101,
            "seeks": 1,
            "dupsTested": 0,
            "dupsDropped": 0
          }
        }
      },
      {
        "nReturned": 101,
        "executionTimeMillisEstimate": 1,
        "totalKeysExamined": 890,
        "totalDocsExamined": 890,
        "executionStages": {
          "stage": "FETCH",
          "inputStage": {
            "stage": "IXSCAN",
            "indexName": "region_1",
            "keysExamined": 890,
            "seeks": 1
          }
        }
      }
    ]
  }
}
```

## Understanding the Trial Phase

The optimizer runs each candidate plan in a round-robin fashion during a limited trial period. The first plan to return 101 results wins. The `allPlansExecution` array shows stats from this trial, not the full execution.

```text
Trial phase rules:
- Plans compete in rounds of "works" (internal execution units)
- The first plan to return 101 results (internalQueryPlanEvaluationMaxResults) OR complete wins
- Each plan has a work budget controlled by internalQueryPlanEvaluationWorks (default 10000)
- Stats are trial-phase only - not reflective of full query execution
- The winning plan is then run to completion
```

## Interpreting keysExamined vs nReturned

```javascript
// Plan A - good selectivity
{
  "nReturned": 101,
  "totalKeysExamined": 101,
  "totalDocsExamined": 101
}

// Plan B - poor selectivity
{
  "nReturned": 101,
  "totalKeysExamined": 890,
  "totalDocsExamined": 890
}
```

A ratio of `keysExamined / nReturned` close to 1.0 means the index is highly selective. A ratio of 8+ (like Plan B) means the index is scanning many documents to find matching ones - it's less efficient.

## Stage-Level Execution Stats

Each stage in `executionStages` includes:

```javascript
{
  "stage": "IXSCAN",
  "nReturned": 142,
  "executionTimeMillisEstimate": 2,
  "works": 143,
  "advanced": 142,
  "needTime": 1,
  "needYield": 0,
  "saveState": 0,
  "restoreState": 0,
  "isEOF": 1,
  "keysExamined": 142,
  "seeks": 1,
  "dupsTested": 0,
  "dupsDropped": 0
}
```

Key fields:
- `works` - total units of work performed (keys/docs examined + overhead)
- `advanced` - rows passed up to the parent stage
- `needTime` - work units that did not advance (intermediate operations)
- `seeks` - number of times the index cursor repositioned (lower is better)

## FETCH Stage Analysis

```javascript
{
  "stage": "FETCH",
  "nReturned": 142,
  "executionTimeMillisEstimate": 3,
  "docsExamined": 142,    // documents loaded from storage
  "alreadyHasObj": 0,
  "inputStage": { ... }
}
```

If `docsExamined` is much higher than `nReturned`, a post-filter is dropping many documents after fetching - your index may not cover all the filter conditions.

## Comparing Plans in allPlansExecution

```javascript
// Extract comparison from allPlansExecution
const plans = explainResult.executionStats.allPlansExecution;

plans.forEach((plan, i) => {
  const indexName = plan.executionStages.inputStage?.indexName || 'COLLSCAN';
  const ratio = plan.totalKeysExamined / (plan.nReturned || 1);
  console.log(`Plan ${i}: ${indexName}`);
  console.log(`  keysExamined: ${plan.totalKeysExamined}`);
  console.log(`  nReturned: ${plan.nReturned}`);
  console.log(`  examineRatio: ${ratio.toFixed(2)}`);
  console.log(`  timeMs: ${plan.executionTimeMillisEstimate}`);
});
```

## When the Wrong Plan Wins

If a less optimal plan wins, consider:

```javascript
// 1. Clear the plan cache to discard stale cached plans
db.orders.getPlanCache().clear();

// 2. Use hint to force a specific index
db.orders.find({ status: "pending", region: "west" }).hint("status_region_1");

// 3. Set an index filter to restrict candidates
db.runCommand({
  planCacheSetFilter: "orders",
  query: { status: "pending", region: "west" },
  indexes: [{ status: 1, region: 1 }]
});

// 4. Check plan cache for stale entries
db.orders.getPlanCache().list();
```

## Summary

`allPlansExecution` verbosity in MongoDB's `explain()` provides the most complete picture of query optimization by showing trial-phase execution statistics for every candidate plan, not just the winner. By comparing `keysExamined / nReturned` ratios across plans, you can confirm whether the optimizer made the right choice and diagnose cases where a better index is being ignored due to stale plan cache entries. Since `allPlansExecution` is a superset of `executionStats`, it is the best single verbosity level to use when investigating slow queries.
