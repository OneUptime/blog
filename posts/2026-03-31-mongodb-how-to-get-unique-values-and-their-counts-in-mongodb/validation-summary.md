# Validation Summary: How to Get Unique Values and Their Counts in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (shell/mongosh commands)
- MongoDB Aggregation Framework (`$group`, `$sort`, `$limit`, `$project`, `$unwind`, `$match`)
- `distinct()` method
- Accumulator operators (`$sum`, `$avg`, `$max`, `$push`)
- Arithmetic expression operators (`$divide`, `$multiply`, `$round`)

## Sources Consulted
- MongoDB official documentation: `db.collection.distinct()` — https://www.mongodb.com/docs/manual/reference/method/db.collection.distinct/
- MongoDB official documentation: `$group` aggregation stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/
- MongoDB official documentation: `$unwind` aggregation stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/unwind/
- MongoDB official documentation: `$project` aggregation stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/project/
- MongoDB official documentation: `$sort` aggregation stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/sort/
- MongoDB official documentation: `$round` aggregation operator — https://www.mongodb.com/docs/manual/reference/operator/aggregation/round/

## Issues Found
No technical issues found.

## Review Notes
- All code examples use correct and current MongoDB syntax compatible with modern MongoDB versions (4.x+).
- The `distinct()` method signature with optional query filter is correct.
- The percentage distribution pipeline is a well-constructed pattern using a second `$group` with `_id: null` to compute totals, then `$push` to preserve per-group data, followed by `$unwind` and `$project` — this is idiomatic and correct.
- The `$round` operator used in the percentage calculation requires MongoDB 4.2+, which is worth noting but not an issue given current MongoDB versions.
- All aggregation accumulator operators (`$sum`, `$avg`, `$max`, `$push`) are used correctly within `$group` stages.
