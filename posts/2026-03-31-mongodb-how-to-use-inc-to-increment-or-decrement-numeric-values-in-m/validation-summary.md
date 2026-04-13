# Validation Summary: How to Use $inc to Increment or Decrement Numeric Values in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (update operators, `$inc`, `$set`, `$setOnInsert`)
- MongoDB Shell (mongosh)
- JavaScript

## Sources Consulted
- MongoDB official documentation: `$inc` operator — https://www.mongodb.com/docs/manual/reference/operator/update/inc/
- MongoDB official documentation: `db.collection.updateOne()` — https://www.mongodb.com/docs/manual/reference/method/db.collection.updateOne/
- MongoDB official documentation: `db.collection.findOneAndUpdate()` — https://www.mongodb.com/docs/manual/reference/method/db.collection.findOneAndUpdate/
- MongoDB official documentation: `$setOnInsert` — https://www.mongodb.com/docs/manual/reference/operator/update/setOnInsert/
- MongoDB official documentation: Atomicity and Transactions — https://www.mongodb.com/docs/manual/core/write-operations-atomicity/

## Issues Found
No technical issues found.

## Review Notes
- All code examples use correct and current mongosh syntax.
- The `findOneAndUpdate` example correctly uses `returnDocument: "after"`, which is the current option for mongosh and the Node.js driver v4+. Older driver versions used `returnOriginal: false`, but the post's usage is up to date.
- The floating point precision warning for financial calculations is a good inclusion.
- The race condition example clearly illustrates the value of `$inc` over client-side read-modify-write patterns.
