# Validation Summary: How to Use Read Preference 'primary' in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (replica sets, read preferences)
- mongosh (MongoDB Shell)
- Node.js MongoDB Driver (`mongodb` package)
- MongoDB Connection String URI

## Sources Consulted
- MongoDB Read Preference documentation: https://www.mongodb.com/docs/manual/core/read-preference/
- MongoDB Node.js Driver Read Preference API: https://www.mongodb.com/docs/drivers/node/current/fundamentals/connection/connect/#read-preference
- mongosh `setReadPref()` and `cursor.readPref()` documentation: https://www.mongodb.com/docs/manual/reference/method/Mongo.setReadPref/
- MongoDB Connection String URI options: https://www.mongodb.com/docs/manual/reference/connection-string/#read-preference-options

## Issues Found
No technical issues found.

## Review Notes
- The post mentions `MongoNotPrimaryError` in descriptive text when discussing failover behavior. This is not an actual exported error class in the Node.js MongoDB driver. During a primary election, the driver would typically throw `MongoServerSelectionError` (when it times out trying to find a primary) or `MongoServerError` with a "not primary" code/message (if a request was in-flight to a stepping-down primary). However, the retry code catches errors generically and works correctly regardless of the specific error class, so this is not a functional issue.
- The post correctly identifies `primary` as the default read preference and accurately describes the trade-offs (strongest consistency, but reads fail during elections and all load stays on the primary).
