# Validation Summary: How to Enable MongoDB Auditing for Compliance

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- MongoDB Enterprise Auditing (auditLog configuration)
- mongod.conf YAML configuration
- MongoDB audit filter query syntax
- jq for parsing JSON audit logs
- logrotate for audit log rotation
- Filebeat for SIEM integration (Elasticsearch)

## Sources Consulted
- MongoDB Manual: Auditing — https://www.mongodb.com/docs/manual/core/auditing/
- MongoDB Manual: Configure Audit Filters — https://www.mongodb.com/docs/manual/tutorial/configure-audit-filters/
- MongoDB Manual: System Event Audit Messages — https://www.mongodb.com/docs/manual/reference/audit-message/
- MongoDB Manual: Audit Action Details — https://www.mongodb.com/docs/manual/reference/audit-message/audit-action-details/
- MongoDB Manual: logRotate command — https://www.mongodb.com/docs/manual/reference/command/logRotate/
- MongoDB Manual: Configuration File Options (auditLog) — https://www.mongodb.com/docs/manual/reference/configuration-options/#auditlog-options

## Issues Found

### Issue 1: CRUD operations listed as standalone atype values (Step 2 table)
**What was wrong:** The table listed `find`, `insert`, `update`, and `delete` as valid audit action types (atype values). These are NOT standalone atype values in MongoDB's audit system. CRUD operations are captured through `authCheck` events, where the specific operation is indicated by the `param.command` field.
**What was changed:** Removed the four incorrect CRUD rows from the atype table and added an explanatory section showing how to audit CRUD operations using `authCheck` with `param.command` filtering, including a note about high volume.
**Why:** Using `find`, `insert`, `update`, or `delete` as atype values in an audit filter would silently match nothing, giving a false sense that CRUD auditing is active when no events are actually being captured.

### Issue 2: Incorrect field path in failed login filter (Step 3)
**What was wrong:** The "Capture Failed Logins Only" filter used `"param.result": { $ne: 0 }` to match failed authentication attempts.
**What was changed:** Changed to `"result": { $ne: 0 }` (top-level field).
**Why:** In MongoDB audit events, the result code is a top-level field, not nested inside `param`. The `param` object for authenticate events contains `user`, `db`, and `mechanism` only. Using `param.result` would never match any events.

### Issue 3: Incorrect collection-specific audit filter (Step 3)
**What was wrong:** The "Capture Access to a Specific Collection" filter used `atype: { $in: ["find", "insert", "update", "delete"] }` which references non-existent atype values.
**What was changed:** Changed to `atype: "authCheck"` with `"param.command": { $in: ["find", "insert", "update", "delete"] }` to correctly filter authCheck events by the specific CRUD command.
**Why:** Same root cause as Issue 1 — CRUD operations use the authCheck atype, not individual atypes.

### Issue 4: Incorrect `param.result` field in sample audit entry (Step 4)
**What was wrong:** The sample JSON audit entry for an authenticate event included `"result": 0` inside the `param` object. This field does not exist in the standard MongoDB audit event format.
**What was changed:** Removed `"result": 0` from inside `param` and moved the explanatory comment (`// 0 = success, non-zero = failure code`) to the top-level `result` field where it belongs.
**Why:** The sample entry should accurately represent what administrators will see in their audit logs to avoid confusion during investigation.

## Review Notes
- The `logRotate: "audit"` command syntax may vary by MongoDB version. In MongoDB 5.1+, the documented approach is `db.adminCommand({ logRotate: 1, audit: true })`. The syntax shown may work in some versions but readers should check their specific version's documentation.
- The `date -u -d '1 hour ago'` command in the jq examples uses GNU date syntax (Linux). On macOS, the equivalent would be `date -u -v-1H`. This is acceptable since MongoDB servers typically run on Linux.
- The post correctly notes that auditing is an Enterprise feature. Community Edition users cannot use these features.
- The auditLog filter examples use unquoted keys (e.g., `atype` instead of `"atype"`). MongoDB's audit filter parser accepts this relaxed syntax, but strict JSON with quoted keys would be more portable across configuration tools.
