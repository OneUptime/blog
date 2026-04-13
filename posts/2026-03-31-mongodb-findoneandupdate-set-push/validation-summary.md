# Validation Summary: How to Use findOneAndUpdate with $set and $push Together in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (server-side update operators: `$set`, `$push`, `$addToSet`, `$each`, `$slice`)
- MongoDB Node.js Driver (`findOneAndUpdate`, `returnDocument` option)
- Mongoose ODM (`new` and `select` options)

## Sources Consulted
- MongoDB official documentation: `db.collection.findOneAndUpdate()` — https://www.mongodb.com/docs/manual/reference/method/db.collection.findOneAndUpdate/
- MongoDB official documentation: `$set` operator — https://www.mongodb.com/docs/manual/reference/operator/update/set/
- MongoDB official documentation: `$push` operator — https://www.mongodb.com/docs/manual/reference/operator/update/push/
- MongoDB official documentation: `$addToSet` operator — https://www.mongodb.com/docs/manual/reference/operator/update/addToSet/
- MongoDB official documentation: `$each` modifier — https://www.mongodb.com/docs/manual/reference/operator/update/each/
- MongoDB official documentation: `$slice` modifier — https://www.mongodb.com/docs/manual/reference/operator/update/slice/
- MongoDB Node.js Driver documentation — https://www.mongodb.com/docs/drivers/node/current/
- Mongoose documentation: `Model.findOneAndUpdate()` — https://mongoosejs.com/docs/api/model.html#Model.findOneAndUpdate()

## Issues Found
No technical issues found.

## Review Notes
- The post correctly uses `returnDocument: 'after'` for native driver examples and `{ new: true }` for the Mongoose example. These are the correct option names for their respective libraries.
- The `upsert: false` in the nested fields example is redundant (it is the default) but not incorrect. This is a stylistic choice rather than an error.
- The null-check pattern (`if (!result)`) is correct for MongoDB Node.js driver v4+ and Mongoose. Older driver versions (pre-v4) returned a result object with a `value` property, but the post targets current APIs so this is not an issue.
- The `$slice: -100` usage correctly keeps the last 100 entries (negative values retain from the tail). This is a good pattern for preventing unbounded array growth.
