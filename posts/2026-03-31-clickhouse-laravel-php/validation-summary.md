# Validation Summary: How to Use ClickHouse with Laravel PHP

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (analytical database)
- Laravel (PHP framework)
- smi2/phpClickHouse (`ClickHouseDB\Client`) PHP client library
- Laravel service providers, dependency injection, queues
- Laravel Sanctum (authentication middleware)
- Composer (PHP package manager)

## Sources Consulted
- smi2/phpClickHouse GitHub repository and README: https://github.com/smi2/phpClickHouse
- ClickHouseDB\Client source code for constructor signature, `select()`, `insert()`, `database()`, `setTimeout()`, `setConnectTimeOut()`, `ping()` methods
- ClickHouse official documentation for SQL syntax: `generateUUIDv4()`, `LowCardinality`, `DateTime64`, `MergeTree` engine, `toYYYYMM()`, `toStartOfWeek()`, `dateDiff()`, `uniq()`, `toStartOfHour()`, `toDate()`
- Laravel documentation for service providers, `DeferrableProvider` interface, queue jobs, Artisan commands, routing, validation rules
- ClickHouse HTTP interface documentation (default port 8123)

## Issues Found

### 1. Misleading `vendor:publish` command (removed)
**What was wrong:** The post included `php artisan vendor:publish --provider="App\Providers\ClickHouseServiceProvider"` before the config file section, but the custom service provider never registers any publishable assets (no `$this->publishes(...)` call in a `boot()` method). Running this command would output "No publishable resources" and do nothing.
**What was changed:** Removed the `vendor:publish` command. The post already had the correct instruction immediately after: "Create the config file manually."

### 2. Broken retention cohort query (rewritten)
**What was wrong:** The `retentionCohorts()` method's SQL subquery used `GROUP BY user_id, toStartOfWeek(ts)` with `min(ts)` as an aggregate. Since all rows in each group share the same week, `toStartOfWeek(min(ts))` always equals `toStartOfWeek(ts)`, making `cohort_week` the current row's week (not the user's first-ever week) and `week_number` always 0. The cohort retention analysis was completely non-functional.
**What was changed:** Rewrote the subquery to use an `INNER JOIN` with a separate subquery that computes each user's true cohort week (`toStartOfWeek(min(ts)) ... GROUP BY user_id`), then joins back to all events to correctly calculate `week_number` as the difference between the cohort week and each activity week.

## Review Notes
- The `provides()` method is defined on `ClickHouseServiceProvider` but the class does not implement `Illuminate\Contracts\Support\DeferrableProvider`. Without that interface, Laravel never calls `provides()` and the provider loads eagerly. The code works correctly but the `provides()` method is dead code — it could be removed or the class could implement `DeferrableProvider` if deferred loading is desired.
- The post uses `:paramName` client-side binding syntax with the `select()` method, which is functional and documented in the library. The library also supports `{paramName:Type}` server-side parameterized queries, which offer stronger type safety. Both are valid approaches.
- Provider registration via `config/app.php` is shown, which is the standard approach for Laravel 10 and earlier. Laravel 11+ moved provider registration to `bootstrap/providers.php`. The post doesn't specify a Laravel version, so this is acceptable but worth noting for readers on newer versions.
- The `ingest` controller endpoint does not validate or sanitize the `days`/`hours`/`limit` query parameters against negative values or unreasonably large numbers. The `topPages` method caps `limit` at 100, which is good, but other endpoints pass user input directly to ClickHouse queries.
