# Validation Summary: How to Use Podman for PHP Development

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- PHP
- Apache HTTP Server with `mod_php`
- PHP-FPM
- Nginx
- Composer
- Laravel
- MySQL
- Redis
- Xdebug
- Compose-based multi-container workflows

## Sources Consulted
- Podman documentation: What is Podman? - https://docs.podman.io/en/v5.3.1/
- Podman documentation: `podman compose` - https://docs.podman.io/en/v5.6.2/markdown/podman-compose.1.html
- Podman documentation: `podman run` volume labels and host entries - https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Docker Official Image: PHP - https://hub.docker.com/_/php
- Docker Official Image: Composer - https://hub.docker.com/_/composer
- Docker Official Image: MySQL - https://hub.docker.com/_/mysql
- Laravel 11.x Cache documentation - https://laravel.com/docs/11.x/cache
- Laravel 11.x Redis documentation - https://laravel.com/docs/11.x/redis
- Xdebug all settings reference - https://xdebug.org/docs/all_settings
- Docker Docs: How Compose works - https://docs.docker.com/compose/compose-application-model/
- Docker Docs: Compose `version` top-level element - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Control startup order - https://docs.docker.com/compose/how-tos/startup-order/
- Composer CLI documentation - https://getcomposer.org/doc/03-cli.md
- Composer scripts documentation - https://getcomposer.org/doc/articles/scripts.md
- PHP supported versions - https://www.php.net/supported-versions.php

## Issues Found
- The post used `podman-compose` directly and named the file `docker-compose.yml`, but current Podman documents `podman compose` as the supported wrapper around an external compose provider. I updated the commands to `podman compose`, changed the example filename to `compose.yaml`, and added a note that a compose provider must be installed.
- Both Compose snippets declared `version: "3.8"`. Current Compose documentation marks the top-level `version` field as obsolete, so I removed it from both YAML examples.
- The Laravel Redis example set `CACHE_DRIVER=redis` without installing a Redis client. Current Laravel documentation uses `CACHE_STORE`, and Laravel's default Redis client is PhpRedis. I changed the environment variable to `CACHE_STORE`, added `REDIS_CLIENT: phpredis`, and installed the `redis` extension in the Laravel image.
- The Laravel startup sequence jumped straight from `up -d` to Artisan commands. Because the app source is bind-mounted, build-time dependencies can be hidden by the mount, and Compose startup order does not guarantee MySQL readiness. I added `podman compose exec app composer install` and clarified that migrations should run after MySQL finishes initializing.
- The PHP-FPM and Nginx section referenced `Containerfile.fpm` without defining it, so the example was incomplete. I added the missing `Containerfile.fpm` snippet.
- The PHP-FPM and Nginx example mounted the same source tree into two containers using `:Z`. Podman documents `:Z` as a private label and `:z` for shared content, so I changed the shared code mounts to `:z`.
- The PHP-FPM example included a MySQL service but did not pass matching database environment variables into the PHP service. I added the `DB_*` variables so the example aligns with the stack it defines.
- The PHPUnit coverage example used a custom image name without context. I clarified that `my-php-dev` is a custom image that must include Xdebug or PCOV for coverage to work.

## Review Notes
- The examples still pin PHP `8.3`. As of 2026-05-07, PHP 8.3 is still supported until 2027-12-31, but it is already in security-fixes-only support. A future refresh could reasonably move the examples to PHP 8.4 or 8.5.
