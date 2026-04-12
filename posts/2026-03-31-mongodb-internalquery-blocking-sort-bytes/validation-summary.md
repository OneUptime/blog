# Validation Summary: How to Configure internalQueryExecMaxBlockingSortBytes in MongoDB

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MongoDB (server parameter configuration)
- mongosh (MongoDB Shell)
- MongoDB aggregation framework
- MongoDB query explain plans

## Sources Consulted
- MongoDB official documentation: `internalQueryExecMaxBlockingSortBytes` server parameter (https://www.mongodb.com/docs/manual/reference/parameters/#mongodb-parameter-param.internalQueryExecMaxBlockingSortBytes)
- MongoDB official documentation: `setParameter` command (https://www.mongodb.com/docs/manual/reference/command/setParameter/)
- MongoDB official documentation: `getParameter` command (https://www.mongodb.com/docs/manual/reference/command/getParameter/)
- MongoDB official documentation: `allowDiskUse` for find operations (https://www.mongodb.com/docs/manual/reference/command/find/#mongodb-dbcommand-dbcmd.find)
- MongoDB official documentation: `cursor.allowDiskUse()` (https://www.mongodb.com/docs/manual/reference/method/cursor.allowDiskUse/)
- MongoDB official documentation: `serverStatus` metrics (https://www.mongodb.com/docs/manual/reference/command/serverStatus/)
- MongoDB official documentation: Explain results and query plan stages (https://www.mongodb.com/docs/manual/reference/explain-results/)

## Issues Found
No technical issues found.

## Review Notes
- The `metrics.query.sort` path in `serverStatus` (with the `spillToDisk` counter) was introduced in MongoDB 6.2. The post does not specify a minimum version for this monitoring feature, which could confuse readers on older MongoDB versions. This is a minor documentation gap, not a technical error.
- Starting in MongoDB 6.0, the `allowDiskUseByDefault` server parameter was introduced and defaults to `true`, meaning blocking sorts that exceed the memory limit will spill to disk automatically without requiring explicit `allowDiskUse`. This means the sort memory limit error described in the post is less commonly encountered on MongoDB 6.0+ unless `allowDiskUseByDefault` has been set to `false`. The post's content remains technically correct but readers on MongoDB 6.0+ should be aware of this behavioral change.
- All byte calculations are verified correct: 209,715,200 = 200 MB, 268,435,456 = 256 MB, 104,857,600 = 100 MB.
- The compound index recommendation `{ status: 1, createdAt: -1 }` correctly follows the equality-sort-range (ESR) rule for optimal index usage.
