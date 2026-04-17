# Validation Summary: How to Back Up ClickHouse Access Control Data

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- ClickHouse SQL-driven access control (users, roles, quotas, settings profiles, row policies)
- `clickhouse-client` CLI
- Bash scripting
- systemd (for service management)
- ClickHouse native `BACKUP` command

## Sources Consulted
- ClickHouse Access Rights documentation: https://clickhouse.com/docs/en/operations/access-rights
- `system.users` system table: https://clickhouse.com/docs/en/operations/system-tables/users
- `system.quotas` system table: https://clickhouse.com/docs/en/operations/system-tables/quotas
- `SHOW` statements reference: https://clickhouse.com/docs/en/sql-reference/statements/show
- Formats reference (TSVRaw / TabSeparatedRaw): https://clickhouse.com/docs/en/interfaces/formats
- Backup and Restore documentation: https://clickhouse.com/docs/en/operations/backup
- ClickHouse server configuration (`access_control_path`): https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings

## Issues Found
1. **Invalid column `tracking_type` in `system.quotas`.** The verification SQL used `SELECT name, tracking_type FROM system.quotas`, but `system.quotas` does not have a `tracking_type` column. The actual columns are `name`, `id`, `storage`, `keys`, `durations`, `apply_to_all`, `apply_to_list`, and `apply_to_except`. Fixed by replacing `tracking_type` with `keys`, which is the column that describes how a quota is tracked/shared (e.g., by user, IP, client key).

## Review Notes
- `TSVRaw` is accepted by ClickHouse as an alias for the canonical `TabSeparatedRaw` format, so the code examples work as written.
- `SHOW GRANTS FOR <role>` works in practice because roles are valid grantees, though the documented syntax describes it in terms of users. Accepted as-is.
- The claim that `BACKUP DATABASE` does not automatically include access control is accurate for database-scoped backups. Note that `BACKUP ALL` can include SQL-defined access entities, but the post correctly scopes its example to `BACKUP DATABASE production` so the statement is valid in context.
- `/var/lib/clickhouse/access/` is the correct default for the `access_control_path` setting.
- The while-read loops over user/role/quota/profile names will not correctly handle names containing whitespace or special characters, but this is a reasonable simplification for typical deployments.
