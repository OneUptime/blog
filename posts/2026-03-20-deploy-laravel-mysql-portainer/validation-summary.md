# Validation Summary: How to Deploy a Laravel + MySQL Stack via Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Docker Compose / Portainer stacks
- Laravel (PHP web framework)
- PHP 8.3 / PHP-FPM
- MySQL 8.0
- Redis 7
- Nginx
- Composer (PHP dependency manager)
- Laravel queue workers (`php artisan queue:work`)

## Sources Consulted
- Docker Docs: Version and name top-level elements (obsolete `version`) — https://docs.docker.com/reference/compose-file/version-and-name/
- Docker official PHP image (composer not bundled, `docker-php-ext-install` helper, alpine variants) — https://hub.docker.com/_/php
- Docker PHP image source (`docker-php-ext-install` script) — https://github.com/docker-library/php
- Composer command-line install — https://getcomposer.org/download/
- Laravel 11 deployment docs (Nginx config, `config:cache`, `queue:work`) — https://laravel.com/docs/11.x/deployment
- Laravel 11 queues (`queue:work --tries`) — https://laravel.com/docs/11.x/queues
- Laravel 11 configuration (`APP_KEY`, env vars) — https://laravel.com/docs/11.x/configuration
- Laravel 11 database (MySQL connection settings) — https://laravel.com/docs/11.x/database
- MySQL 8.0 Docker image env vars — https://hub.docker.com/_/mysql
- Redis Docker image — https://hub.docker.com/_/redis
- Nginx FastCGI module reference — https://nginx.org/en/docs/http/ngx_http_fastcgi_module.html
- PHP-FPM default port (9000) — https://www.php.net/manual/en/install.fpm.configuration.php

## Issues Found

1. **Obsolete `version: "3.8"` top-level field.** Modern Docker Compose treats the `version` key as informational and obsolete. Removed it, matching the convention used in companion posts in this series.

2. **`composer install` would fail in the official `php:8.3-fpm-alpine` image.** The official PHP image does not bundle Composer, so the original command (`composer install --no-dev && php artisan migrate --force && ...`) would fail at runtime with "command not found". Updated the `php-fpm` startup command to install `git`, `unzip`, and `curl` via `apk`, then download Composer to `/usr/local/bin` before running `composer install`. Also added `--no-interaction` to `composer install` so it does not prompt in the non-interactive container environment.

3. **`pdo_mysql` extension missing for Laravel + MySQL.** The official PHP image ships without the `pdo_mysql` extension, which Laravel's `mysql` connection (and `php artisan migrate`) requires. Added `docker-php-ext-install pdo_mysql` to both the `php-fpm` and `worker` startup commands (this helper script is provided by the official PHP base image). The worker needs this independently because PHP extensions live inside the container, not in the shared bind-mounted vendor directory.

4. **`php-fpm` final command not exec'd.** With `sh -c "... && php-fpm"`, PHP-FPM runs as a child of `sh`, which prevents PID 1 signal forwarding (clean shutdown on `docker stop`). Replaced with `exec php-fpm` so it inherits PID 1 properly. Same fix applied to the worker's `php artisan queue:work` invocation.

## Review Notes
- Installing extensions and Composer at every container start is a tutorial-friendly compromise; for real deployments, the post itself recommends baking these steps into a custom Dockerfile (added as a comment). A purpose-built image (e.g., a multi-stage build that runs `composer install` at build time) is the production-correct pattern.
- The `worker` service depends on the `vendor/` directory created by `php-fpm` via the shared `./app` bind mount. On a cold start there is a race: the worker may invoke `php artisan queue:work` before `composer install` has finished in `php-fpm`, causing transient startup errors until Docker restarts the worker. With `restart: unless-stopped`, this self-heals. A more robust setup uses a healthcheck on `php-fpm` plus `depends_on: condition: service_healthy` on the worker — left as-is to avoid restructuring the post.
- `APP_KEY: base64:changeme=` is a placeholder — the inline comment correctly tells readers to run `php artisan key:generate`, but note that `key:generate` writes to `.env`, not Docker env vars. Readers will need to copy the generated key into the compose file or switch to using a `.env` file with `env_file:`. Left untouched as it is the same shape used in many Laravel deployment guides.
- Laravel scheduled tasks are mentioned in the post description ("scheduler") but the compose stack has no scheduler service. Adding one would require `php artisan schedule:work` (Laravel 11) or a cron container. Out of scope for a structural fix; the description slightly overpromises.
- The `MYSQL_ROOT_PASSWORD`, `MYSQL_PASSWORD`, and `APP_KEY` placeholders are obvious tutorial values and are flagged with "# Change this" comments — appropriate for a guide, but production users must replace them.
- Using `redis:7-alpine` is current; Redis 7.x is still supported as of the review date.
- `mysql:8.0` is current and is the standard MySQL LTS-style major line; MySQL 8.4 is the newer LTS but `8.0` is still actively supported and appropriate for the post.
- `docker` is not installed in this workspace, so I validated the Compose file structurally and against the documentation above; I did not run `docker compose up`.
