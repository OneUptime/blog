# Validation Summary: How to Monitor MongoDB Performance with db.currentOp()

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (db.currentOp() method, $currentOp aggregation stage)
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB official documentation: db.currentOp() method — https://www.mongodb.com/docs/manual/reference/method/db.currentOp/
- MongoDB official documentation: $currentOp aggregation stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/currentOp/
- MongoDB official documentation: db.killOp() — https://www.mongodb.com/docs/manual/reference/method/db.killOp/

## Issues Found

1. **Incorrect `locks` field format in example output**: The example showed the pre-MongoDB 3.0 simplified format (`"Global": "r"`). Modern MongoDB versions use a nested structure with `acquireCount` sub-documents (e.g., `"Global": { "acquireCount": { "r": 1 } }`). Fixed the example to reflect the modern format.

2. **Incomplete `op` field values**: The key fields table listed `query`, `insert`, `update`, `remove`, `command`, `getmore` as operation types but omitted `none` and `killcursors`, which are also valid values per the official documentation. Added the missing values.

## Review Notes
- The `threadId` field shown in the example output is not listed in the official MongoDB documentation for currentOp output fields. It may appear in practice in some MongoDB builds but is not officially documented. Left as-is since it does not constitute a factual error — it is plausible in example output.
- The `$currentOp` options table does not mention `targetAllNodes` (added in MongoDB 7.1). This is acceptable since the post does not claim to cover all options and targets a general audience.
- The monitoring script uses an infinite `while(true)` loop with `sleep(5000)`, which is valid in mongosh but would block the shell. This is correctly described in the post.
