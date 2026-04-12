# Validation Summary: How to Use the update Command in MongoDB

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (shell methods: updateOne, updateMany, replaceOne, findOneAndUpdate)
- MongoDB update operators ($set, $unset, $inc, $mul, $min, $max, $rename, $currentDate, $setOnInsert)
- MongoDB array update operators ($, $[], $[<identifier>] with arrayFilters)

## Sources Consulted
- MongoDB Manual: db.collection.updateOne() — https://www.mongodb.com/docs/manual/reference/method/db.collection.updateOne/
- MongoDB Manual: db.collection.updateMany() — https://www.mongodb.com/docs/manual/reference/method/db.collection.updateMany/
- MongoDB Manual: db.collection.replaceOne() — https://www.mongodb.com/docs/manual/reference/method/db.collection.replaceOne/
- MongoDB Manual: db.collection.findOneAndUpdate() — https://www.mongodb.com/docs/manual/reference/method/db.collection.findOneAndUpdate/
- MongoDB Manual: Update Operators — https://www.mongodb.com/docs/manual/reference/operator/update/
- MongoDB Manual: Array Update Operators — https://www.mongodb.com/docs/manual/reference/operator/update-array/
- MongoDB Manual: $ (positional) operator — https://www.mongodb.com/docs/manual/reference/operator/update/positional/
- MongoDB Manual: $[] (all positional) operator — https://www.mongodb.com/docs/manual/reference/operator/update/positional-all/
- MongoDB Manual: $[<identifier>] (filtered positional) operator — https://www.mongodb.com/docs/manual/reference/operator/update/positional-filtered/

## Issues Found

### 1. Incorrect `findOneAndUpdate` option for MongoDB shell
- **What was wrong:** The `findOneAndUpdate` example used `{ returnDocument: "after" }`, which is the MongoDB Node.js driver syntax. Since the entire post uses `db.collection` shell syntax (mongosh), the correct option is `returnNewDocument: true`.
- **What was changed:** Replaced `{ returnDocument: "after" }` with `{ returnNewDocument: true }`.
- **Why:** The MongoDB shell method `db.collection.findOneAndUpdate()` accepts `returnNewDocument` (a boolean), not `returnDocument` (a string). Using `returnDocument: "after"` in the shell would be silently ignored, and the method would return the original (pre-update) document instead of the updated one.

### 2. Misleading comment on `$[]` operator
- **What was wrong:** The comment said "Update all matching array elements with $[]", implying `$[]` only updates elements that match some condition.
- **What was changed:** Changed comment to "Update all array elements with $[]".
- **Why:** The `$[]` operator is the "all positional" operator that updates every element in the array, not just matching ones. The conditional/filtered positional operator is `$[<identifier>]` used with `arrayFilters`, which is correctly demonstrated in the next section. The word "matching" in the original comment could confuse readers about the distinction between `$[]` and `$[<identifier>]`.

## Review Notes
- The post correctly covers the core MongoDB update operations and is well-structured as a quick reference.
- All update operator examples ($set, $unset, $inc, $mul, $min, $max, $rename, $currentDate) are syntactically correct and use proper MongoDB shell syntax.
- The upsert example correctly demonstrates `$setOnInsert` alongside `$inc`, which is a common and useful pattern.
- The `Checking Update Results` section references `upsertedCount` on a non-upsert operation — this is technically valid (it would be 0) but could be slightly confusing since the example doesn't use `upsert: true`.
