# Validation Summary: How to Bypass Schema Validation for Administrative Operations in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (schema validation, `bypassDocumentValidation` option)
- mongosh (MongoDB Shell)
- MongoDB Enterprise Auditing
- MongoDB Role-Based Access Control (RBAC)

## Sources Consulted
- [MongoDB Privilege Actions — bypassDocumentValidation](https://www.mongodb.com/docs/manual/reference/privilege-actions/)
- [MongoDB Built-In Roles](https://www.mongodb.com/docs/manual/reference/built-in-roles/)
- [MongoDB Bypass Document Validation](https://www.mongodb.com/docs/manual/core/schema-validation/bypass-document-validation/)
- [MongoDB Configure Audit Filters](https://www.mongodb.com/docs/manual/tutorial/configure-audit-filters/)
- [MongoDB System Event Audit Messages](https://www.mongodb.com/docs/manual/reference/audit-message/)
- [db.collection.insertOne()](https://www.mongodb.com/docs/manual/reference/method/db.collection.insertOne/)
- [db.collection.insertMany()](https://www.mongodb.com/docs/manual/reference/method/db.collection.insertMany/)
- [db.collection.updateOne()](https://www.mongodb.com/docs/manual/reference/method/db.collection.updateOne/)
- [db.collection.findOneAndUpdate()](https://www.mongodb.com/docs/manual/reference/method/db.collection.findOneAndUpdate/)
- [db.collection.aggregate()](https://www.mongodb.com/docs/manual/reference/method/db.collection.aggregate/)

## Issues Found

### 1. Incorrect built-in role listed for `bypassDocumentValidation` privilege
- **What was wrong:** The post listed `backup` as one of the built-in roles that includes the `bypassDocumentValidation` privilege. The `backup` role does NOT include this privilege — it only provides read-oriented privileges for backing up data.
- **What was changed:** Replaced `backup` with `dbAdmin` in the roles list. The MongoDB documentation explicitly states that `dbAdmin` and `restore` are the two roles that directly provide `bypassDocumentValidation`. The `dbOwner` and `root` roles inherit it transitively (through `dbAdmin` and `restore` respectively).
- **Why:** The `backup` role is designed for reading data for backup purposes and has no need to bypass document validation. Including it could mislead readers into assigning the wrong role for migration tasks.

### 2. Invalid audit log filter for CRUD operations
- **What was wrong:** The audit filter used `{ atype: { $in: ["insert", "update"] } }`. The values `"insert"` and `"update"` are NOT valid MongoDB audit event types (`atype` values). CRUD operations are captured under the `authCheck` audit event type, with the specific operation in the `param.command` field. The original filter would match zero events.
- **What was changed:** Replaced the filter with `{ atype: "authCheck", "param.command": { $in: ["insert", "update"] } }`, which correctly filters for authorization check events related to insert and update commands.
- **Why:** The original filter was non-functional and would silently produce an empty audit log, giving a false sense of security.

## Review Notes
- MongoDB auditing is an Enterprise-only feature. The post does not mention this, which could confuse Community Edition users. A future update could add a brief note about this.
- To capture successful CRUD operations (not just authorization failures), `auditAuthorizationSuccess` must be enabled in the MongoDB configuration. Without it, only failed `authCheck` events are logged. The post does not mention this prerequisite.
- The practical migration pattern using conditional `bypassDocumentValidation: !isValid(newDoc)` is a nice pattern but assumes an `isValid()` function exists — this is clearly meant as pseudocode, which is fine for a tutorial.
- All CRUD operation examples (`insertOne`, `insertMany`, `updateOne`, `findOneAndUpdate`) correctly use `bypassDocumentValidation` as an option and are syntactically valid.
- The `returnDocument: "after"` syntax is correct for modern mongosh (as opposed to the legacy `returnNewDocument: true`).
- The aggregation pipeline example with `$out` and `bypassDocumentValidation` is correct.
- The `createRole` and `createUser` examples for custom role creation are syntactically correct.
