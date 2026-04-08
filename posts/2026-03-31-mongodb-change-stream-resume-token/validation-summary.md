# Validation Summary: How to Resume a Change Stream from a Resume Token in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Change Streams
- MongoDB Node.js Driver
- MongoDB BSON Timestamp type
- MongoDB Oplog

## Sources Consulted
- MongoDB Change Streams documentation: https://www.mongodb.com/docs/manual/changeStreams/
- MongoDB Node.js Driver Change Stream API: https://www.mongodb.com/docs/drivers/node/current/usage-examples/changeStream/
- MongoDB BSON Timestamp specification: https://www.mongodb.com/docs/manual/reference/bson-types/#timestamps
- MongoDB Change Stream resume documentation: https://www.mongodb.com/docs/manual/changeStreams/#resume-a-change-stream
- MongoDB error code reference for ChangeStreamHistoryLost (code 286)

## Issues Found
1. **Incorrect `Timestamp.fromNumber()` usage in `startAtOperationTime` section**: The code used `Timestamp.fromNumber(Math.floor(oneHourAgo.getTime() / 1000))` which places the epoch seconds into the low 32 bits (increment portion) of the BSON Timestamp instead of the high 32 bits (seconds portion). A BSON Timestamp is a 64-bit value where the high 32 bits represent seconds since epoch and the low 32 bits represent an ordinal increment. Fixed to use `new Timestamp({ t: Math.floor(oneHourAgo.getTime() / 1000), i: 0 })` which correctly places seconds in the `t` field and sets the increment `i` to 0.

## Review Notes
- The use of `col.s.db` in the `resilientStream` function accesses an internal/private property of the MongoDB Node.js driver's Collection object. While this works in practice, it is not part of the public API and could break in future driver versions. A production implementation should pass the `db` reference explicitly.
- The oplog retention window is described as "default ~24 hours on Atlas" which is approximately correct for Atlas M10+ clusters, though actual retention depends on oplog size and write throughput.
- All other code examples, API usage (`resumeAfter`, `startAfter`, `startAtOperationTime`, `watch()`), error handling patterns, and technical explanations are accurate.
