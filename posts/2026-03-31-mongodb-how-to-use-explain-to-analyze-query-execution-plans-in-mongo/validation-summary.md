# Validation Summary: How to Use explain() to Analyze Query Execution Plans in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (mongosh shell and Node.js driver)
- `explain()` method and query execution plans
- Index management (`createIndex`)
- Aggregation framework

## Sources Consulted
- MongoDB official documentation: `cursor.explain()` — https://www.mongodb.com/docs/manual/reference/method/cursor.explain/
- MongoDB official documentation: `db.collection.explain()` — https://www.mongodb.com/docs/manual/reference/method/db.collection.explain/
- MongoDB official documentation: Explain Results — https://www.mongodb.com/docs/manual/reference/explain-results/
- MongoDB official documentation: Query Plans — https://www.mongodb.com/docs/manual/core/query-plans/

## Issues Found
1. **Misleading description of `.explain()` chaining (line 17):** The text stated "Append `.explain()` to any `find()`, `aggregate()`, `update()`, or `delete()` call." This is incorrect — `.explain()` can only be appended to `find()` because it returns a cursor. For `aggregate()`, `update()`, and `delete()`, you must use the `db.collection.explain()` form (e.g., `db.orders.explain().updateMany(...)`). Fixed to clarify the two distinct usage patterns.

2. **Incorrect description of the SORT stage (line 104):** The `SORT` stage was described as "In-memory sort (may use index sort)." The `SORT` stage specifically indicates an in-memory sort. When MongoDB uses an index to satisfy the sort order, no `SORT` stage appears in the plan at all. Changed to "In-memory sort (not satisfied by an index)" to accurately reflect what this stage means.

## Review Notes
- The `FETCH` stage is described as "Fetch documents by _id after IXSCAN." Technically, FETCH retrieves documents using the internal record location from the index, not specifically the `_id` field. This is acceptable simplification for the target audience but could be more precise.
- The explain output structure shown follows the pre-MongoDB 5.0 format. Starting with MongoDB 5.1+, explain output may include additional nesting under `queryPlan` within `winningPlan`. The examples remain valid and recognizable but readers on newer versions may see a slightly different structure.
- The post mixes mongosh syntax (e.g., `db.orders.find(...)`) and Node.js driver syntax (e.g., `await db.collection("orders").find(...)`) without clearly labeling which is which. This is not incorrect but could cause confusion for beginners.
