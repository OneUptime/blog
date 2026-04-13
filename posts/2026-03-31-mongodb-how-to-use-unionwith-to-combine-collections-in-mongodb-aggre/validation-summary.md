# Validation Summary: How to Use $unionWith to Combine Collections in MongoDB Aggregation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (4.4+)
- MongoDB Aggregation Framework
- `$unionWith` aggregation stage

## Sources Consulted
- MongoDB official documentation for `$unionWith`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/unionWith/

## Issues Found

### 1. Cross-Database Union section showed non-existent `db` parameter
**What was wrong:** The "Cross-Database Union" section presented a code example using `{ $unionWith: { coll: "customers", db: "db2" } }`, implying that `$unionWith` supports a `db` field for cross-database unions. According to the official MongoDB documentation, `$unionWith` only accepts two fields: `coll` and `pipeline`. There is no `db` parameter, and `$unionWith` only works within the same database.

**What was changed:** Replaced the entire section with a "Same-Database Limitation" note that clarifies `$unionWith` is restricted to same-database collections and suggests alternatives (`$lookup` with cross-database support or application-level merging) for cross-database scenarios.

### 2. Incorrect sharded collection restriction
**What was wrong:** The Restrictions section stated: "`$unionWith` cannot reference a sharded collection as the secondary collection (the primary can be sharded)." This is inaccurate for general usage. According to the official documentation, this restriction only applies when `$unionWith` is nested inside a `$lookup` subquery pipeline.

**What was changed:** Corrected the restriction to specify that the sharded collection limitation only applies when `$unionWith` is nested inside a `$lookup` subquery, and that top-level `$unionWith` can reference sharded collections without restriction.

## Review Notes
- All code examples (aside from the removed cross-database one) use correct MongoDB aggregation syntax.
- The deduplication pattern using `$group` + `$first` + `$replaceRoot` is a valid and common approach.
- The post correctly identifies `$unionWith` as equivalent to SQL `UNION ALL` (not `UNION DISTINCT`).
- The `$sortByCount` usage in the time-partitioned example is correct syntactic sugar for `$group` + `$sort`.
