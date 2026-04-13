# Validation Summary: How to Implement Audit Logging in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Enterprise Audit Log
- MongoDB Change Streams
- MongoDB Node.js Driver
- Express.js middleware
- MongoDB Aggregation Framework

## Sources Consulted
- [MongoDB Audit Message Reference (mongo schema)](https://www.mongodb.com/docs/manual/reference/audit-message/mongo/) — authoritative list of valid `atype` values
- [MongoDB Configure Audit Filters](https://www.mongodb.com/docs/manual/tutorial/configure-audit-filters/) — official filter examples showing `authCheck` with `param.command`
- [MongoDB Change Streams documentation](https://www.mongodb.com/docs/manual/changestreams/) — `fullDocumentBeforeChange` and `changeStreamPreAndPostImages` requirements
- [db.collection.watch() reference](https://www.mongodb.com/docs/manual/reference/method/db.collection.watch/) — Change Stream options and prerequisites
- [Node.js deprecation of `request.connection`](https://nodejs.org/api/http.html#requestsocket) — `req.socket` is the non-deprecated replacement

## Issues Found

### 1. Invalid audit event types in Enterprise filter (Major)
**What was wrong:** The `mongod.conf` audit filter listed `"insert"`, `"update"`, `"delete"`, and `"find"` as `atype` values. These are NOT valid MongoDB audit event types. CRUD operations are captured via `authCheck` events where `param.command` indicates the operation type.

**What was changed:** Rewrote the filter to use `$or` — one branch for DDL/auth events by `atype`, and another for CRUD operations via `atype: "authCheck"` with `"param.command"` filtering. Added a note explaining that `auditAuthorizationSuccess: true` must be set to log successful CRUD operations.

### 2. Invalid sample audit log entry (Major)
**What was wrong:** The sample audit log entry showed `"atype": "insert"` with a `param.doc` field. Real MongoDB audit entries for CRUD use `"atype": "authCheck"` with `param.command`, `param.ns`, and `param.args`.

**What was changed:** Replaced the sample entry with a correct `authCheck` audit event showing the proper `param` structure with `command`, `ns`, and `args` fields.

### 3. Missing prerequisite for Change Stream pre-images (Medium)
**What was wrong:** The Change Stream code used `fullDocumentBeforeChange: "whenAvailable"` without mentioning that `changeStreamPreAndPostImages` must be enabled on the collection first. Without this, `fullDocumentBeforeChange` silently returns `null`.

**What was changed:** Added a section before the Change Stream code explaining the prerequisite and showing the `collMod` command to enable pre/post images.

### 4. Middleware before/after values never logged (Minor)
**What was wrong:** The Express middleware route handler set `req.auditBefore` and `req.auditAfter`, but the audit log entry object in the `res.json` override never included these fields. The values were captured but silently discarded.

**What was changed:** Added `before: req.auditBefore || null` and `after: req.auditAfter || null` to the `logEntry` object in the middleware.

### 5. Deprecated Node.js API (Minor)
**What was wrong:** `req.connection.remoteAddress` uses the deprecated `request.connection` property in Node.js.

**What was changed:** Replaced with `req.socket.remoteAddress`.

## Review Notes
- The TTL index retaining audit logs for 1 year may not meet all compliance requirements (e.g., HIPAA requires 6 years, SOC 2 varies). The post mentions compliance standards in the overview but the TTL example could be misleading. This is a design consideration, not a technical error — left as-is since the comment clearly states the intent.
- The `fullDocumentBeforeChange` feature requires MongoDB 6.0+. The post does not specify a minimum MongoDB version, which could cause confusion for readers on older versions.
- The Change Stream `"change"` event handler uses `async` but errors from `this.logChange(change)` are not caught, which could result in unhandled promise rejections. This is a common pattern in example code and was left as-is.
