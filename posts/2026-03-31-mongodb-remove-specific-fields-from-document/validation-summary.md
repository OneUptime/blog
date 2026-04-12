# Validation Summary: How to Remove Specific Fields from a Document in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (shell/JavaScript driver)
- MongoDB Update Operators (`$unset`)
- MongoDB Query Projection
- MongoDB Aggregation Pipeline (`$project`, `$addFields`, `$replaceWith`, `$map`, `$unsetField`)
- MongoDB System Variables (`$$REMOVE`, `$$ROOT`)

## Sources Consulted
- MongoDB $unset update operator documentation: https://www.mongodb.com/docs/manual/reference/operator/update/unset/
- MongoDB projection documentation: https://www.mongodb.com/docs/manual/tutorial/project-fields-from-query-results/
- MongoDB $project aggregation stage: https://www.mongodb.com/docs/manual/reference/operator/aggregation/project/
- MongoDB aggregation variables ($$REMOVE): https://www.mongodb.com/docs/manual/reference/aggregation-variables/
- MongoDB $objectToArray: https://www.mongodb.com/docs/manual/reference/operator/aggregation/objectToArray/
- MongoDB $arrayToObject: https://www.mongodb.com/docs/manual/reference/operator/aggregation/arrayToObject/
- MongoDB $unsetField: https://www.mongodb.com/docs/manual/reference/operator/aggregation/unsetField/
- MongoDB $replaceWith: https://www.mongodb.com/docs/manual/reference/operator/aggregation/replaceWith/

## Issues Found
- **Incorrect mention of `$$REMOVE` in "Removing Fields Based on Value" section**: The introductory sentence stated "Remove fields that have a null or empty value using `$$REMOVE`:" but the code example does not use `$$REMOVE` at all. It uses the `$objectToArray` / `$filter` / `$arrayToObject` pattern instead. Fixed the sentence to accurately describe the technique used.

## Review Notes
- All code examples are syntactically correct and use valid MongoDB APIs.
- `$unsetField` (used in the embedded arrays section) requires MongoDB 5.0+. The post does not mention version requirements, which could be noted in a future update.
- `$replaceWith` requires MongoDB 4.2+.
- `$$REMOVE` requires MongoDB 3.6+.
- The claim that `$unset` ignores the specified value is confirmed by official docs.
- The projection mixing rule (cannot mix inclusion and exclusion except for `_id`) is accurate.
- The `$objectToArray`/`$arrayToObject` pattern for filtering null-valued fields is a well-known and correct approach.
