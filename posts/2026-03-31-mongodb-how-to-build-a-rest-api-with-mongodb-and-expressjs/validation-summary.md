# Validation Summary: How to Build a REST API with MongoDB and Express.js

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (Node.js driver 6.x)
- Express.js
- Node.js
- dotenv
- nodemon

## Sources Consulted
- MongoDB Node.js Driver documentation: https://www.mongodb.com/docs/drivers/node/current/
- MongoDB ObjectId specification: https://www.mongodb.com/docs/manual/reference/method/ObjectId/
- Express.js API reference: https://expressjs.com/en/api.html
- Express.js error handling guide: https://expressjs.com/en/guide/error-handling.html
- MongoDB CRUD operations: https://www.mongodb.com/docs/drivers/node/current/fundamentals/crud/

## Issues Found
1. **Invalid ObjectId in curl examples**: The example ObjectId `64abc123def456789012345` was only 23 hex characters. MongoDB ObjectIds must be exactly 24 hex characters (12 bytes). This would cause a `BSONError` at runtime when passed to `new ObjectId()`. Fixed by changing to `64abc123def4567890123456` (24 characters) in all three curl examples (GET single user, PATCH, DELETE).

2. **Unquoted URL with `&` in curl command**: The list users curl command `curl http://localhost:3000/api/users?page=1&limit=10` had an unquoted `&`, which in bash/zsh would background the `curl` process at the `&` and then try to execute `limit=10` as a separate command. Fixed by wrapping the URL in double quotes.

## Review Notes
- The code uses `findOneAndUpdate` returning the document directly (checking `if (!result)`), which is correct for mongodb driver 6.x. In driver 5.x, the return value was `{ value: document }` and the check would need to be `if (!result.value)`. Since `npm install mongodb` installs 6.x by default, this is correct for new projects.
- The `client.connect()` call is explicit, which is good practice even though mongodb driver 6.x establishes connections lazily. Explicit connect allows catching connection errors at startup.
- The `ObjectId` constructor will throw on invalid hex strings, which the try/catch blocks handle by forwarding to the error handler. A more user-friendly approach would validate the ID format before constructing the ObjectId, but the current approach is functional.
- The pagination uses `countDocuments()` without a filter, which scans the full collection. For large collections, `estimatedDocumentCount()` would be faster but less precise. The current approach is correct for the scope of this tutorial.
