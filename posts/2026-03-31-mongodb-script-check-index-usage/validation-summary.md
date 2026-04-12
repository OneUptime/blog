# Validation Summary: How to Write a Script to Check MongoDB Index Usage

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (`$indexStats` aggregation stage, `explain()`, index management)
- Python 3 with PyMongo
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB `$indexStats` documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/indexStats/
- MongoDB `explain()` documentation: https://www.mongodb.com/docs/manual/reference/method/db.collection.explain/
- MongoDB Explain Results documentation (classic vs SBE engine): https://www.mongodb.com/docs/manual/reference/explain-results/
- PyMongo documentation: https://pymongo.readthedocs.io/en/stable/

## Issues Found

1. **mongosh one-liner: `stat.key` printed as `[object Object]`** (line 111)
   - **What was wrong:** The mongosh snippet used string concatenation (`+ stat.key +`) to print the index key. Since `stat.key` is a JavaScript object, the `+` operator calls `toString()` on it, producing `[object Object]` instead of the actual key specification.
   - **What was changed:** Replaced `stat.key` with `tojson(stat.key)` to properly serialize the object for display.
   - **Why:** `tojson()` is a built-in mongosh helper that serializes objects to a readable JSON string.

2. **`explain()` COLLSCAN check incompatible with SBE engine** (line 126)
   - **What was wrong:** The code checked `plan.queryPlanner.winningPlan.stage === "COLLSCAN"`, which only works with MongoDB's classic query engine. Starting with MongoDB 5.1+, queries using the Slot-Based Execution (SBE) engine place the stage at `winningPlan.queryPlan.stage` instead.
   - **What was changed:** Added a fallback that checks `winningPlan.queryPlan?.stage` first (SBE path), falling back to `winningPlan.stage` (classic path).
   - **Why:** This ensures the COLLSCAN detection works across both the classic and SBE execution engines.

## Review Notes
- `datetime.utcnow()` in the Python script is deprecated since Python 3.12 in favor of `datetime.now(datetime.UTC)`. It still functions correctly but emits a deprecation warning on Python 3.12+. Not fixed since the code runs correctly and the post focuses on MongoDB, not Python datetime best practices.
- The `$indexStats` example output omits fields that are present in real output (`host`, `spec`, `shard`, `building`). This is an acceptable simplification since the script only uses `name`, `key`, and `accesses`.
- The "Generating a Drop Command" Python snippet references an `unused` variable from the main script but is shown as a standalone code block. Context makes this clear, but it could confuse readers who try to run it independently.
