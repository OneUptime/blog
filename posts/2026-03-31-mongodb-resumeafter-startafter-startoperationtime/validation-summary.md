# Validation Summary: How to Use resumeAfter vs startAfter vs startAtOperationTime in MongoDB

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB Change Streams
- MongoDB Node.js Driver (mongodb npm package)
- BSON Timestamp type
- MongoDB Oplog

## Sources Consulted
- MongoDB Change Streams documentation: https://www.mongodb.com/docs/manual/changeStreams/
- MongoDB `resumeAfter` / `startAfter` / `startAtOperationTime` options: https://www.mongodb.com/docs/manual/reference/method/db.collection.watch/
- MongoDB Node.js Driver BSON Timestamp API: https://mongodb.github.io/node-mongodb-native/
- MongoDB error codes reference (ChangeStreamHistoryLost = 286): https://www.mongodb.com/docs/manual/reference/error-codes/
- BSON Timestamp specification: https://bsonspec.org/spec.html

## Issues Found
1. **Incorrect Timestamp construction in `startAtOperationTime` example**
   - **What was wrong:** The code used `Timestamp.fromNumber(Math.floor(Date.now() / 1000) - 3600)` to create a BSON Timestamp. `fromNumber()` treats the input as a raw 64-bit Long value, placing the Unix seconds into the low 32 bits (the increment field). A BSON Timestamp encodes seconds in the high 32 bits (`t`) and an ordinal increment in the low 32 bits (`i`). This would produce a completely wrong timestamp (seconds=0, increment=unixSeconds) that would not match any oplog entry.
   - **What was changed:** Replaced with `new Timestamp({ t: Math.floor(Date.now() / 1000) - 3600, i: 0 })`, which is the correct constructor in the MongoDB Node.js driver (4.x+/bson 4.x+) that properly places the seconds value in the `t` field and sets increment to 0.
   - **Why:** Using the incorrect constructor would cause `startAtOperationTime` to fail or return no results, as the generated timestamp would not correspond to any valid oplog time.

2. **Misleading comment removed:** The comment `// (seconds, increment)` next to the Timestamp construction was removed because it was ambiguous and no longer relevant with the object-style constructor that makes the field names explicit.

## Review Notes
- The `startAfter` comment mentions "safe even if savedToken is from a 'drop' event." Technically, the token that cannot be used with `resumeAfter` is from the "invalidate" event (which follows the "drop" event on the change stream). A "drop" event token can be used with `resumeAfter`. The post's wording is a simplification but the guidance is directionally correct -- using `startAfter` is indeed the safe choice when dealing with collection drops.
- The post does not mention that `startAfter` requires MongoDB 4.2+. This is worth noting but not incorrect as 4.2 is well past end-of-life for all earlier versions.
- The oplog monitoring commands use `db.getSiblingDB("local")` which is MongoDB shell syntax, while the rest of the code is Node.js. This is appropriate since oplog inspection is typically done from the shell, but readers should be aware of the context switch.
