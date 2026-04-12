# Validation Summary: How to Use $unionWith in MongoDB Aggregation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (4.4+)
- MongoDB Aggregation Framework
- `$unionWith` aggregation stage
- Related stages: `$group`, `$sort`, `$match`, `$project`, `$addFields`, `$addToSet`

## Sources Consulted
- MongoDB official documentation for `$unionWith`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/unionWith/
- MongoDB official documentation for `$lookup`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/
- MongoDB official documentation for `$group`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/
- MongoDB official documentation for `$project`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/project/

## Issues Found
No technical issues found.

## Review Notes
- The comparison table describes `$lookup` match condition as "On field equality." Since MongoDB 3.6, `$lookup` also supports a pipeline-based syntax for more complex join conditions beyond simple field equality. This is a simplification but acceptable for a brief comparison table.
- The official documentation notes that document order in `$unionWith` results is unspecified. The example outputs show documents from the first collection followed by the second, which is the typical observed behavior but not guaranteed. This is standard tutorial practice and does not require a correction.
- The post does not mention that `$unionWith` cannot be used inside transactions or that sub-pipelines cannot contain `$out` or `$merge` stages. These are edge-case restrictions that could be useful additions in the future but are not errors in the current content.
