# Validation Summary: How to Create a Unique Index in MongoDB to Enforce Uniqueness

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (unique indexes, sparse indexes, partial indexes)
- MongoDB Shell (`mongosh`) commands
- Node.js MongoDB driver (error handling)

## Sources Consulted
- MongoDB Manual: Unique Indexes — https://www.mongodb.com/docs/manual/core/index-unique/
- MongoDB Manual: Sparse Indexes — https://www.mongodb.com/docs/manual/core/index-sparse/
- MongoDB Manual: Partial Indexes — https://www.mongodb.com/docs/manual/core/index-partial/
- MongoDB Manual: createIndex() — https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB Manual: Write Concern / Duplicate Key Errors (E11000) — https://www.mongodb.com/docs/manual/core/write-operations-atomicity/

## Issues Found

### 1. Incorrect claim about sparse unique indexes and null values
**What was wrong:** The "Unique Index with null Values" section stated that a sparse unique index allows multiple documents with `phone: null`. This is incorrect. A sparse index only excludes documents where the indexed field is entirely missing from the document. Documents with an explicit `null` value for the field still have the field present (in BSON), so they are included in the sparse index and the uniqueness constraint still applies.

**What was changed:**
- Corrected the sparse index comment to clarify it only helps with documents that omit the field entirely, not those with explicit `null` values.
- Added an example showing that a missing field is also treated as null in a non-sparse unique index.
- Added the correct modern solution: a partial index with `partialFilterExpression: { phone: { $type: "string" } }`, which enforces uniqueness only when the phone field contains a string value, allowing multiple documents with null or missing phone.

### 2. Incorrect claim in Summary section
**What was wrong:** The Summary stated "Combine with `sparse: true` to allow multiple null values," which reinforces the incorrect claim from the null values section.

**What was changed:** Updated to reference `partialFilterExpression` as the mechanism for handling null/missing values, removing the inaccurate sparse index recommendation.

## Review Notes
- The `sparse` index option is not deprecated but is largely superseded by partial indexes for most use cases. The MongoDB documentation recommends partial indexes over sparse indexes for new applications.
- The error handling example using `e.message.includes("email")` to detect which field caused a duplicate key error works but is fragile — the index name format could vary. The Node.js driver example using `error.keyPattern` is more robust.
- All other code examples, error codes, aggregation pipelines, and API usage are correct and current.
