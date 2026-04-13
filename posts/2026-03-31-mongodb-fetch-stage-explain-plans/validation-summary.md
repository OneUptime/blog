# Validation Summary: How to Identify Fetch Stage Problems in MongoDB Explain Plans

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (query execution engine, explain plans)
- MongoDB indexes (IXSCAN, covered queries)
- MongoDB Shell (mongosh) commands

## Sources Consulted
- MongoDB official documentation: `db.collection.find()` method signature — the second parameter is the projection document directly, not wrapped in a `{ projection: ... }` options object (that syntax is specific to the Node.js driver)
- MongoDB official documentation: Explain Results — `winningPlan`, `executionStats`, stage names (`FETCH`, `IXSCAN`, `PROJECTION_SIMPLE`, `PROJECTION_COVERED`)
- MongoDB official documentation: Covered Queries — requires all queried and projected fields to be in the index, and `_id` must be excluded or included in the index
- MongoDB official documentation: Index usage with `$regex`, `$where`

## Issues Found
1. **Incorrect `find()` projection syntax for mongo shell** (two occurrences):
   - **What was wrong:** The code examples used `{ projection: { amount: 1, status: 1 } }` as the second argument to `db.orders.find()`. In the mongo shell / mongosh, the second parameter is the projection document directly (e.g., `{ amount: 1, status: 1 }`). The `{ projection: { ... } }` wrapper is Node.js driver syntax. In the shell, this would attempt to include a field literally named "projection" rather than projecting the intended fields.
   - **What was changed:** Removed the `projection:` wrapper in both `find()` calls, changing them to pass the projection fields directly.
   - **Why:** To ensure the code examples actually work as described when run in the MongoDB shell.

## Review Notes
- The claim that `$regex` "requires full document access" is a slight oversimplification. Prefix regex patterns (e.g., `/^abc/`) can use indexes efficiently via IXSCAN. However, non-prefix regex patterns do require scanning and the point is valid in the general context of the article.
- The explain output examples are simplified for clarity (e.g., `winningPlan` would normally be nested under `queryPlanner`). This is acceptable for a tutorial focused on the FETCH stage concept.
- The "33x amplification factor" (500/15) is correct arithmetic.
- The covered query example correctly excludes `_id` with `_id: 0`, which is necessary since `_id` is not part of the compound index.
