# Validation Summary: How to Run MySQL in Read-Only Mode

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (read_only and super_read_only system variables)
- MySQL replication configuration
- MySQL privilege system (SUPER, CONNECTION_ADMIN)
- MySQL performance_schema

## Sources Consulted
- MySQL 8.0 Reference Manual: Server System Variables — read_only (https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_read_only)
- MySQL 8.0 Reference Manual: Server System Variables — super_read_only (https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_super_read_only)
- MySQL 8.0 Reference Manual: Privileges Provided by MySQL — CONNECTION_ADMIN (https://dev.mysql.com/doc/refman/8.0/en/privileges-provided.html#priv_connection-admin)
- MySQL 8.0 Reference Manual: FLUSH Statement (https://dev.mysql.com/doc/refman/8.0/en/flush.html)
- MySQL 8.0 Reference Manual: performance_schema.global_variables (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-system-variable-tables.html)

## Issues Found
- **Incorrect privilege name in "Behavior of Read-Only Mode" section**: The post stated that "Users with SUPER or SYSTEM_VARIABLES_ADMIN can still write" when `read_only = ON`. The correct privilege is `CONNECTION_ADMIN`, not `SYSTEM_VARIABLES_ADMIN`. The `SYSTEM_VARIABLES_ADMIN` privilege allows setting global system variables, but it is `CONNECTION_ADMIN` that exempts users from `read_only` write restrictions. The post already correctly stated "CONNECTION_ADMIN" in the earlier "Enabling Read-Only Mode at Runtime" section, making this an internal inconsistency. Fixed to `CONNECTION_ADMIN`.

## Review Notes
- The post correctly distinguishes between `read_only` (which SUPER/CONNECTION_ADMIN users can bypass) and `super_read_only` (which only the replication thread can bypass).
- The FLUSH TABLES WITH READ LOCK pattern shown is a well-known maintenance procedure, though users should be aware that the read lock is released if the session disconnects.
- The post is accurate for MySQL 8.0+. In MySQL 5.7, the `CONNECTION_ADMIN` privilege does not exist (it was introduced in 8.0); only `SUPER` applies. The post does not specify a version, which is acceptable since MySQL 8.0 is the current GA release.
