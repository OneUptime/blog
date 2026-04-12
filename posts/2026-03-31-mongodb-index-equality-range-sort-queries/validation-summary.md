# Validation Summary: How to Index for Equality + Range + Sort Queries in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (compound indexes, query optimizer, explain plans)
- MongoDB Shell (mongosh) — `createIndex()`, `find()`, `sort()`, `explain()`

## Sources Consulted
- MongoDB Manual: Equality, Sort, Range rule — https://www.mongodb.com/docs/manual/tutorial/equality-sort-range-rule/
- MongoDB Manual: Compound Indexes — https://www.mongodb.com/docs/manual/core/indexes/index-types/index-compound/
- MongoDB Manual: explain() results — https://www.mongodb.com/docs/manual/reference/explain-results/
- MongoDB Manual: Sort and Index Use — https://www.mongodb.com/docs/manual/tutorial/sort-results-with-indexes/

## Issues Found
- **"Wrong Index Order" section claimed a SORT stage that would not occur.** The original text stated that the index `{ status: 1, createdAt: -1, plan: 1 }` causes an in-memory `SORT` stage for the example query. This is incorrect when the sort and range are on the **same field** (`createdAt`). After the equality match on `status`, the index entries are already ordered by `createdAt` descending, which matches the query's sort direction — so MongoDB can use the index for the sort without an in-memory SORT stage. The real problem with this index is that the equality field `plan` is positioned after the sort/range field, preventing MongoDB from using it to narrow the index scan. This results in more index entries examined (higher `totalDocsExamined` relative to `nReturned`), not a SORT stage. Fixed the comment and explanation to accurately describe the suboptimality.

## Review Notes
- The ESR rule explanation, the "Range on a Different Field" section, and the "Sort Direction Must Match" section are all technically correct and well-explained.
- The "Range on a Different Field" example (`{ status: 1, name: 1, age: 1 }` for sort on `name` with range on `age`) is actually the more canonical ESR scenario where placing range before sort WOULD cause a SORT stage. This section correctly illustrates the rule.
- The explain output shown in "Verify with explain()" is a simplified representation (real output is nested under `queryPlanner` and `executionStats` top-level keys), but this is a reasonable simplification for a blog post and doesn't mislead the reader.
- The reversed-index example in "Sort Direction Must Match" correctly notes that `{ status: -1, name: -1, createdAt: 1 }` can be scanned backwards to match `{ name: 1, createdAt: -1 }` sort order.
