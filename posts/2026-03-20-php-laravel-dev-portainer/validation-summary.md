# Validation Summary: How to Set Up a PHP/Laravel Development Environment with Portainer (2)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Laravel
- PHP
- Docker Compose
- Portainer
- Nginx
- MySQL
- Redis
- Xdebug
- Composer
- NPM / Vite
- Mailhog

## Sources Consulted
- Laravel deployment docs: https://laravel.com/docs/11.x/deployment
- Laravel Vite docs: https://laravel.com/docs/11.x/vite
- Laravel cache docs: https://laravel.com/docs/11.x/cache
- Laravel Redis docs: https://laravel.com/docs/11.x/redis
- Laravel starter kits docs: https://laravel.com/docs/11.x/starter-kits
- Laravel application skeleton `.env.example`: https://raw.githubusercontent.com/laravel/laravel/11.x/.env.example
- Laravel application skeleton `config/cache.php`: https://raw.githubusercontent.com/laravel/laravel/11.x/config/cache.php
- Laravel application skeleton `config/mail.php`: https://raw.githubusercontent.com/laravel/laravel/11.x/config/mail.php
- Laravel application skeleton `config/session.php`: https://raw.githubusercontent.com/laravel/laravel/11.x/config/session.php
- Docker Compose version reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker networking how-tos: https://docs.docker.com/desktop/features/networking/networking-how-tos/
- Docker `docker container run` reference (`host-gateway` / `host.docker.internal`): https://docs.docker.com/reference/cli/docker/container/run/
- Docker Official PHP image docs: https://hub.docker.com/_/php
- MySQL Official Image docs: https://hub.docker.com/_/mysql
- MDN `X-XSS-Protection` reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-XSS-Protection

## Issues Found
- The post used `CACHE_DRIVER=redis`, but current Laravel application skeletons use `CACHE_STORE`. I changed it to `CACHE_STORE=redis` so the cache store setting matches current Laravel configuration.
- The post used `MAIL_ENCRYPTION=null`, but current Laravel mail configuration expects `MAIL_SCHEME`. I changed it to `MAIL_SCHEME=null`.
- The Compose example included a top-level `version: "3.8"` key, which current Docker Compose documentation marks as obsolete. I removed it.
- The Nginx service published port `443`, but the post did not configure TLS in Nginx. I removed the unused port mapping.
- The Xdebug setup relied on `host.docker.internal`, which is not automatically available on Linux Docker Engine setups. I added `extra_hosts: - "host.docker.internal:host-gateway"` to the PHP app service so the documented Xdebug config works more reliably with Portainer on Linux hosts.
- The MySQL service mounted `./db/init.sql`, but the guide never created that file. I removed the mount so the stack works as written without an undeclared prerequisite.
- The Compose example used `PHP_OPCACHE_ENABLE=0`, which is not a documented runtime toggle for the official `php` image used in the post. I removed that no-op environment variable.
- The description claimed the stack provided hot reload, but the post did not expose or configure a Vite development server for browser-accessible HMR. I corrected the description to remove that unsupported claim.
- The frontend command block said "Build frontend assets" but used `npm run dev`. I corrected the commands to `npm install` and `npm run build`, which matches the action being described.
- The Nginx snippet included the deprecated `X-XSS-Protection` header. I removed it to align with current browser guidance and Laravel's current Nginx example.
- No additional technical issues were found after these corrections.

## Review Notes
- The post is technically sound after the above fixes.
- Floating tags such as `mailhog/mailhog:latest` are valid, but pinning explicit image tags would improve long-term reproducibility.
