# Validation Summary: How to Track DDL Changes in MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (general query log, binary log, INFORMATION_SCHEMA, Event Scheduler)
- Percona Audit Log Plugin
- mysqlbinlog CLI utility
- jq for JSON filtering
- Bash scripting for alerting

## Sources Consulted
- MySQL 8.0 Reference Manual: General Query Log (https://dev.mysql.com/doc/refman/8.0/en/query-log.html)
- MySQL 8.0 Reference Manual: Binary Log (https://dev.mysql.com/doc/refman/8.0/en/binary-log.html)
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA TABLES Table (https://dev.mysql.com/doc/refman/8.0/en/information-schema-tables-table.html)
- MySQL 8.0 Reference Manual: mysqlbinlog Utility (https://dev.mysql.com/doc/refman/8.0/en/mysqlbinlog.html)
- Percona Audit Log Plugin Documentation (https://docs.percona.com/percona-server/8.0/audit-log-plugin.html)

## Issues Found

1. **Description mismatch**: The post description (line 7) claimed the post covers "performance schema, triggers on metadata tables" but the actual content covers binary log, INFORMATION_SCHEMA, and a DDL audit table approach. Fixed the description to accurately reflect the content.

2. **Incorrect Percona Audit Log jq field names**: The jq command for filtering the Percona audit log used `.class` and `.command` as field names. The Percona Audit Log Plugin JSON format wraps entries in an `audit_record` object and uses `command_class` for the SQL command type (e.g., `create_table`, `alter_table`). Fixed to use `.audit_record.command_class`.

3. **Misleading Method 4 title**: The section was titled "DDL Audit Table with Event Scheduler" but no MySQL event was actually defined in the code — only a table and an initial snapshot INSERT. Renamed to "DDL Audit Table with Schema Snapshots" to accurately describe the content.

## Review Notes
- The alerting script uses `date -d '5 minutes ago'` which is GNU coreutils syntax (Linux). This will not work on macOS/BSD where the equivalent is `date -v-5M`. Since MySQL servers typically run on Linux, this is acceptable but worth noting.
- Method 3 correctly notes that `update_time` in InnoDB only reflects DML changes, not ALTER TABLE operations. This is accurate for MySQL 8.0+.
- The binary log section correctly states that DDL is always logged in statement format regardless of `binlog_format` setting.
- Method 4 shows a schema snapshot approach but doesn't include the periodic comparison logic (e.g., an Event Scheduler job to detect new/dropped tables). This is a content gap rather than a technical error.
