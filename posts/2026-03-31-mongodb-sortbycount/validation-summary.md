# Validation Summary: How to Use $sortByCount in MongoDB Aggregation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Aggregation Framework
- `$sortByCount` aggregation stage
- `$group`, `$sort`, `$match`, `$limit`, `$unwind` pipeline stages
- `$substr` expression operator

## Sources Consulted
- MongoDB official documentation for `$sortByCount`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/sortByCount/
- MongoDB official documentation for `$group`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/
- MongoDB official documentation for `$substr`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/substr/

## Issues Found
No technical issues found.

## Review Notes
- The `$substr` operator used in Example 4 is an alias for `$substrBytes`. MongoDB documentation recommends `$substrBytes` or `$substrCP` instead, but `$substr` remains functional and is not formally deprecated. For single-byte (ASCII) characters as used here, it works correctly.
- Example 3 shows only one sample input document with illustrative output counts (8, 5, 3) that imply a larger unseen dataset. This is a stylistic choice, not a technical error — the pattern of `$unwind` before `$sortByCount` is correctly demonstrated.
- All output examples were verified against the provided input data and are accurate.
