# Validation Summary: How to Use $project Stage in MongoDB Aggregation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Aggregation Framework
- `$project` stage
- Aggregation expressions: `$concat`, `$multiply`, `$divide`, `$avg`, `$max`, `$cond`, `$gte`

## Sources Consulted
- MongoDB official documentation: `$project` aggregation stage (https://www.mongodb.com/docs/manual/reference/operator/aggregation/project/)
- MongoDB official documentation: `$concat` (https://www.mongodb.com/docs/manual/reference/operator/aggregation/concat/)
- MongoDB official documentation: `$avg` (https://www.mongodb.com/docs/manual/reference/operator/aggregation/avg/)
- MongoDB official documentation: `$cond` (https://www.mongodb.com/docs/manual/reference/operator/aggregation/cond/)
- MongoDB official documentation: Aggregation Pipeline (https://www.mongodb.com/docs/manual/core/aggregation-pipeline/)

## Issues Found
- **Inaccurate `avgScore` for Bob in Example 5**: The output showed `avgScore: 84.33` for Bob, but MongoDB returns full floating-point precision. The correct value is `84.33333333333333` since (70 + 88 + 95) / 3 = 253 / 3 = 84.333... repeating. Fixed the output to reflect the actual MongoDB result.

## Review Notes
- All aggregation operators used (`$concat`, `$multiply`, `$divide`, `$avg`, `$max`, `$cond`, `$gte`) are current and non-deprecated.
- The use of `$avg` and `$max` directly on array fields within `$project` is valid since MongoDB 3.2+.
- The post correctly notes that `_id` is included by default and must be explicitly excluded.
- The post correctly avoids mixing inclusion (1) and exclusion (0) in the same `$project` spec (except for `_id: 0`, which is always allowed).
- Example 6 uses a different collection (`db.users`) with a different document shape, which is clearly noted in the comment. This is fine for illustrating nested field projection.
