# Validation Summary: How to Use $merge with whenMatched and whenNotMatched Options in MongoDB

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (aggregation framework)
- `$merge` aggregation stage
- `whenMatched` and `whenNotMatched` options
- Aggregation pipeline variables (`$$new`, `$$ROOT`, `$$NOW`)

## Sources Consulted
- MongoDB official documentation: `$merge` aggregation stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/merge/
- MongoDB official documentation: Aggregation Variables — https://www.mongodb.com/docs/manual/reference/aggregation-variables/
- MongoDB official documentation: Updates with Aggregation Pipeline — https://www.mongodb.com/docs/manual/tutorial/update-documents-with-aggregation-pipeline/

## Issues Found
No technical issues found.

## Review Notes
- The post correctly identifies all five `whenMatched` options ("merge", "replace", "keepExisting", "fail", and custom pipeline array) and all three `whenNotMatched` options ("insert", "discard", "fail").
- The parenthetical mention of `$$ROOT` for referencing the existing document in the custom pipeline section (line 94) is technically accurate — within a `whenMatched` pipeline, `$$ROOT` resolves to the existing target document. The code examples correctly use the more common `$fieldName` shorthand (e.g., `$totalCount`) to reference existing document fields.
- The `$$NOW` system variable usage in the custom pipeline example is valid.
- The decision matrix is accurate and provides a useful quick-reference.
- All code examples use correct MongoDB aggregation syntax and would work as described.
