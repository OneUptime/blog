# Validation Summary: How to Enable and Configure MongoDB Audit Logging

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MongoDB Enterprise (audit logging)
- MongoDB Atlas (database auditing)
- mongod configuration (mongod.conf)
- mongosh (log rotation command)

## Sources Consulted
- MongoDB Official Documentation: Configure Audit Filters — https://www.mongodb.com/docs/manual/tutorial/configure-audit-filters/
- MongoDB Official Documentation: System Event Audit Messages — https://www.mongodb.com/docs/manual/reference/audit-message/
- MongoDB Official Documentation: Audit Action Types Reference
- Percona Server for MongoDB 7.0 Auditing Documentation — https://docs.percona.com/percona-server-for-mongodb/7.0/audit-logging.html
- MongoDB Atlas Database Auditing Documentation — https://www.mongodb.com/docs/atlas/database-auditing/
- Cross-referenced with other correctly-written audit posts in this blog (mongodb-auditing-compliance, mongodb-audit-data-changes)

## Issues Found

### 1. Invalid `atype` values for CRUD operations (multiple sections)
**What was wrong:** The post listed `insert`, `update`, `delete`, `find`, and `drop` as valid standalone `atype` values in audit filters and in the "Common Action Types" table. These are NOT valid `atype` values in MongoDB's audit system. CRUD operations are captured through `authCheck` events, with the specific operation stored in the `param.command` field.

**What was changed:**
- **Filter by Namespace section:** Changed filter from `"atype": {"$in": ["insert", "update", "delete", "drop"]}` to `"atype": "authCheck", "param.command": {"$in": ["insert", "update", "delete"]}`. Added a note about enabling `auditAuthorizationSuccess` to capture successful operations.
- **Combined Filter section:** Rewrote the filter to use `authCheck` with `param.command` for CRUD operations and `dropCollection` as a separate `atype` for DDL operations, combined with `$or`.
- **Command-line example:** Changed the `--auditFilter` from invalid atypes (`insert`, `update`, `delete`) to valid ones (`authenticate`, `authCheck`, `createCollection`, `dropCollection`).
- **Common Action Types table:** Removed invalid entries (`insert`, `update`, `delete`, `find`) and added missing valid atypes (`createDatabase`, `dropDatabase`, `dropIndex`, `updateUser`, `revokeRolesFromUser`, `shutdown`, `applicationMessage`). Added a clarifying note that CRUD operations are captured via `authCheck` events.

**Why:** Using invalid `atype` values in audit filters would silently produce empty audit logs — readers following this guide would get no audit events for CRUD operations, which defeats the purpose of the configuration.

### 2. `drop` is not a valid `atype`
**What was wrong:** The post used `drop` as an atype value in the "Filter by Namespace" and "Combined Filter" sections. The correct atype is `dropCollection`.

**What was changed:** Replaced `drop` with `dropCollection` in all filter examples and restructured combined filters accordingly.

### 3. Missing `auditAuthorizationSuccess` parameter
**What was wrong:** The post did not mention that by default, only *failed* `authCheck` events are logged. Without setting `auditAuthorizationSuccess: true`, readers would not capture successful CRUD operations — a critical omission for an audit logging guide.

**What was changed:** Added a note in the "Filter by Namespace" section explaining this requirement with the configuration snippet.

## Review Notes
- The `mongod.conf` configuration format, destination options, and format options are all correct.
- The `authenticate`, `authCheck`, and `logout` atypes used in the "Filter by Action Type" section were already correct.
- The "Filter by User" section using `$elemMatch` on the `users` array is correct.
- The audit log entry structure example is accurate.
- The log rotation methods (SIGUSR1 and `logRotate` admin command) are correct.
- The Atlas audit logging steps are approximately correct, though the Atlas UI changes frequently.
- The claim that Atlas stores audit logs for 30 days could not be precisely verified — retention may vary by cluster tier and configuration.
- Enabling `auditAuthorizationSuccess` can have performance implications on high-throughput systems. The post could benefit from a future note about this trade-off, but this was not added to avoid scope creep.
