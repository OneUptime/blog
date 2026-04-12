# Validation Summary: How to Tail the Oplog for Custom CDC Solutions in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (oplog, replica sets, Change Data Capture)
- MongoDB Node.js Driver (v4+/v5+/v6+)
- MongoDB Change Streams (for comparison)
- BSON Timestamp type

## Sources Consulted
- MongoDB find command documentation — `oplogReplay` deprecation notice (https://www.mongodb.com/docs/manual/reference/command/find/)
- MongoDB CRUD specification — `oplogReplay` deprecation details (https://github.com/mongodb/specifications/blob/master/source/crud/crud.md)
- SERVER-36186: Ignore value of oplogReplay find command option (https://jira.mongodb.org/browse/SERVER-36186)
- MongoDB Node.js Driver API — Timestamp class (https://mongodb.github.io/node-mongodb-native/6.3/classes/BSON.Timestamp.html)
- MongoDB Node.js Driver API — FindOptions interface (https://mongodb.github.io/node-mongodb-native/6.3/interfaces/FindOptions.html)
- MongoDB Manual — Change Streams with pre- and post-images (https://www.mongodb.com/docs/manual/changeStreams/#change-streams-with-document-pre--and-post-images)
- MongoDB Manual — Replica Set Oplog (https://www.mongodb.com/docs/manual/core/replica-set-oplog/)
- BSON v5 upgrade guide (https://github.com/mongodb/js-bson/blob/main/docs/upgrade-to-v5.md)

## Issues Found

### 1. Incorrect pre-image claim
- **What was wrong:** The bullet point "See pre-image and full replacement details not exposed by Change Streams" was inaccurate in two ways: (a) the oplog does NOT contain pre-images — for updates, it stores only the diff/new values, and for deletes, only the `_id`; (b) Change Streams actually DO support pre-images since MongoDB 6.0 via `changeStreamPreAndPostImages`.
- **What was changed:** Replaced with "See raw update diffs and full replacement documents in the oplog entry" which accurately describes what the oplog contains.

### 2. Deprecated `oplogReplay` option in code example
- **What was wrong:** The `oplogReplay: true` option was included in the `find()` call. This option was deprecated in MongoDB 4.4 (SERVER-36186) — the server now automatically optimizes oplog `ts` range queries without needing this flag. While the option is still accepted as a no-op for backward compatibility, including it in a tutorial teaches readers to use a deprecated API.
- **What was changed:** Removed `oplogReplay: true` from the find options.

### 3. Incorrect comparison table entry for pre-image support
- **What was wrong:** The Oplog vs Change Streams comparison table listed "Pre-image support: Limited" for oplog tailing. The oplog does not contain pre-images at all.
- **What was changed:** Changed "Limited" to "No" for the oplog tailing column.

## Review Notes
- The `Timestamp` constructor syntax `new Timestamp({ t, i })` and the `.t`/`.i` getter properties are correct for the modern MongoDB Node.js driver (v5+/v6+ with BSON v5+). The older two-argument constructor `new Timestamp(low, high)` was removed in BSON v5.
- The `noCursorTimeout` option is valid but readers should be aware that MongoDB server sessions still expire after 30 minutes of idleness, which can close the cursor regardless of this setting.
- The post correctly notes that Atlas blocks access to the `local` database, making direct oplog tailing impossible on Atlas deployments.
- The recommendation to prefer Change Streams for new applications is sound advice.
