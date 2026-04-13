# Validation Summary: How to Use MongoDB Explain Plans to Optimize Queries

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (shell and server-side explain functionality)
- MongoDB Node.js Driver (explain via cursor)
- MongoDB Aggregation Framework ($indexStats, explain on aggregate)

## Sources Consulted
- MongoDB official documentation on explain results and explain verbosity modes: https://www.mongodb.com/docs/manual/reference/explain-results/
- MongoDB official documentation on explain method: https://www.mongodb.com/docs/manual/reference/method/cursor.explain/
- MongoDB official documentation on index types and compound indexes: https://www.mongodb.com/docs/manual/core/indexes/index-types/index-compound/
- MongoDB official documentation on covered queries: https://www.mongodb.com/docs/manual/core/query-optimization/#covered-query
- MongoDB official documentation on $indexStats aggregation stage: https://www.mongodb.com/docs/manual/reference/operator/aggregation/indexStats/
- MongoDB official documentation on the ESR (Equality, Sort, Range) rule: https://www.mongodb.com/docs/manual/tutorial/equality-sort-range-rule/

## Issues Found

### Issue 1: Incorrect residual filter on FETCH stage in explain output example
- **What was wrong:** The "Output with an index (good)" example showed `filter: { status: { $eq: "pending" } }` on the FETCH stage, even though the compound index `{ customerId: 1, status: 1 }` fully covers both query predicates with exact equality bounds in the IXSCAN. When both fields are bounded in the index scan, there is no residual filter needed at the FETCH stage.
- **What was changed:** Removed the `filter` field from the FETCH stage in the example output.
- **Why:** A residual filter on FETCH only appears when the index scan cannot fully satisfy all query conditions. Since both `customerId` and `status` have equality bounds in the IXSCAN `indexBounds`, no additional filtering is required at FETCH. Leaving the incorrect filter could mislead readers into thinking their index isn't fully covering their query predicates.

### Issue 2: `SORT_MERGE` is not a standard MongoDB explain stage
- **What was wrong:** The stage glossary listed `SORT_MERGE` as a MongoDB explain stage for "Merging sorted streams - used for index intersection."
- **What was changed:** Replaced `SORT_MERGE` with `AND_SORTED`, which is the documented MongoDB explain stage for sorted index intersection.
- **Why:** MongoDB's official explain results documentation lists `AND_SORTED` as the stage used when merging sorted streams during index intersection. `SORT_MERGE` does not appear in the official stage documentation. Using the correct stage name is important since readers will be searching for these stage names in their own explain output.

## Review Notes
- The post correctly explains all three verbosity modes (`queryPlanner`, `executionStats`, `allPlansExecution`) and their differences.
- The ESR (Equality, Sort, Range) rule for compound index field ordering is correctly stated.
- The covered query example correctly notes the importance of excluding `_id` from the projection to avoid a FETCH.
- The aggregation explain syntax (`db.collection.explain().aggregate(...)`) is correctly shown — this is a common source of confusion since it differs from the cursor `.explain()` syntax.
- The `$indexStats` usage and recommendation to drop unused indexes is sound advice.
- The Node.js driver example uses `db.collection("orders").find().explain()` which is the correct API for the MongoDB Node.js driver (4.x+).
