# Validation Summary: How to Create a TTL Index in MongoDB for Automatic Document Expiry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (TTL indexes, `createIndex`, `collMod`, `expireAfterSeconds`)
- MongoDB Node.js Driver (`mongodb` npm package)
- JavaScript / Node.js

## Sources Consulted
- MongoDB official documentation on TTL indexes: https://www.mongodb.com/docs/manual/core/index-ttl/
- MongoDB official documentation on `createIndex`: https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB official documentation on `collMod`: https://www.mongodb.com/docs/manual/reference/command/collMod/
- MongoDB Node.js Driver API documentation: https://www.mongodb.com/docs/drivers/node/current/

## Issues Found
- **Misleading code comment in Node.js example**: The comment on the second `insertOne` call said "Insert a session that expires at a specific time (10 seconds from now, for demo)" but the actual code created a date 2 hours and 1 minute in the past (`Date.now() - 7200 * 1000 - 60000`), making it already expired relative to the 2-hour TTL. The inline comment correctly said "// already expired", contradicting the preceding comment. Fixed the comment to say "Insert a session that is already expired (for demo)" to match the actual code behavior.

## Review Notes
- All MongoDB shell commands and Node.js driver API calls are syntactically correct and use current, non-deprecated APIs.
- The explanation of TTL background thread behavior (60-second interval, eventual deletion) is accurate.
- The `expireAfterSeconds: 0` pattern for per-document expiry control is correctly described.
- The constraint that TTL indexes cannot be compound and do not work on capped collections is accurate.
- The array-of-dates behavior (earliest date used for expiry) is correctly documented.
- The `collMod` approach for modifying TTL duration is the correct method (as opposed to dropping and recreating the index).
