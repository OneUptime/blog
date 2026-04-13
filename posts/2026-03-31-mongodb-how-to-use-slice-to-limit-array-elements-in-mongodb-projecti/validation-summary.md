# Validation Summary: How to Use $slice to Limit Array Elements in MongoDB Projections

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB `$slice` projection operator
- MongoDB `$slice` aggregation expression operator
- MongoDB `find()` and `findOne()` query projections
- MongoDB aggregation pipeline (`$project`, `$size`)

## Sources Consulted
- MongoDB official documentation: `$slice` (projection) — https://www.mongodb.com/docs/manual/reference/operator/projection/slice/
- MongoDB official documentation: `$slice` (aggregation) — https://www.mongodb.com/docs/manual/reference/operator/aggregation/slice/
- MongoDB official documentation: Project Fields to Return from Query — https://www.mongodb.com/docs/manual/tutorial/project-fields-from-query-results/

## Issues Found
1. **Incorrect claim about negative skip values**: The Limitations section stated "Negative skip values are not supported in the `[skip, limit]` form." This is incorrect. MongoDB explicitly supports negative skip values in the `[skip, limit]` form — a negative skip counts from the end of the array. For example, `$slice: [-3, 2]` starts 3 positions from the end and returns up to 2 elements. Fixed the bullet point to correctly describe this behavior.

## Review Notes
- All code examples use correct syntax and would produce the expected results.
- The aggregation `$slice` example correctly uses the expression form `$slice: ["$comments", -5]` which differs from the projection form.
- The distinction between projection `$slice` and aggregation `$slice` is correctly noted.
- The note about not combining `$slice` with `$elemMatch` on the same field is accurate.
