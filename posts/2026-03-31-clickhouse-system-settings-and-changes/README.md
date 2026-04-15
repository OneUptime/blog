# How to Use system.settings and system.settings_changes in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, system.settings, system.settings_changes, Configuration, Setting, System Table

Description: Use system.settings to view all current ClickHouse settings and their values, and system.settings_changes to track setting modifications across versions.

---

ClickHouse has hundreds of configurable settings that affect query behavior, memory usage, networking, and replication. `system.settings` exposes all current setting values for the active session, while `system.settings_changes` documents how default values changed between ClickHouse versions.

## system.settings

`system.settings` shows all settings applicable to the current session, their values, defaults, and whether they were changed.

Key columns:
- `name` - setting name
- `value` - current value for this session
- `changed` - `1` if the value was changed from the default
- `description` - human-readable explanation
- `min`, `max` - allowed bounds (if applicable)
- `type` - value type (UInt64, String, Bool, etc.)
- `is_obsolete` - whether the setting is deprecated

## Viewing All Current Settings

```sql
SELECT name, value, changed, description
FROM system.settings
ORDER BY name;
```

## Finding Non-Default Settings

```sql
SELECT name, value, description
FROM system.settings
WHERE changed = 1
ORDER BY name;
```

This shows only settings that differ from their defaults - useful for auditing session configuration.

## Looking Up a Specific Setting

```sql
SELECT name, value, description, min, max, type
FROM system.settings
WHERE name LIKE '%memory%'
ORDER BY name;
```

## Checking Memory-Related Settings

```sql
SELECT name, value
FROM system.settings
WHERE name IN (
    'max_memory_usage',
    'max_memory_usage_for_user',
    'max_bytes_before_external_group_by',
    'max_bytes_before_external_sort',
    'max_temporary_data_on_disk_size_for_query'
)
ORDER BY name;
```

## system.settings_changes

`system.settings_changes` documents default value changes that occurred between ClickHouse versions. This is important when upgrading.

```sql
SELECT
    version,
    change.1 AS name,
    change.2 AS previous_value,
    change.3 AS new_value,
    change.4 AS reason
FROM system.settings_changes
ARRAY JOIN changes AS change
ORDER BY version DESC, name
LIMIT 50;
```

## Finding Changes for a Specific Setting

```sql
SELECT
    version,
    change.2 AS previous_value,
    change.3 AS new_value,
    change.4 AS reason
FROM system.settings_changes
ARRAY JOIN changes AS change
WHERE change.1 IN ('enable_analyzer', 'allow_experimental_analyzer')
ORDER BY version;
```

## Deprecated Settings

Find obsolete settings still being set:

```sql
SELECT name, value, description
FROM system.settings
WHERE is_obsolete = 1
  AND changed = 1;
```

Remove these from configurations to avoid silent ignoring of settings on future upgrades.

## Applying Settings in Queries

Reference `system.settings` to understand the effective value before a query:

```sql
-- Check what max_rows_to_read is before running a large scan
SELECT value
FROM system.settings
WHERE name = 'max_rows_to_read';

-- Run with the confirmed setting
SELECT count() FROM large_table
SETTINGS max_rows_to_read = 100000000;
```

## Summary

`system.settings` gives a complete view of current session settings in ClickHouse, making it easy to audit configuration and find non-default values. `system.settings_changes` tracks how defaults evolved across versions, which is essential for planning upgrades safely. Use both tables to maintain consistent, documented configuration across your ClickHouse deployment.
