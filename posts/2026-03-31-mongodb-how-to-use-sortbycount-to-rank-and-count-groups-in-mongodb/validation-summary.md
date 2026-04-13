# Validation Summary: How to Use $sortByCount to Rank and Count Groups in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB aggregation framework
- `$sortByCount` aggregation stage
- Related stages: `$group`, `$sort`, `$unwind`, `$match`, `$limit`, `$project`
- MongoDB shell (`mongosh`)

## Sources Consulted
- MongoDB official documentation for `$sortByCount`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/sortByCount/
- MongoDB official documentation for `$group`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/
- MongoDB aggregation pipeline documentation: https://www.mongodb.com/docs/manual/core/aggregation-pipeline/

## Issues Found
No technical issues found.

## Review Notes
- The equivalence between `$sortByCount` and the `$group` + `$sort` combination is accurately described and matches official MongoDB documentation.
- All code examples use correct MongoDB shell syntax and valid aggregation pipeline patterns.
- The use of expressions (e.g., `$dateToString`, `$toLower`) with `$sortByCount` is correctly demonstrated — the stage does accept any valid aggregation expression, not just field path references.
- The output format showing `_id` and `count` fields is accurate for `$sortByCount` output documents.
- The advice about when to use `$group` directly (when additional accumulators are needed) is sound and practical.
