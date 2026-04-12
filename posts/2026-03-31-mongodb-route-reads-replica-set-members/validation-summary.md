# Validation Summary: How to Route Reads to Specific Replica Set Members in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB replica sets
- MongoDB tag sets
- MongoDB read preferences (`secondary`, `secondaryPreferred`, `nearest`)
- MongoDB Node.js driver (`ReadPreference`, `FindCursor.withReadPreference()`)
- mongosh (`rs.conf()`, `rs.reconfig()`, `readPref()`)

## Sources Consulted
- MongoDB Manual: Configure Replica Set Tag Sets — https://www.mongodb.com/docs/manual/tutorial/configure-replica-set-tag-sets/
- MongoDB Manual: Read Preference Tag Set Lists — https://www.mongodb.com/docs/manual/core/read-preference-tags/
- MongoDB Manual: Read Preference — https://www.mongodb.com/docs/manual/core/read-preference/
- MongoDB Manual: cursor.readPref() — https://www.mongodb.com/docs/manual/reference/method/cursor.readpref/
- MongoDB Manual: Replica Set Configuration — https://www.mongodb.com/docs/manual/reference/replica-configuration/
- MongoDB Manual: Hidden Replica Set Members — https://www.mongodb.com/docs/manual/core/replica-set-hidden-member/
- MongoDB Manual: Explain Results — https://www.mongodb.com/docs/manual/reference/explain-results/
- MongoDB Node.js Driver API: ReadPreference — https://mongodb.github.io/node-mongodb-native/6.6/classes/ReadPreference.html
- MongoDB Node.js Driver API: FindCursor — https://mongodb.github.io/node-mongodb-native/6.6/classes/FindCursor.html

## Issues Found

### 1. Incorrect claim about hidden members and tags
- **What was wrong:** The post stated "Hidden secondary members (those with `hidden: true`) cannot be tagged for reads - they are excluded from all read preferences including `"secondary"`." This implies hidden members cannot have tags set on them, which is incorrect.
- **What was changed:** Corrected to explain that hidden members CAN have tags, but are excluded from read preference routing because they don't appear in the client's server topology (`hello`/`isMaster` responses). Also noted that tags on hidden members are still useful for custom write concern modes via `settings.getLastErrorModes`.
- **Why:** Hidden members are excluded from read routing due to SDAM topology invisibility, not due to any tag restriction. The original wording was factually misleading.

### 2. Inconsistent function in explain example
- **What was wrong:** The explain code block used `print()` (a mongosh function) in what is otherwise a Node.js driver context (uses `await`, `db.collection()`, `withReadPreference()`).
- **What was changed:** Replaced `print()` with `console.log()`.
- **Why:** The code block uses Node.js driver patterns throughout; `console.log()` is the correct output function in that context.

## Review Notes
- The `explain()` example's `explainResult.serverInfo.host` path is valid — MongoDB explain output includes a top-level `serverInfo` object with `host` and `port` fields for unsharded collections.
- All read preference modes used (`secondary`, `secondaryPreferred`, `nearest`) are valid MongoDB read preference modes.
- The tag set fallback behavior described (try each document in array order, empty `{}` matches any eligible member) is accurate per MongoDB documentation.
- The `FindCursor.withReadPreference()` method used in the explain example is a valid method in the MongoDB Node.js driver.
