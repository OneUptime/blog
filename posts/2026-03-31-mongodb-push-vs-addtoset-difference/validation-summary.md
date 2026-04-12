# Validation Summary: What Is the Difference Between $push and $addToSet in MongoDB

## Status
validated

## Post Type
Tutorial / Reference comparison

## Technologies Covered
- MongoDB (update operators: `$push`, `$addToSet`, `$each`, `$sort`, `$slice`)
- MongoDB Shell / JavaScript driver (`db.collection.updateOne`)

## Sources Consulted
- MongoDB official documentation: `$push` update operator (https://www.mongodb.com/docs/manual/reference/operator/update/push/)
- MongoDB official documentation: `$addToSet` update operator (https://www.mongodb.com/docs/manual/reference/operator/update/addToSet/)
- MongoDB official documentation: `$each` modifier (https://www.mongodb.com/docs/manual/reference/operator/update/each/)
- MongoDB official documentation: `$sort` modifier (https://www.mongodb.com/docs/manual/reference/operator/update/sort/)
- MongoDB official documentation: `$slice` modifier (https://www.mongodb.com/docs/manual/reference/operator/update/slice/)

## Issues Found
No technical issues found.

## Review Notes
- The overview describes `$addToSet` as making the array behave like "a set (unordered, unique values only)." This refers to the abstract data structure concept, not the storage order — MongoDB arrays maintained via `$addToSet` still preserve insertion order. The phrasing is acceptable in context but readers should understand the array itself remains ordered.
- The object equality section correctly notes that field order matters for embedded document comparison in `$addToSet`. This is a common pitfall and is well-documented here.
- All code examples use the current `updateOne` API and correct operator syntax compatible with MongoDB 4.x through 8.x.
