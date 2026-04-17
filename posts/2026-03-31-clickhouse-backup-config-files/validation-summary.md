# Validation Summary: How to Back Up ClickHouse Configuration Files

## Status
validated

## Post Type
Tutorial / Operational Guide

## Technologies Covered
- ClickHouse (server configuration, RBAC, storage policies, system tables)
- Bash shell scripting
- Cron (scheduled jobs)
- Git (version control for configs)
- systemd (service restart)

## Sources Consulted
- ClickHouse `system.storage_policies` documentation: https://clickhouse.com/docs/en/operations/system-tables/storage_policies
- ClickHouse `system.disks` documentation: https://clickhouse.com/docs/en/operations/system-tables/disks
- ClickHouse `SHOW CREATE` statements: https://clickhouse.com/docs/en/sql-reference/statements/show
- ClickHouse `TabSeparatedRaw` / `TSVRaw` format: https://clickhouse.com/docs/en/interfaces/formats/TabSeparatedRaw
- ClickHouse server configuration file locations: https://clickhouse.com/docs/en/operations/configuration-files
- ClickHouse access control storage: https://clickhouse.com/docs/en/operations/access-rights

## Issues Found
1. **Invalid `system.storage_policies` query.** The original SQL selected a non-existent column `disk_name` and joined `system.disks` on `d.name = sp.volume_name`, which is a nonsensical condition (disk names and volume names are separate namespaces). The actual `system.storage_policies` table exposes disks as an `Array(String)` column named `disks`, not a scalar `disk_name`. I rewrote the query to use `arrayJoin(disks) AS disk_name` on `system.storage_policies` directly (no JOIN needed) so it executes correctly and still surfaces per-disk rows with policy, volume, max part size, and move factor.

## Review Notes
- The configuration file paths, RBAC location (`/var/lib/clickhouse/access/`), metadata location (`/var/lib/clickhouse/metadata/`), and data location (`/var/lib/clickhouse/store/`) are all correct for standard ClickHouse installations.
- `TSVRaw` is a valid output format (alias for `TabSeparatedRaw`).
- `SHOW CREATE ROLE` and `SHOW CREATE USER` are valid ClickHouse statements.
- The "Exporting User and Role Definitions" section uses `SELECT 'CREATE USER ' || name || ' ...'` — this is intentionally a placeholder (the trailing `' ...'` literal signals so) rather than a runnable dump. For a real restore-ready export, `SHOW CREATE USER <name>` (analogous to the `SHOW CREATE ROLE` line that follows) would be more useful. Left as-is since it is not technically incorrect and matches the author's "document manually" framing.
- The `cp -r` restore pattern will copy into the existing target directory as a nested subdirectory on some systems depending on trailing slash semantics. Operators should verify the resulting layout matches `/etc/clickhouse-server/config.xml` (not `/etc/clickhouse-server/etc-clickhouse-server/config.xml`). Not strictly wrong, but worth validating in practice.
- Using Git for config is a good pattern; the example omits setting up the remote and creating the main branch. Operators will need `git remote add origin <url>` and an initial branch before `git push origin main` works. This is implicit context and not a technical error.
