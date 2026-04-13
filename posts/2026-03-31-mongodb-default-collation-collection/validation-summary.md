# Validation Summary: How to Set Default Collation on a Collection in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (collation feature, `db.createCollection()`, `listCollections`, `$merge`, `renameCollection`)
- MongoDB Shell (mongosh)

## Sources Consulted
- MongoDB Manual: Collation — https://www.mongodb.com/docs/manual/reference/collation/
- MongoDB Manual: db.createCollection() — https://www.mongodb.com/docs/manual/reference/method/db.createCollection/
- MongoDB Manual: $out (Aggregation) — https://www.mongodb.com/docs/manual/reference/operator/aggregation/out/
- MongoDB Manual: $merge (Aggregation) — https://www.mongodb.com/docs/manual/reference/operator/aggregation/merge/
- MongoDB Manual: Collation and Index Use — https://www.mongodb.com/docs/manual/reference/collation/#collation-and-index-use
- MongoDB Manual: _id Index — https://www.mongodb.com/docs/manual/core/index-single/#_id-index

## Issues Found

1. **`$out` used incorrectly for migrating data to a new collection with different collation.**
   - **What was wrong:** The post recommended using `$out` to copy data into a pre-created collection (`customers_new`) with a new collation. However, `$out` atomically replaces the target collection — it drops the existing collection and recreates it from the aggregation output. This destroys the collation that was set when `customers_new` was created with `db.createCollection()`, defeating the purpose of the migration.
   - **What was changed:** Replaced `$out` with `$merge`, which inserts documents into an existing collection without replacing it, thereby preserving the target collection's collation and other options. Also updated the numbered step description from `$out` to `$merge`.
   - **Why:** `$merge` (available since MongoDB 4.2) writes documents into an existing collection while respecting the collection's existing configuration, making it the correct operator for this use case.

2. **`_id` limitation was slightly imprecise.**
   - **What was wrong:** The statement "_id comparisons always use binary comparison regardless of collection collation" implied something inherent about the `_id` field itself.
   - **What was changed:** Clarified that it is the `_id` index that is always created with simple (binary) collation, which is why `_id` lookups use binary comparison.
   - **Why:** The distinction matters: the binary comparison behavior comes from the index, not from a special property of the `_id` field. A collection scan filtering on `_id` would technically use the collection's collation, but since virtually all `_id` lookups use the `_id_` index, the practical effect is the same.

## Review Notes
- The `db.getCollectionInfos()` helper used in the "Verifying" section is available in both the legacy mongo shell and mongosh, so it is correct.
- The claim about time-series collections supporting default collation from MongoDB 6.0 could not be precisely verified against a changelog, but is consistent with the general expansion of time-series features in that release.
- The `renameCollection` usage (`db.customers_new.renameCollection("customers")`) is correct shell syntax.
- All collation strength values mentioned (2 for case-insensitive, 3 for case-sensitive) are accurate per the ICU collation specification used by MongoDB.
