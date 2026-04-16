# Validation Summary: How to Fix 'Cannot execute query in readonly mode' in ClickHouse

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- ClickHouse (server configuration, users.xml profiles, SQL-driven access control)
- ClickHouse system tables (`system.settings`, `system.users`, `system.settings_profile_elements`, `system.replicas`)
- `clickhouse-connect` (official Python driver)
- HTTP interface (port 8123) query parameters
- Linux systemd / filesystem permissions

## Sources Consulted
- ClickHouse official docs: https://clickhouse.com/docs/en/operations/settings/permissions-for-queries (readonly levels and semantics)
- ClickHouse error codes reference (Code 164 = READONLY)
- ClickHouse docs: `system.settings_profile_elements` schema (columns `profile_name`, `setting_name`, `value`)
- ClickHouse docs: `system.users` schema (`name`, `storage`, `auth_type`)
- ClickHouse docs: `system.replicas` schema (`is_leader`, `is_readonly`, `total_replicas`, `active_replicas`, `database`, `table`)
- ClickHouse docs: `ALTER SETTINGS PROFILE` syntax (requires `MODIFY SETTINGS` / `ADD SETTINGS`)
- ClickHouse docs: `SYSTEM RELOAD CONFIG` / `SYSTEM RELOAD USERS` statements
- ClickHouse replication architecture notes (multi-leader; any healthy replica accepts writes)
- `clickhouse-connect` PyPI / GitHub (pip name `clickhouse-connect`, import `clickhouse_connect`)

## Issues Found
1. **Wrong column names on `system.settings_profile_elements`** — post referenced columns `profile` and `name`. Actual columns are `profile_name` and `setting_name`. Fixed the diagnostic query.
2. **Invalid `ALTER SETTINGS PROFILE` syntax** — post used `SETTINGS readonly = 0`. The correct form requires `MODIFY SETTINGS` (or `ADD SETTINGS`). Fixed to `ALTER SETTINGS PROFILE my_profile MODIFY SETTINGS readonly = 0`.
3. **SIGHUP for config reload is not documented** — `kill -HUP` is not an officially supported reload mechanism. ClickHouse auto-reloads config files and exposes `SYSTEM RELOAD CONFIG` / `SYSTEM RELOAD USERS` as the explicit SQL commands. Replaced the SIGHUP / `systemctl reload` block with the SQL statements.
4. **"Connect to the primary/leader shard for write operations" is inaccurate** — ClickHouse replication is multi-leader; any healthy (non-readonly) replica can accept writes. The `is_leader` flag governs which replica schedules background merges, not which one receives writes. Rewrote Fix 4 to explain that replicas enter a read-only state when they lose their ZooKeeper/Keeper connection, and to route writes to a healthy replica.
5. **Summary updated** to remove the "connecting to a primary node" framing, aligning with the corrected Fix 4.

## Review Notes
- Error code 164 (`READONLY`) and the three `readonly` level semantics (0/1/2) are correct.
- `clickhouse_connect` import name is correct; the pip package is `clickhouse-connect` (hyphen).
- `users.xml` root element `<clickhouse>` is correct for modern versions (older installs used `<yandex>`; ClickHouse still accepts both, but `<clickhouse>` is the current convention).
- The XML path `users.d/users.xml` is conventional; any file under `users.d/` is merged.
- Fix 6 note that `SET max_execution_time = 300` is allowed under `readonly=2` is correct (only `readonly` itself and `allow_ddl` are locked down in that mode).
- Readers on very old ClickHouse versions (< 20.x) may not have SQL-driven access control (`ALTER SETTINGS PROFILE`), but the note "ClickHouse 22.x+" in Fix 2 is reasonable coverage.
