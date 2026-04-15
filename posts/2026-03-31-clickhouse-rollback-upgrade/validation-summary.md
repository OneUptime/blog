# Validation Summary: How to Roll Back a ClickHouse Upgrade

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- ClickHouse (server, client, system tables)
- Debian/Ubuntu package management (apt-get, dpkg)
- ClickHouse BACKUP/RESTORE with S3
- Bash scripting for cluster administration
- ClickHouse system tables: system.parts, system.errors, system.replicas, system.query_log, system.backups, system.tables

## Sources Consulted
- ClickHouse official documentation — system.parts table columns: https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse official documentation — system.backups table columns: https://clickhouse.com/docs/en/operations/system-tables/backups
- ClickHouse official documentation — BACKUP/RESTORE syntax: https://clickhouse.com/docs/en/operations/backup
- Debian package naming conventions: https://www.debian.org/doc/manuals/debian-faq/pkg-basics.en.html
- ClickHouse packages repository: https://packages.clickhouse.com/deb/pool/main/c/clickhouse-client/

## Issues Found

1. **Misleading SQL comment and wrong column (`data_version`)**: The comment "Check the data format of recent parts" and the use of `data_version` in the second query of the "When Rollback is Possible" section were incorrect. `data_version` in `system.parts` tracks mutation sequence numbers, not data format versions. Changed the comment to "Check recently modified parts and their storage type" and replaced `data_version` with `part_type` and `rows_count`, which are more useful for rollback assessment.

2. **Misleading SQL comment on first query**: The comment "Check the minimum compatible ClickHouse version for existing parts" was inaccurate — the query only shows block number ranges per table, not version compatibility. Changed to "Review active parts distribution across tables."

3. **Incorrect .deb package filenames in rollback script**: The dpkg commands in the single-node rollback script used hyphens between package name and version (e.g., `clickhouse-common-static-${PREVIOUS_VERSION}.deb`), but `apt-get download` saves files following Debian convention with underscores (e.g., `clickhouse-common-static_24.6.1_amd64.deb`). The original filenames would cause `dpkg -i` to fail with "file not found." Fixed to use underscore-based naming with a wildcard for the architecture suffix.

4. **Invalid RESTORE syntax (`SETTINGS async = true`)**: In ClickHouse, `ASYNC` is a keyword placed directly after `RESTORE` (i.e., `RESTORE ASYNC ALL FROM ...`), not a `SETTINGS` parameter. The original `SETTINGS async = true` syntax would produce a parsing error. Fixed to `RESTORE ASYNC ALL FROM ...`.

5. **Non-existent column `num_processed_files` in `system.backups`**: The column `num_processed_files` does not exist in the `system.backups` table. The correct column for tracking restore progress is `files_read`. Fixed accordingly.

## Review Notes
- The `system.errors` monitoring query uses `sum(value)` which sums total error counts since server start, not just errors in the last 30 minutes. However, since the server is typically restarted during an upgrade, these values effectively reflect post-upgrade errors, making this acceptable in context.
- The post is Debian/Ubuntu-focused (apt-get, dpkg). Users on RHEL/CentOS would need equivalent yum/rpm commands, but this is a reasonable scope choice, not an error.
- The RESTORE example omits S3 credentials, which is valid when using IAM instance roles but may confuse readers who expect explicit credentials.
