# Validation Summary: How to Use ClickHouse PHP Client

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (column-oriented OLAP database)
- PHP
- smi2/phpclickhouse library (ClickHouse HTTP client for PHP)
- Composer (PHP dependency manager)

## Sources Consulted
- smi2/phpClickHouse GitHub repository: https://github.com/smi2/phpClickHouse
- smi2/phpClickHouse source code (`src/Client.php`, `src/Statement.php`, `src/Settings/Settings.php`)
- Packagist listing for smi2/phpclickhouse
- ClickHouse HTTP interface documentation: https://clickhouse.com/docs/en/interfaces/http

## Issues Found

### 1. `insert()` called with associative array rows (Fixed)
**What was wrong:** The blog passed associative arrays as row data to `$db->insert()`:
```php
$db->insert('events', [
    ['id' => 1, 'event_date' => '2024-01-01', 'event_type' => 'pageview'],
    ...
], ['id', 'event_date', 'event_type']);
```
The `insert()` method expects indexed (positional) arrays for rows, not associative arrays. The column names are provided separately as the third argument. The library has a separate `insertAssocBulk()` method for associative arrays.

**What was changed:** Replaced associative array rows with indexed arrays matching the column order:
```php
$db->insert('events', [
    [1, '2024-01-01', 'pageview'],
    [2, '2024-01-02', 'click'],
], ['id', 'event_date', 'event_type']);
```

### 2. `enableQueryConditions()` incorrectly placed in async example (Fixed)
**What was wrong:** The async queries section called `$db->enableQueryConditions()` before the async queries, implying it is required for async functionality. This method actually enables conditional query building (IF/ELSE style conditions), which is unrelated to async execution.

**What was changed:** Removed the `$db->enableQueryConditions()` call from the async example. The `selectAsync()` and `executeAsync()` methods work without it.

## Review Notes
- The library also provides `insertAssocBulk()` for inserting associative array rows, which could be mentioned as an alternative in a future update.
- All other API usage (`select()`, `write()`, `insertBatchFiles()`, `selectAsync()`, `executeAsync()`, `fetchOne()`, parameterized queries with `:name` bindings) was verified as correct against the library source code.
- The `setTimeout()` and `setConnectTimeOut()` method names and casing were verified as correct (note the capital T in `TimeOut`).
