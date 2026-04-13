# Validation Summary: How to Create a Partial Index in MongoDB to Index a Subset of Documents

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (3.2+)
- MongoDB Partial Indexes (`partialFilterExpression`)
- MongoDB Index Types (sparse vs partial comparison)

## Sources Consulted
- MongoDB Official Documentation — Partial Indexes: https://www.mongodb.com/docs/manual/core/index-partial/
- MongoDB Official Documentation — partialFilterExpression supported operators (fact-partial-filter-expression-operators.rst)

## Issues Found

1. **`$ne` used in `partialFilterExpression` (not a supported operator)**
   - **What was wrong:** Two examples used `$ne` inside `partialFilterExpression`. The first used `{ phone: { $exists: true, $ne: null } }` and the second used `{ name: { $exists: true, $type: "string", $ne: "" } }`. The `$ne` operator is not supported in `partialFilterExpression` per MongoDB documentation, and these index creation calls would fail.
   - **What was changed:** Replaced `{ phone: { $exists: true, $ne: null } }` with `{ phone: { $type: "string" } }` which excludes null and missing fields by only matching string-typed values. Replaced `{ name: { $exists: true, $type: "string", $ne: "" } }` with `{ name: { $type: "string", $gt: "" } }` which uses the supported `$gt` operator to exclude empty strings.
   - **Why:** `$ne` is not listed among the supported operators for `partialFilterExpression` in the official MongoDB documentation. Only `$eq`, `$exists`, `$gt`, `$gte`, `$lt`, `$lte`, `$type`, `$and`, `$or`, and `$in` are supported.

2. **`$or` and `$in` incorrectly listed as "Not allowed" in `partialFilterExpression`**
   - **What was wrong:** The "Supported Expressions" section listed `$or` and `$in` under "Not allowed". The current MongoDB documentation lists both `$or` (top-level only) and `$in` as supported operators.
   - **What was changed:** Moved `$or` (with a note about top-level only) and `$in` to the "Allowed" list. Added `$ne` to the "Not allowed" list for clarity.
   - **Why:** The official MongoDB docs include `$or` and `$in` in the supported operators list for `partialFilterExpression`.

## Review Notes
- The overall structure and explanations in the post are solid and technically accurate aside from the issues fixed above.
- The partial vs sparse index comparison table is a helpful reference and is accurate.
- The explanation of when MongoDB will and won't use a partial index (query must imply the filter expression) is correct.
- The partial unique index example is correct and demonstrates a practical use case well.
