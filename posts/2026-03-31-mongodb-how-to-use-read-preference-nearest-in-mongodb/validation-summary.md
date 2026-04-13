# Validation Summary: How to Use Read Preference 'nearest' in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (replica sets, read preferences)
- MongoDB Node.js Driver
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB official documentation on Read Preference: https://www.mongodb.com/docs/manual/core/read-preference/
- MongoDB official documentation on Read Preference "nearest": https://www.mongodb.com/docs/manual/core/read-preference/#nearest
- MongoDB Node.js Driver API documentation for ReadPreference: https://mongodb.github.io/node-mongodb-native/6.0/classes/ReadPreference.html
- MongoDB Node.js Driver API documentation for MongoClientOptions: https://mongodb.github.io/node-mongodb-native/6.0/interfaces/MongoClientOptions.html
- mongosh documentation for cursor.readPref(): https://www.mongodb.com/docs/mongodb-shell/reference/methods/

## Issues Found

1. **Incorrect use of `.readPref()` on `findOne()` result in mongosh example**
   - **What was wrong:** The post chained `.readPref("nearest")` on the result of `db.sessions.findOne()`. `findOne()` returns a document (not a cursor), so `.readPref()` cannot be called on it.
   - **What was changed:** Replaced `findOne()` with `find()`, which returns a cursor that supports the `.readPref()` method.
   - **Why:** `.readPref()` is a cursor method. Only `find()` returns a cursor; `findOne()` returns a document directly.

2. **`localThresholdMS` incorrectly passed to `ReadPreference` constructor**
   - **What was wrong:** The post created a `ReadPreference` instance with `{ localThresholdMS: 25 }` as a constructor option. `localThresholdMS` is not a valid `ReadPreference` option — it is a client-level option on `MongoClient`.
   - **What was changed:** Rewrote the example to set `localThresholdMS` as a `MongoClient` constructor option alongside `readPreference: "nearest"`, which is the correct way to configure the latency window.
   - **Why:** The `ReadPreference` constructor only accepts `maxStalenessSeconds` and `hedge` as options. `localThresholdMS` controls the server selection latency window and must be set at the client level.

## Review Notes
- The default `localThresholdMS` value of 15ms mentioned in the post is correct per MongoDB documentation.
- The explanation of how `nearest` works (latency window + random selection within the window) is accurate.
- The post correctly notes that write operations always go to the primary regardless of read preference setting.
