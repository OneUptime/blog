# Validation Summary: How to Set Up Apache with Docker for PHP Applications

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Docker Compose
- PHP official Docker images
- Apache HTTP Server
- MySQL
- Redis
- phpMyAdmin
- Composer
- Laravel scheduled tasks and queue workers
- Xdebug

## Sources Consulted
- Docker PHP Official Image documentation: https://hub.docker.com/_/php
- Docker Compose file reference, services and depends_on: https://docs.docker.com/reference/compose-file/services/
- Docker Compose version top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose networking and host-gateway documentation: https://docs.docker.com/compose/how-tos/networking/
- Docker bind mounts documentation: https://docs.docker.com/engine/storage/bind-mounts/
- Docker run CLI reference: https://docs.docker.com/reference/cli/docker/container/run/
- MySQL Docker Official Image documentation: https://hub.docker.com/_/mysql
- MySQL mysqladmin documentation: https://dev.mysql.com/doc/mysql/en/mysqladmin.html
- Apache mod_rewrite RewriteRule flags documentation: https://httpd.apache.org/docs/current/rewrite/flags.html
- Xdebug step debugging documentation: https://xdebug.org/docs/step_debug
- Local Docker CLI help for docker compose config and docker compose exec

## Issues Found
- The Compose examples used `version: "3.8"`. Docker Compose now treats the top-level `version` property as obsolete and only informative, so the examples were updated to omit it.
- The cron service used `crontab` and `cron -f`, but the custom image did not install the Debian `cron` package. Added `cron` to the Dockerfile package list so the scheduled-task service can run.
- The Xdebug configuration used `xdebug.client_host=host.docker`, which is not Docker's documented host alias. Changed it to `host.docker.internal`.
- On Linux, `host.docker.internal` needs a host-gateway mapping in Compose. Added `extra_hosts: ["host.docker.internal:host-gateway"]` to the app service in the full-stack Compose example.
- The production PHP config logged to `/var/log/php/error.log`, but the Dockerfile did not create that directory. Changed `error_log` to `/proc/self/fd/2` so PHP errors go to container stderr and are visible in Docker logs.

## Review Notes
- The standalone Docker Compose snippets were validated with `docker compose config -q`.
- Docker image pulls could not be performed during review because Docker Hub returned an unauthenticated pull rate limit, so image-build verification was limited to documentation review and local CLI checks.
