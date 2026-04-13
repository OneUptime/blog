# Validation Summary: How to Enable MongoDB Audit Logging

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Enterprise (audit logging feature)
- MongoDB Atlas (managed audit logging)
- mongod.conf YAML configuration
- Linux systemd and logrotate

## Sources Consulted
- MongoDB official documentation: Configure Auditing (https://www.mongodb.com/docs/manual/core/auditing/)
- MongoDB official documentation: Configure Audit Filters (https://www.mongodb.com/docs/manual/tutorial/configure-audit-filters/)
- MongoDB official documentation: System Event Audit Messages (https://www.mongodb.com/docs/manual/reference/audit-message/)
- MongoDB official documentation: Rotate Log Files (https://www.mongodb.com/docs/manual/tutorial/rotate-log-files/)
- MongoDB Atlas documentation: Set Up Database Auditing (https://www.mongodb.com/docs/atlas/database-auditing/)

## Issues Found
- **Incorrect audit filter field path for authentication failures**: The filter example for logging authentication failures used `"param.result": { $ne: 0 }`, but the `result` field is a top-level field in MongoDB audit log messages, not nested under `param`. The `param` object contains authentication-specific fields like `user`, `db`, and `mechanism`, while `result` (the status code where 0 = success) sits at the root of the audit entry. This was confirmed by the post's own sample audit log entries which show `"result": 0` at the top level. Fixed to `result: { $ne: 0 }`.

## Review Notes
- The post correctly notes that audit logging is an Enterprise/Atlas-only feature. This is an important distinction since Community Edition users cannot use this feature.
- All listed audit event types (`authenticate`, `createCollection`, `dropCollection`, `createIndex`, `dropIndex`, `createUser`, `dropUser`, `updateUser`, `logout`, `authCheck`, `renameCollection`, `grantRolesToUser`, `createRole`, `dropRole`) are valid MongoDB audit action types.
- The `auditLog` configuration section name, command-line flags (`--auditDestination`, `--auditFormat`, `--auditPath`, `--auditFilter`), and three destination types (`file`, `console`, `syslog`) are all correct.
- The sample audit log entry structures accurately reflect the MongoDB audit message format with correct field names and nesting.
- The log rotation approach (SIGUSR1 signal and `logRotate` admin command) is correct for MongoDB.
- The Atlas UI navigation steps are approximately correct, though the exact UI layout may evolve over time.
