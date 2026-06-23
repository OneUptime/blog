# Validation Summary: How to Use Laravel Telescope for Debugging

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PHP
- Laravel (framework)
- Laravel Telescope (debugging/monitoring package)
- Eloquent ORM
- Laravel Queues / Jobs
- Laravel Mail & Notifications
- Laravel Cache
- Redis (referenced)

## Sources Consulted
- Official Laravel Telescope documentation: https://laravel.com/docs/12.x/telescope
- Telescope default config file (source of truth for config keys): https://github.com/laravel/telescope/blob/master/config/telescope.php
- `Telescope` class source (public API methods): https://github.com/laravel/telescope/blob/master/src/Telescope.php
- `IncomingEntry` class source (filter helper methods): https://github.com/laravel/telescope/blob/master/src/IncomingEntry.php

## Issues Found

1. **Incorrect comment on `Telescope::night()`** — The post described `Telescope::night()` with the comment "Only enable Telescope in local environment by default / Remove this block to enable in all environments." `night()` is a real method, but it only enables the dashboard's **dark theme** — it has nothing to do with environment gating. Corrected the comment to accurately describe the dark theme and pointed environment access control to the `gate()` method.

2. **Fabricated `'pruning'` config block (main config)** — The post included a `'pruning' => ['enabled' => ..., 'hours' => ...]` section in `config/telescope.php`. No such key exists in the official Telescope config; pruning duration is controlled solely by the `telescope:prune --hours=N` command flag (which the post correctly demonstrates later in the "Data Pruning and Maintenance" section). Removed the dead config block. The referenced `TELESCOPE_PRUNING_ENABLED` / `TELESCOPE_PRUNING_HOURS` env vars are not read by Telescope.

3. **Fabricated `'pruning'` config block (production config)** — Same issue repeated in the production-safe config example. Removed it.

4. **Dead `TELESCOPE_PRUNING_HOURS` env var** — Removed from the `.env.production` example since Telescope does not read it.

5. **Non-existent `Telescope::monitoredTags()` call** — The production filtering example called `Telescope::monitoredTags(['important', 'debug', 'critical'])`. No such public static method exists on the `Telescope` class. Monitored tags are designated from the Telescope dashboard's "Monitored Tags" screen and stored in the `telescope_monitoring` table, then matched at filter time by `IncomingEntry::hasMonitoredTag()`. Replaced the fabricated call with an accurate explanatory comment.

6. **Incorrect directory-structure diagram** — The installation diagram listed `storage/framework/cache/telescope` as where Telescope stores "Cached data." Telescope does not create that path; it publishes its front-end assets to `public/vendor/telescope`. Corrected the diagram node.

7. **Misleading Redis storage-driver comment** — The production config carried the comment "Use Redis for better performance in production" next to `'driver' => env('TELESCOPE_DRIVER', 'database')`. Telescope ships only the `database` storage driver, so the comment implied an unsupported option. Reworded to state that Telescope ships with the `database` driver.

## Review Notes
- The watcher list, config keys (`domain`, `path`, `driver`, `enabled`, `watchers`), watcher option formats (`size_limit`, `slow`), and the filter helper methods (`isReportableException()`, `isFailedRequest()`, `isFailedJob()`, `isScheduledTask()`, `isSlowQuery()`, `hasMonitoredTag()`) were all verified against the official source and are correct. Note `isFailedRequest()` does exist on `IncomingEntry` even though it is not part of the documented default filter.
- `Telescope::tag()`, `Telescope::filter()`, `Telescope::hideRequestParameters()`, `Telescope::hideRequestHeaders()`, `Telescope::isRecording()`, `Telescope::startRecording()`, and `Telescope::stopRecording()` are all valid public APIs.
- The CLI commands (`telescope:install`, `telescope:publish`, `telescope:prune`, `telescope:prune --hours=N`, `telescope:clear`) and the `php artisan migrate` step are all correct and current.
- **Version caveat:** the scheduled-pruning example uses `app/Console/Kernel.php` with a `schedule()` method. This is the pre-Laravel-11 convention. In Laravel 11+ (the current major line) scheduling moved to `routes/console.php` (e.g. `Schedule::command('telescope:prune')->daily();`). The `Console/Kernel.php` approach still works if the file is present, so it was left as-is, but readers on a fresh Laravel 11/12 app should use the newer location.
- The Eloquent, queue, mail, notification, event, and cache code examples are idiomatic and syntactically correct; they are illustrative scaffolding rather than runnable end-to-end programs (they reference app-specific models/services that are not defined), which is appropriate for a tutorial.
