# Validation Summary: How to Audit Data Changes in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (Enterprise and Atlas)
- MongoDB Audit Log
- MongoDB Change Streams (MongoDB 6.0+ for pre/post images)
- Node.js MongoDB Driver
- TTL Indexes

## Sources Consulted
- MongoDB Audit Log documentation: https://www.mongodb.com/docs/manual/core/auditing/
- MongoDB Audit Event Actions: https://www.mongodb.com/docs/manual/reference/audit-message/#audit-event-actions
- MongoDB Audit Log Filter configuration: https://www.mongodb.com/docs/manual/tutorial/configure-audit-filters/
- MongoDB Change Streams documentation: https://www.mongodb.com/docs/manual/changeStreams/
- MongoDB Change Stream Pre- and Post-Images: https://www.mongodb.com/docs/manual/changeStreams/#change-streams-with-document-pre--and-post-images
- MongoDB collMod command: https://www.mongodb.com/docs/manual/reference/command/collMod/
- MongoDB TTL Indexes: https://www.mongodb.com/docs/manual/core/index-ttl/

## Issues Found

1. **Invalid `atype` values in audit log filter**: The original filter used `{ atype: { $in: ["insert","update","delete","authCheck"] } }`. The values `"insert"`, `"update"`, and `"delete"` are not valid MongoDB audit event action types. CRUD operations are captured via `authCheck` events, where the specific command type appears in `param.command`. Fixed the filter to `{ atype: { $in: ["authCheck", "authenticate"] } }`.

2. **Invalid `atype` in sample audit log entry**: The sample showed `"atype": "update"`, which is not a valid audit event type. Changed to `"atype": "authCheck"` and restructured the `param` section to match the real audit log format: the command type goes in `param.command`, the namespace in `param.ns`, and the operation details in `param.args`. Also added the `roles` field which is present in real authCheck audit entries.

3. **Missing `fullDocumentBeforeChange` option in change stream**: The code accessed `event.fullDocumentBeforeChange` but only passed `{ fullDocument: "updateLookup" }` to `db.watch()`. Without the `fullDocumentBeforeChange: "whenAvailable"` option, the pre-image field would be undefined. Added the missing option to the `db.watch()` call.

## Review Notes
- The application-level audit trail pattern (Approach 3) is not atomic -- the update and audit insert are separate operations. This is a known trade-off that could be mentioned, but is acceptable for a general tutorial.
- The TTL index uses `365 * 86400` which evaluates to 31,536,000 seconds (1 year). This is correct and works in both mongosh and the legacy mongo shell.
- The post correctly notes that change stream pre/post images require MongoDB 6.0+.
- The post correctly notes that the MongoDB audit log is only available on Enterprise and Atlas editions.
