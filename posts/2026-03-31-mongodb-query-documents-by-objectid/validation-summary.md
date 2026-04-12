# Validation Summary: How to Query Documents by ObjectId in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (BSON ObjectId type)
- mongosh (MongoDB Shell)
- Node.js MongoDB official driver (`mongodb` npm package)
- JavaScript

## Sources Consulted
- MongoDB ObjectId specification: https://www.mongodb.com/docs/manual/reference/bson-types/#objectid
- MongoDB Node.js Driver API — ObjectId: https://mongodb.github.io/node-mongodb-native/6.0/classes/BSON.ObjectId.html
- mongosh built-in methods: https://www.mongodb.com/docs/mongodb-shell/reference/methods/
- MongoDB Query Documents: https://www.mongodb.com/docs/manual/tutorial/query-documents/

## Issues Found
1. **Incorrect `require` in mongosh example (lines 25-26)**: The "Basic Query by _id" code block was labeled "In mongosh" but included `const { ObjectId } = require("mongodb");`, which is a Node.js driver import. In mongosh, `ObjectId` is a built-in global and does not need to be imported. Removed the `require` line and clarified the comment to note that `ObjectId` is a built-in global in mongosh.

## Review Notes
- The ObjectId 12-byte breakdown (4-byte timestamp, 5-byte random value, 3-byte counter) matches the current spec (MongoDB 3.4+). Prior to 3.4 the middle bytes were machine ID + process ID; the post does not mention version differences, which is fine for a modern tutorial.
- The `ObjectId.isValid()` double-check pattern (`String(new ObjectId(id)) === id`) is a well-known best practice since `isValid()` alone can return `true` for some unexpected 12-character strings.
- `ObjectId.createFromTime()` usage is correct for both mongosh and the Node.js driver.
- All example ObjectId hex strings are valid 24-character hex (12 bytes).
- All code examples are syntactically correct and use current, non-deprecated APIs.
