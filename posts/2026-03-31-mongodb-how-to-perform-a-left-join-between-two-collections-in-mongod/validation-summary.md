# Validation Summary: How to Perform a Left Join Between Two Collections in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB aggregation framework (`$lookup`, `$unwind`, `$match`, `$project`, `$size`, `$sum`)
- MongoDB indexing (`createIndex`)
- MongoDB Node.js driver (`aggregate`, `toArray`)

## Sources Consulted
- MongoDB official documentation: `$lookup` aggregation stage (https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/)
- MongoDB official documentation: `$unwind` aggregation stage (https://www.mongodb.com/docs/manual/reference/operator/aggregation/unwind/)
- MongoDB official documentation: `$sum` accumulator in `$project` (https://www.mongodb.com/docs/manual/reference/operator/aggregation/sum/)
- MongoDB official documentation: `$size` array expression (https://www.mongodb.com/docs/manual/reference/operator/aggregation/size/)
- MongoDB Node.js driver documentation: `Collection.aggregate()` (https://www.mongodb.com/docs/drivers/node/current/)

## Issues Found
No technical issues found.

## Review Notes
- The "Filtering After the Join" section uses `preserveNullAndEmptyArrays: false`, which effectively converts the left join to an inner join for that example. This is technically correct and the explicit `false` makes the intent clear, but readers should note this difference.
- The `$sum` usage in `$project` (Count of Joined Documents section) relies on behavior available since MongoDB 3.2, where `$sum` can sum elements of an array expression. This is not explicitly noted but is widely supported in all current MongoDB versions.
- The `db.customers.createIndex({ _id: 1 })` line in the indexing section is redundant (as the post itself notes), but serves as a useful reminder for readers.
