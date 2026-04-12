# Validation Summary: How to Set Cursor Timeout in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (server-side cursor management, server parameters)
- MongoDB Node.js Driver (find options, MongoClient configuration)
- PyMongo (Python MongoDB driver)
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB Manual — Cursors: https://www.mongodb.com/docs/manual/core/cursors/
- MongoDB Manual — Server Parameters (`cursorTimeoutMillis`): https://www.mongodb.com/docs/manual/reference/parameters/
- MongoDB Manual — `cursor.maxTimeMS()`: https://www.mongodb.com/docs/manual/reference/method/cursor.maxtimems/
- MongoDB Manual — `cursor.maxAwaitTimeMS()`: https://www.mongodb.com/docs/manual/reference/method/cursor.maxawaittimems/
- MongoDB Manual — `cursor.noCursorTimeout()`: https://www.mongodb.com/docs/manual/reference/method/cursor.nocursortimeout/
- MongoDB Manual — `db.collection.find()`: https://www.mongodb.com/docs/manual/reference/method/db.collection.find/
- MongoDB Node.js Driver — Connection Options / CSOT: https://www.mongodb.com/docs/drivers/node/current/connect/connection-options/
- MongoDB Node.js Driver source — `FindOptions` interface: https://github.com/mongodb/node-mongodb-native/blob/main/src/operations/find.ts
- MongoDB Node.js Driver source — `MongoClientOptions` interface: https://github.com/mongodb/node-mongodb-native/blob/main/src/mongo_client.ts
- PyMongo — Collection.find(): https://pymongo.readthedocs.io/en/stable/api/pymongo/collection.html
- PyMongo — Cursor: https://pymongo.readthedocs.io/en/stable/api/pymongo/cursor.html

## Issues Found

### 1. Incorrect mongosh `maxTimeMS` syntax
- **What was wrong:** The mongosh example passed `maxTimeMS` as the second argument to `db.collection.find()`: `db.reports.find({ year: 2025 }, { maxTimeMS: 30000 })`. In mongosh, the second argument to `find()` is a projection document, not an options object. Passing `{ maxTimeMS: 30000 }` there would be silently interpreted as a projection, not as a timeout setting.
- **What was changed:** Replaced with the correct chained method syntax: `db.reports.find({ year: 2025 }).maxTimeMS(30000)`.
- **Why:** The `maxTimeMS()` method is a cursor modifier that must be chained in mongosh, per the official documentation.

### 2. Non-existent `cursorTimeoutMS` MongoClient option
- **What was wrong:** The post claimed that `cursorTimeoutMS` is a valid option when creating a `MongoClient` in the Node.js driver. This option does not exist in `MongoClientOptions`. The valid timeout-related options are `timeoutMS`, `connectTimeoutMS`, `socketTimeoutMS`, `waitQueueTimeoutMS`, and `serverSelectionTimeoutMS`.
- **What was changed:** Replaced `cursorTimeoutMS` with `timeoutMS` (Client Side Operation Timeout / CSOT), updated the section heading and description to accurately reflect that this is a general operation timeout (not a cursor-specific idle timeout), and added a note about version requirements (MongoDB 7.1+ / Node.js driver 6.x+).
- **Why:** `cursorTimeoutMS` is fabricated and would be silently ignored by the driver, giving readers a false sense of having configured cursor timeouts.

## Review Notes
- The PyMongo example passes `no_cursor_timeout=False`, which is the default value and therefore redundant. This is not technically wrong but could confuse readers into thinking it needs to be explicitly set. Left as-is since it serves an illustrative purpose with the comment.
- The `timeoutMS` (CSOT) option is relatively new (MongoDB 7.1+ / driver 6.x+) and may not be available in older deployments. The post could benefit from mentioning this context more prominently in the future.
- The summary paragraph mentions `noCursorTimeout` without a dedicated section. This is fine for a summary but readers may want a code example showing its usage.
