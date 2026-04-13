# Validation Summary: How to Use $nor to Exclude Multiple Conditions in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (`$nor` query operator, `$nin`, `$exists`, `$match`, `$project`)
- Node.js (MongoDB Node.js driver)
- Python (PyMongo)
- MongoDB Aggregation Pipeline

## Sources Consulted
- MongoDB official documentation: `$nor` query operator (https://www.mongodb.com/docs/manual/reference/operator/query/nor/)
- MongoDB official documentation: `$nin` query operator (https://www.mongodb.com/docs/manual/reference/operator/query/nin/)
- MongoDB official documentation: `$not` aggregation expression (https://www.mongodb.com/docs/manual/reference/operator/aggregation/not/)
- MongoDB official documentation: `$or` aggregation expression (https://www.mongodb.com/docs/manual/reference/operator/aggregation/or/)
- MongoDB official documentation: `$exists` query operator (https://www.mongodb.com/docs/manual/reference/operator/query/exists/)

## Issues Found

1. **Incorrect `$exists` usage inside `$nor` for "strict" field check (lines 98-103)**
   - **What was wrong:** The "strict" example wrapped `$exists: true` and `$eq: true` together inside each `$nor` condition, claiming this restricts results to only documents where the fields exist. However, placing `$exists: true` inside the `$nor` conditions does not change behavior — a document missing the `archived` field would fail `{ archived: true }` regardless of whether `$exists` is included, so `$nor` includes it either way. Both queries behave identically with respect to missing fields.
   - **What was changed:** Moved the `$exists: true` checks outside of `$nor` as separate top-level conditions using implicit AND. This correctly restricts the result set to only documents where both `archived` and `deleted` fields exist, while `$nor` then excludes those where either field is `true`.
   - **Why:** The `$exists` constraints must be applied independently (via implicit AND) so they filter out documents with missing fields before `$nor` evaluates.

2. **`$nor` used as an aggregation expression inside `$project` (lines 126-139)**
   - **What was wrong:** The post used `$nor` inside a `$project` stage as a boolean aggregation expression. `$nor` is a query operator only — it works inside `find()` and `$match`, but it is not a valid aggregation expression operator. Using it inside `$project` would produce an error.
   - **What was changed:** Replaced `$nor: [...]` with `$not: [{ $or: [...] }]`, which is the correct way to express NOR logic using aggregation expression operators.
   - **Why:** MongoDB aggregation expressions have their own set of boolean operators (`$and`, `$or`, `$not`), and `$nor` is not among them. The equivalent is `$not` wrapping `$or`.

## Review Notes
- The comparison table stating `$nin` has "better index utilization" than `$nor` for single-field exclusion is a reasonable general guideline, though actual index usage depends on the query planner and data distribution.
- The `$nor` vs `$nin` equivalence claim for single-field exclusion is correct — both handle missing fields the same way (including documents where the field is absent).
- All PyMongo examples are syntactically correct and idiomatic.
