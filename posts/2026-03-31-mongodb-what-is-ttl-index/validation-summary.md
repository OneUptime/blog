# Validation Summary: What Is a TTL Index in MongoDB

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (TTL indexes, background TTL monitor thread, `createIndex`, `collMod`, `serverStatus`)
- JavaScript (MongoDB Shell / `mongosh` syntax)

## Sources Consulted
- MongoDB official documentation on TTL Indexes: https://www.mongodb.com/docs/manual/core/index-ttl/
- MongoDB official documentation on `collMod` command: https://www.mongodb.com/docs/manual/reference/command/collMod/
- MongoDB official documentation on `db.serverStatus()`: https://www.mongodb.com/docs/manual/reference/command/serverStatus/
- MongoDB official documentation on `createIndex`: https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/

## Issues Found
1. **Incorrect claim about modifying TTL indexes** (Modifying a TTL Index section): The original text stated "You cannot change `expireAfterSeconds` by dropping and recreating the index in place." This is factually incorrect — you can drop an index and recreate it with a different `expireAfterSeconds` value. The `collMod` command is the *recommended* approach because it avoids the overhead of rebuilding the index, but drop-and-recreate does work. Changed the sentence to: "Instead of dropping and recreating the index, you can modify `expireAfterSeconds` directly using the `collMod` command:" which accurately conveys that `collMod` is the preferred method without making a false claim.

## Review Notes
- Starting in MongoDB 6.1, the TTL monitor sleep interval can be configured via the `ttlMonitorSleepSecs` server parameter (default remains 60 seconds). The post's description of "every 60 seconds" is correct for the default behavior.
- When the indexed field holds an array of dates, MongoDB uses the lowest (earliest) date value in the array to determine expiration. The post mentions arrays of dates are supported but does not detail this behavior, which is acceptable for an introductory post.
- All code examples use valid `mongosh` syntax and would work as shown.
