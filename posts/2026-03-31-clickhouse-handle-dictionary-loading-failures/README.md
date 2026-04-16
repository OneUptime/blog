# How to Handle Dictionary Loading Failures in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Dictionary, Error Handling, Reliability, Troubleshooting

Description: Learn how to handle ClickHouse dictionary loading failures gracefully, including fallback behavior, alerts, and recovery procedures.

---

## What Happens When a Dictionary Fails to Load

When ClickHouse cannot load a dictionary (source unavailable, query fails, file missing), the behavior depends on whether the dictionary was ever successfully loaded before:

- First load fails: the dictionary stays in `NOT_LOADED` status and queries using it throw exceptions.
- Refresh fails: the dictionary continues serving stale data from the last successful load.

## Check Dictionary Status

```sql
SELECT
    name,
    status,
    last_successful_update_time,
    last_exception,
    loading_duration
FROM system.dictionaries
ORDER BY last_successful_update_time DESC;
```

Status values:
- `NOT_LOADED` - never loaded, no data available
- `LOADING` - currently loading
- `LOADED` - successfully loaded
- `FAILED` - last load attempt failed
- `LOADED_AND_RELOADING` - loaded successfully and currently being reloaded
- `FAILED_AND_RELOADING` - load failed and currently being reloaded

## Graceful Fallback with dictGetOrDefault

Always use `dictGetOrDefault` or `dictGetStringOrDefault` to provide fallback values:

```sql
SELECT
    user_id,
    dictGetStringOrDefault('user_tier_dict', 'tier', user_id, 'unknown') AS tier
FROM events
LIMIT 100;
```

Never rely on exceptions being thrown - handle missing keys at the query level.

## Check for NOT_LOADED Before Querying

```sql
SELECT status FROM system.dictionaries WHERE name = 'my_dict';
-- If status != 'LOADED', handle accordingly in your application
```

## Monitor Loading Failures with Alerts

Query `system.dictionaries` in a monitoring script or Grafana alert:

```sql
SELECT
    name,
    status,
    last_exception
FROM system.dictionaries
WHERE status IN ('FAILED', 'NOT_LOADED')
  AND name NOT IN ('expected_disabled_dict');
```

## Force Reload After Fixing Source

```sql
SYSTEM RELOAD DICTIONARY my_dict;
```

## Common Failure Causes and Fixes

MySQL connection refused:

```sql
-- Test MySQL connectivity
SELECT * FROM mysql('mysql-host:3306', 'db', 'table', 'user', 'pass') LIMIT 1;
```

File not found:

```bash
ls -la /var/lib/clickhouse/user_files/my_dict.csv
# Fix permissions or create the file
```

HTTP timeout:

```text
-- Increase timeout in config.xml
<dictionaries_config>
    <comment>Check /etc/clickhouse-server/config.d/</comment>
</dictionaries_config>
```

## Prevent Startup Failures

A slow or unavailable dictionary source can delay server startup if dictionaries are loaded eagerly. Lazy loading defers loading until the dictionary is first used. In recent ClickHouse versions this is the default (`dictionaries_lazy_load` defaults to `true`), but on older versions or if it has been disabled, make sure it is enabled in `config.xml`:

```text
<dictionaries_lazy_load>true</dictionaries_lazy_load>
```

Note that `LIFETIME(MIN 0 MAX 3600)` controls how often a loaded dictionary is refreshed, not whether it is loaded lazily — lazy loading is controlled by the server setting above.

## Test Dictionary Before Deploying

```sql
-- Test that the dictionary loads successfully
SYSTEM RELOAD DICTIONARY new_dict;

SELECT status, last_exception
FROM system.dictionaries
WHERE name = 'new_dict';

-- Test a lookup
SELECT dictGetString('new_dict', 'name', toUInt64(1));
```

## Summary

Dictionary loading failures in ClickHouse are gracefully handled by serving stale data during refresh failures. Use `dictGetOrDefault` to handle missing keys, monitor `system.dictionaries` for failed dictionaries, and use lazy loading to prevent startup delays from slow sources.
