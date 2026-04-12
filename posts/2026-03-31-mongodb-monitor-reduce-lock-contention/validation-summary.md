# Validation Summary: How to Monitor and Reduce Lock Contention in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (serverStatus, currentOp, killOp commands)
- MongoDB WiredTiger storage engine
- MongoDB Node.js driver (MongoClient, readPreference)
- MongoDB indexing and query optimization

## Sources Consulted
- MongoDB official documentation: serverStatus command — https://www.mongodb.com/docs/manual/reference/command/serverStatus/
- MongoDB official documentation: currentOp command — https://www.mongodb.com/docs/manual/reference/command/currentOp/
- MongoDB official documentation: killOp command — https://www.mongodb.com/docs/manual/reference/command/killOp/
- MongoDB official documentation: FAQ Concurrency — https://www.mongodb.com/docs/manual/faq/concurrency/
- MongoDB official documentation: WiredTiger storage engine — https://www.mongodb.com/docs/manual/core/wiredtiger/
- MongoDB official documentation: Read Preference — https://www.mongodb.com/docs/manual/core/read-preference/
- MongoDB Node.js driver documentation — https://www.mongodb.com/docs/drivers/node/current/

## Issues Found
No technical issues found.

## Review Notes
- The introductory bullet about "long-running write operations blocking readers" is a simplification. With WiredTiger's MVCC, readers use snapshots and are generally not blocked by writers at the document level. However, intent locks at higher levels of the lock hierarchy can still cause contention in extreme scenarios, so the general advice remains valid.
- Similarly, "unindexed queries holding collection-level locks during scan" is slightly imprecise — with WiredTiger, collection scans acquire intent locks (not exclusive locks) at the collection level, but they do hold these longer and increase contention indirectly. The practical guidance (add indexes) is correct.
- The post does not specify a MongoDB version. All commands and APIs shown are valid for MongoDB 4.x through 7.x.
