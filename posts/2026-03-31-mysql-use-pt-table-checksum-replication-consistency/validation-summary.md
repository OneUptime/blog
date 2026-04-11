# Validation Summary: How to Use pt-table-checksum for MySQL Replication Consistency

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL replication
- Percona Toolkit (`pt-table-checksum`, `pt-table-sync`)
- SQL (user creation, privilege grants, checksum queries)

## Sources Consulted
- Percona Toolkit official documentation: https://docs.percona.com/percona-toolkit/pt-table-checksum.html
- Percona Toolkit `--tables`, `--max-lag`, `--replicate`, `--no-check-binlog-format` option documentation
- Percona checksums table schema documentation

## Issues Found
- **Outdated column names in checksums query**: The SQL query in the "Reading Results" section used `master_cnt` and `master_crc` as column names. These were renamed to `source_cnt` and `source_crc` in Percona Toolkit 3.3.0+ as part of inclusive terminology changes. Updated all references in the SELECT list and WHERE clause to use the current `source_cnt`/`source_crc` naming.

## Review Notes
- The "Reading Results" SQL query should be run on a **replica**, not the primary, since `this_cnt`/`this_crc` reflect local data while `source_cnt`/`source_crc` reflect replicated values from the primary. The post does not explicitly state this, though it is implied by context. This is a clarity issue, not a technical error.
- The privilege list omits `SUPER` (MySQL 5.x) or `SYSTEM_VARIABLES_ADMIN`/`SESSION_VARIABLES_ADMIN` (MySQL 8.0+), which may be needed if the server uses ROW or MIXED binlog format and pt-table-checksum needs to set session-level `binlog_format=STATEMENT`. This is situational and not always required, so it is not an error in the post.
