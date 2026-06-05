# Validation Summary: How to Containerize a PHP Laravel Application with Docker

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Docker and Docker Compose
- PHP 8.3 and PHP-FPM
- Laravel
- Nginx
- Supervisor
- Composer
- Node.js / Vite
- PostgreSQL
- Redis
- PHP OPcache

## Sources Consulted
- Laravel 12 deployment documentation: https://laravel.com/docs/12.x/deployment
- Laravel 12 database documentation: https://laravel.com/docs/12.x/database
- Laravel 12 queue documentation: https://laravel.com/docs/12.x/queues
- Laravel 12 cache documentation: https://laravel.com/docs/12.x/cache
- Laravel 12 application skeleton `.env.example`: https://raw.githubusercontent.com/laravel/laravel/12.x/.env.example
- Composer CLI documentation: https://getcomposer.org/doc/03-cli.md
- PHP OPcache runtime configuration manual: https://www.php.net/manual/en/opcache.configuration.php
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose deploy specification: https://docs.docker.com/reference/compose-file/deploy/
- Dockerfile reference: https://docs.docker.com/reference/builder

## Issues Found
- The Docker health checks used `/health`, but Laravel's built-in health route is `/up` by default. Updated the Dockerfile and production Compose health checks to use `/up`.
- The entrypoint used `php artisan db:monitor --max=1` as a readiness check. Laravel documents `db:monitor` as a database connection-count monitoring command that dispatches `DatabaseBusy` events, not as a readiness probe. Replaced it with `php artisan db:show --database="${DB_CONNECTION:-pgsql}"`, which is an Artisan database inspection command that validates the configured connection can be reached.
- The Compose examples used `CACHE_DRIVER=redis`. Current Laravel application skeletons use `CACHE_STORE` for the default cache store. Updated the development, production app, and scheduler environments to use `CACHE_STORE=redis`.
- The PHP OPcache configuration included `opcache.fast_shutdown = 1`, which PHP removed in 7.2. Removed the obsolete directive from the PHP 8.3 configuration.
- The production scheduler service reused the image entrypoint but did not set the same required Laravel environment as the app service, and it would run migrations by default. Added `APP_KEY`, `DB_CONNECTION`, Redis-related Laravel variables, and `RUN_MIGRATIONS: "false"` for the scheduler.
- The project structure omitted the `docker/supervisor` directory and `docker/entrypoint.sh` even though later snippets referenced them. Added those entries to the tree.

## Review Notes
- The Nginx example is broadly consistent with Laravel's requirement to serve requests from the `public` directory, though Laravel's official deployment example uses a stricter `^/index\.php(/|$)` PHP location.
- Running `config:cache`, `route:cache`, and `view:cache` is correct for production, but `route:cache` will fail in applications that still define closure routes.
- The development Compose file still builds from the production Dockerfile, so teams may want a separate development target if they need different OPcache or asset-watching behavior.
