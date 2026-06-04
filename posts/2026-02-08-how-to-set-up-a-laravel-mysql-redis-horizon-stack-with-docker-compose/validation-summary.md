# Validation Summary: How to Set Up a Laravel + MySQL + Redis + Horizon Stack with Docker Compose

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Laravel
- PHP-FPM / PHP 8.3
- MySQL
- Redis
- Laravel Horizon
- Laravel queues and scheduler
- Nginx

## Sources Consulted
- Laravel Horizon documentation: https://laravel.com/docs/horizon
- Laravel queue documentation: https://laravel.com/docs/12.x/queues
- Laravel cache documentation: https://laravel.com/docs/12.x/cache
- Laravel configuration documentation: https://laravel.com/docs/11.x/configuration
- Laravel scheduling documentation: https://laravel.com/docs/11.x/scheduling
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose startup order documentation: https://docs.docker.com/compose/how-tos/startup-order/
- Docker Compose version and name top-level elements reference: https://docs.docker.com/reference/compose-file/version-and-name/
- PHP official Docker image documentation: https://hub.docker.com/_/php

## Issues Found
- The Docker Compose example used `version: "3.8"`. Docker's current Compose Specification keeps the top-level `version` field only for backward compatibility and marks it obsolete, so it was removed from the YAML snippet.
- The Laravel environment variables used `CACHE_DRIVER=redis`. Current Laravel cache configuration uses `CACHE_STORE` for the default cache store, so this was changed to `CACHE_STORE: redis`.
- The Dockerfile ran `php artisan config:cache`, `route:cache`, and `view:cache` during image build. Laravel documents `config:cache` as a deployment step after configuration is known; running it during a generic Docker build can bake build-time environment values into the image, and route caching can fail for applications with uncachable routes. The Dockerfile now only generates the optimized Composer autoloader.

## Review Notes
The remaining commands and configuration are technically plausible for a Laravel application that already has Horizon installed and configured. For a future improvement, the guide could explicitly include `composer require laravel/horizon` and `php artisan horizon:install` for fresh Laravel projects, but that omission does not make the shown stack incorrect for an existing Horizon-enabled app.
