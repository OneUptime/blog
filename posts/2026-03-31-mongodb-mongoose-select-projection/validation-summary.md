# Validation Summary: How to Use Mongoose Select and Projection

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (projection operators, `$project` aggregation stage, `$size` operator)
- Mongoose (`.select()`, `.populate()`, `.lean()`, schema-level `select: false`, `.aggregate()`)
- Node.js / JavaScript (async/await)

## Sources Consulted
- Mongoose official docs: Query.prototype.select() — https://mongoosejs.com/docs/api/query.html#Query.prototype.select()
- Mongoose official docs: SchemaType select option — https://mongoosejs.com/docs/schematypes.html
- Mongoose official docs: Query.prototype.populate() — https://mongoosejs.com/docs/api/query.html#Query.prototype.populate()
- Mongoose official docs: Query.prototype.lean() — https://mongoosejs.com/docs/tutorials/lean.html
- MongoDB official docs: Project Fields to Return from Query — https://www.mongodb.com/docs/manual/tutorial/project-fields-from-query-results/
- MongoDB official docs: $project aggregation stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/project/
- MongoDB official docs: $size aggregation operator — https://www.mongodb.com/docs/manual/reference/operator/aggregation/size/

## Issues Found
No technical issues found.

## Review Notes
- All code examples use correct, current Mongoose and MongoDB APIs.
- The rule about not mixing inclusion and exclusion (except `_id`) is correctly stated and demonstrated.
- The `+` prefix for overriding `select: false` is correctly explained and shown.
- The `$project` aggregation example correctly demonstrates computed fields (`$size`), field renaming (`orderId: '$_id'`), and `_id` suppression.
- The `.lean()` description accurately conveys its behavior and trade-offs.
- None of the APIs shown are deprecated as of Mongoose 8.x.
