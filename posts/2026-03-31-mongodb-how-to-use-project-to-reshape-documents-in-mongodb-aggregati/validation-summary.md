# Validation Summary: How to Use $project to Reshape Documents in MongoDB Aggregation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Aggregation Framework
- `$project` pipeline stage
- Aggregation expressions (`$multiply`, `$gt`, `$size`, `$arrayElemAt`, `$map`, `$cond`, `$let`, `$toString`, `$concat`, `$divide`, `$subtract`)

## Sources Consulted
- MongoDB official documentation: `$project` aggregation stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/project/
- MongoDB official documentation: Aggregation Pipeline — https://www.mongodb.com/docs/manual/core/aggregation-pipeline/
- MongoDB official documentation: Aggregation Expression Operators — https://www.mongodb.com/docs/manual/reference/operator/aggregation/

## Issues Found
1. **Introductory code example mixed inclusion and exclusion**: The example in the "What Is the $project Stage?" section used `{ field1: 1, field2: 0, newField: "$existingField" }`, which mixes inclusion (`field1: 1`) and exclusion (`field2: 0`) in the same `$project`. MongoDB does not allow mixing inclusion and exclusion except for `_id`. This would produce an error at runtime. The post itself correctly states this rule in the very next section ("You cannot mix inclusion and exclusion in the same `$project`, except for `_id`"), making the intro example contradictory. **Fixed** by changing `field2: 0` to `field2: 1` so the example consistently uses inclusion.

## Review Notes
- All other code examples are syntactically correct and use valid MongoDB aggregation operators with proper syntax.
- The `$multiply` operator correctly accepts more than two arguments (e.g., three arguments in the tax calculation), which is valid.
- The `$let` example correctly uses `$$` prefix for user-defined variables.
- The explanation of inclusion/exclusion rules (cannot mix except for `_id`) is accurate.
- The `$unset` stage (available since MongoDB 4.2) is an alternative to exclusion-only `$project` but is not mentioned; this is fine as the post focuses specifically on `$project`.
