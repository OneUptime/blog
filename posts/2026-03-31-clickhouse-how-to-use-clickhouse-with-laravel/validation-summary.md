# Validation Summary: How to Use ClickHouse with Laravel

## Status
validated

## Post Type
Tutorial / Integration guide

## Technologies Covered
- ClickHouse (HTTP interface, port 8123)
- Laravel (PHP framework, config and service container)
- PHP
- `smi2/phpclickhouse` (PHP ClickHouse client)
- `bavix/laravel-clickhouse` (Laravel wrapper)
- Composer (dependency management)

## Sources Consulted
- smi2/phpClickHouse README: https://github.com/smi2/phpClickHouse
- smi2/phpClickHouse raw README (parameter binding syntax): https://raw.githubusercontent.com/smi2/phpClickHouse/master/README.md
- Packagist — bavix/laravel-clickhouse: https://packagist.org/packages/bavix/laravel-clickhouse
- Laravel configuration docs: https://laravel.com/docs/configuration
- ClickHouse SQL reference (INTERVAL, now()): https://clickhouse.com/docs/en/sql-reference

## Issues Found
- **Non-existent Laravel wrapper package.** The post recommended `composer require glprlabs/laravel-clickhouse`, but that package does not exist on Packagist or GitHub. Replaced it with `bavix/laravel-clickhouse`, a real and widely-used (217k+ installs) Laravel ClickHouse integration. This keeps the author's intent (offering a Laravel-specific alternative) while pointing readers to a genuine package.

## Review Notes
- The `:name` PDO-style parameter binding used in `select()` (e.g., `:days`) is supported by `smi2/phpclickhouse` — confirmed in the library's README (`SELECT * FROM my_table WHERE id = :id`). No change needed.
- `ClickHouseDB\Client` constructor signature, plus the `database()`, `ping()`, `select()`, and `insert($table, $rows, $columns)` method shapes all match the current `smi2/phpclickhouse` API.
- The `'driver' => 'clickhouse'` key in the `config/database.php` snippet is not actually consumed anywhere in the post (the service class instantiates `ClickHouseDB\Client` directly rather than going through a registered Laravel driver). This is fine as a readable config namespace, but readers wanting true Laravel DB-facade / Eloquent integration should reach for `bavix/laravel-clickhouse` or similar packages that register an actual driver.
- For stronger safety against SQL injection with dynamic parameters, `smi2/phpclickhouse` also offers `selectWithParams()` with ClickHouse's native `{name:Type}` server-side typed binding — worth mentioning in a future revision but not strictly required for correctness.
- ClickHouse's `INTERVAL N DAY` syntax used in `getTopPages()` is valid standard SQL supported by ClickHouse.
