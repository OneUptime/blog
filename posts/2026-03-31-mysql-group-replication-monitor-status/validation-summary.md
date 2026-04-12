# Validation Summary: How to Monitor MySQL Group Replication Status

## Status
validated

## Post Type
Guide

## Technologies Covered
- MySQL 8.0 Group Replication
- MySQL Performance Schema
- Bash scripting (health check)

## Sources Consulted
- MySQL 8.0 Reference Manual: Group Replication - `replication_group_members` table (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-replication-group-members-table.html)
- MySQL 8.0 Reference Manual: Group Replication - `replication_group_member_stats` table (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-replication-group-member-stats-table.html)
- MySQL 8.0 Reference Manual: `replication_connection_status` table (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-replication-connection-status-table.html)
- MySQL 8.0 Reference Manual: `replication_applier_status_by_worker` table (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-replication-applier-status-by-worker-table.html)
- MySQL 8.0 Reference Manual: Group Replication Server States (https://dev.mysql.com/doc/refman/8.0/en/group-replication-server-states.html)
- MySQL 8.0 Reference Manual: Group Replication Status Variables (https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html)

## Issues Found
1. **Example output column headers did not match query columns**: The SELECT query uses full column names (`MEMBER_HOST`, `MEMBER_PORT`, `MEMBER_STATE`, `MEMBER_ROLE`, `MEMBER_VERSION`) with no aliases, but the example output table showed shortened headers (`HOST`, `PORT`, `STATE`, `ROLE`, `VERSION`). Fixed the output table headers to match the actual column names that MySQL would return.

2. **Section heading used incorrect terminology**: The heading "Monitor Group Replication System Variables" used `SHOW STATUS`, which displays server **status** variables, not **system** variables (which are shown via `SHOW VARIABLES`). Changed the heading to "Monitor Group Replication Status Variables".

## Review Notes
- The `group_replication_primary_member` status variable shown in the `SHOW STATUS` example output was deprecated in MySQL 8.0.14. It still works in MySQL 8.0.x but users should prefer querying `performance_schema.replication_group_members` with `MEMBER_ROLE = 'PRIMARY'` instead. The post already demonstrates this approach in the first query, so the example serves as a supplementary reference.
- The health check view (`CREATE OR REPLACE VIEW gr_health`) referencing `performance_schema` tables is valid as long as the view is created in a user database, not in `performance_schema` itself. Users should be aware they need to `USE` an appropriate database first.
- The bash health check script hardcodes a password on the command line (`-pSecret`), which MySQL will warn about. This is acceptable for a demonstration script but should use a credentials file (e.g., `~/.my.cnf`) in production.
