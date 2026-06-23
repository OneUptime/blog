# Validation Summary: How to Deploy Laravel Applications with Envoy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Laravel Envoy (SSH task runner)
- PHP / Laravel framework
- Blade-style Envoy syntax (`@servers`, `@setup`, `@task`, `@story`, `@error`, `@finished`, `@foreach`)
- Composer (global and project-level installation)
- SSH key authentication (ed25519, ssh-copy-id)
- Zero-downtime deployment via atomic symlink switching
- PHP-FPM, Supervisor (queue workers)
- Vite asset build (`npm ci` / `npm run build`)
- MySQL (mysqldump backups)
- Laravel Artisan commands (migrate, config:cache, route:cache, view:cache, event:cache, down/up, db:monitor, queue:monitor, queue:restart, schedule:run, db:show)
- Slack webhook notifications
- Cron / Laravel scheduler

## Sources Consulted
- Laravel Envoy official documentation — https://laravel.com/docs/12.x/envoy
- Laravel Deployment documentation — https://laravel.com/docs/12.x/deployment
- Laravel Maintenance Mode docs (`artisan down --secret/--retry/--render`) — https://laravel.com/docs/12.x/configuration#maintenance-mode
- Laravel Database (Getting Started — `db:show`, `db:table`, `db:monitor`) — https://laravel.com/docs/12.x/database
- Artisan command reference for `event:cache` — https://artisan.page/12.x/eventcache (available since Laravel 5.8.9)
- Artisan command reference for `db:show --counts` — https://artisan.page/12.x/dbshow
- Laravel Queues documentation (`queue:restart`, `queue:monitor`, `queue:clear`, `queue:retry`) — https://laravel.com/docs/12.x/queues

## Issues Found
1. **Incorrect version annotation for `event:cache`** (zero-downtime optimize task). The comment stated `# Cache events (Laravel 11+)`. The `event:cache` command has existed since Laravel 5.8.9, not Laravel 11. Changed the comment to `# Cache events (Laravel 5.8.9+)`.
2. **Invalid Artisan command `db:table --counts`** (debug:db task). `--counts` is an option of `db:show`, not `db:table`. The `db:table` command requires a specific table name argument and has no `--counts` option, so the command would have errored before the tinker fallback. Changed to `php artisan db:show --counts`, which correctly lists all tables with row counts.

## Review Notes
- The Composer global bin PATH example uses `$HOME/.composer/vendor/bin`. On modern Composer 2 installs that follow the XDG spec, the path may instead be `$HOME/.config/composer/vendor/bin`. Both are valid depending on how `COMPOSER_HOME` is configured, so this was left as-is (the legacy path still works on many setups).
- All Envoy directives (`@servers`, `@setup`, `@task` with `parallel` option, `@story`, `@error`, `@finished`, `@foreach`) are syntactically correct and current.
- `Schema::getTableListing()` (used in the tinker fallback) is correct for Laravel 11+; on older versions `Schema::getAllTables()`/`getConnection()` approaches differ. Acceptable as a best-effort fallback.
- `artisan down --secret=... --retry=... --render=...` flags and the `storage/framework/down` maintenance file path are accurate for current Laravel versions.
- `db:monitor`, `queue:monitor`, `queue:clear`, and `queue:retry` are all valid commands (added in Laravel 9 / available in current versions).
- PHP-FPM service name `php8.2-fpm` is version-pinned; readers on other PHP versions must adjust accordingly (the post is internally consistent in using 8.2 throughout).
