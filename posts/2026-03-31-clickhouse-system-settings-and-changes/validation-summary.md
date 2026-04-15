# Validation Summary: How to Use system.settings and system.settings_changes in ClickHouse

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- ClickHouse
- system.settings system table
- system.settings_changes system table
- ClickHouse SQL dialect

## Sources Consulted
- ClickHouse official documentation for system.settings: https://clickhouse.com/docs/en/operations/system-tables/settings
- ClickHouse official documentation for system.settings_changes: https://clickhouse.com/docs/en/operations/system-tables/settings_changes
- ClickHouse official documentation for settings (max_memory_usage, max_rows_to_read, etc.): https://clickhouse.com/docs/en/operations/settings/settings

## Issues Found

### 1. Critical: system.settings_changes queries used incorrect column structure
**What was wrong:** The blog treated `name`, `previous_default_value`, `new_default_value`, and `reason` as top-level columns of `system.settings_changes`. In reality, `system.settings_changes` has only three top-level columns: `type`, `version`, and `changes` (an `Array(Tuple(name String, previous_value String, new_value String, reason String))`). The nested fields are also named `previous_value` and `new_value`, not `previous_default_value` and `new_default_value`. Both queries against this table would have failed.

**What was changed:** Rewrote both `system.settings_changes` queries to use `ARRAY JOIN changes AS change` to unnest the array, and referenced tuple fields as `change.1`, `change.2`, `change.3`, `change.4` with correct aliases.

### 2. Minor: Incorrect setting name `max_temporary_data_on_disk_size`
**What was wrong:** The setting `max_temporary_data_on_disk_size` is a server-level configuration parameter, not a session-level setting visible in `system.settings`. The correct session-level setting is `max_temporary_data_on_disk_size_for_query`.

**What was changed:** Replaced `max_temporary_data_on_disk_size` with `max_temporary_data_on_disk_size_for_query` in the memory-related settings query.

## Review Notes
- The `system.settings` column list is labeled "Key columns" and omits some columns (`readonly`, `default`, `alias_for`, `disallowed_values`, `tier`). This is acceptable since it's not claiming to be exhaustive.
- The `allow_experimental_analyzer` setting referenced in one query is now an alias for `enable_analyzer` (renamed in ClickHouse 24.8). The query is still valid since aliases continue to work.
- All other SQL syntax, setting names, and technical explanations are accurate.
