# Validation Summary: How to Troubleshoot High Disk I/O in MongoDB

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- MongoDB (WiredTiger storage engine)
- Linux system monitoring tools (iostat, top)
- mongosh (MongoDB Shell)
- AWS EC2 (EBS volume management)
- WiredTiger compression (snappy)

## Sources Consulted
- MongoDB serverStatus documentation: https://www.mongodb.com/docs/manual/reference/command/serverStatus/
- MongoDB 4.2 Release Notes (MMAPv1 removal): https://www.mongodb.com/docs/manual/release-notes/4.2/
- MongoDB WiredTiger Storage Engine documentation: https://www.mongodb.com/docs/manual/core/wiredtiger/
- MongoDB Configuration File Options: https://www.mongodb.com/docs/manual/reference/configuration-options/
- WiredTiger stat_data.py source (cache metric names): https://github.com/mongodb/mongo/blob/master/src/third_party/wiredtiger/dist/stat_data.py
- AWS EC2 modify-volume CLI reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-volume.html

## Issues Found
1. **`db.serverStatus().backgroundFlushing` is obsolete (Step 1)**: The `backgroundFlushing` field in `serverStatus` was specific to the MMAPv1 storage engine, which was removed entirely in MongoDB 4.2. On any modern MongoDB version (4.2+), this call returns `undefined`. Replaced with `db.serverStatus().wiredTiger['transaction checkpoint']`, which provides checkpoint duration metrics (most recent time, max time, min time) — the WiredTiger equivalent for monitoring flush behavior.

## Review Notes
- The WiredTiger cache metric names (`pages read into cache`, `unmodified pages evicted`, `tracked dirty bytes in the cache`, `maximum bytes configured`) are all confirmed correct against the WiredTiger source code.
- The compression config in Step 7 explicitly sets `snappy` and `prefixCompression: true`, which are already the MongoDB defaults. This is technically correct but redundant unless the user had previously changed these values. Not changed since explicitly setting defaults is a valid practice for documentation clarity.
- The `bulkWrite` example in Step 4 uses the Node.js driver syntax (`await db.collection(...)`), while earlier steps use `mongosh` syntax (`db.sessions.createIndex(...)`). This inconsistency is minor and contextually clear, so it was not changed.
