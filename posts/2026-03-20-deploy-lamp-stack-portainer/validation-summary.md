# Validation Summary: How to Deploy a LAMP Stack via Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (stack deployment UI)
- Docker Compose (v3.8 schema)
- MySQL 8.0 (official image)
- PHP 8.2 with Apache (`php:8.2-apache`)
- Apache HTTP Server (`mod_rewrite`)
- PHP PDO / `pdo_mysql` / `mysqli` extensions
- Linux base for the LAMP acronym

## Sources Consulted
- Docker Compose file reference (build + image interaction): https://docs.docker.com/reference/compose-file/services/#build
- Official MySQL Docker image (env vars `MYSQL_ROOT_PASSWORD`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`): https://hub.docker.com/_/mysql
- Official PHP Docker image (`php:8.2-apache`, `docker-php-ext-install`): https://hub.docker.com/_/php
- Apache `a2enmod` utility (Debian-based): https://manpages.debian.org/bookworm/apache2/a2enmod.8.en.html
- PHP PDO MySQL DSN syntax: https://www.php.net/manual/en/ref.pdo-mysql.connection.php
- Portainer Stacks documentation: https://docs.portainer.io/user/docker/stacks/add

## Issues Found
1. **`image:` value collided with the official PHP image tag.** The original `php-apache` service declared `image: php:8.2-apache` together with `build:`. When both are specified, Docker Compose tags the locally built image with the value of `image:`. Using `php:8.2-apache` would silently overwrite the public image tag in the local Docker daemon, causing confusion (subsequent `docker pull php:8.2-apache` would not refresh the layered build, and the local tag would no longer match the upstream image). I changed the tag to a unique name `lamp-php-apache:latest` and reordered the keys so `image:` and `build:` sit together with a clarifying comment. The base image `FROM php:8.2-apache` inside `Dockerfile.php` is unaffected.

## Review Notes
- The Compose file uses `version: "3.8"`. The Compose Spec no longer requires a top-level `version`, but it remains accepted by current Docker Compose releases, so leaving it in place does not break anything.
- `depends_on` without a `condition: service_healthy` only enforces start order, not readiness. On a cold boot the PHP container may attempt to connect before MySQL has finished initialising; PHP/Apache will simply error on the first request and recover on the next. Adding a `healthcheck` to the `mysql` service plus `condition: service_healthy` on `depends_on` would make first-boot smoother, but this is an enhancement rather than a correctness issue.
- The credentials in the example (`rootpass`, `myapppass`) are clearly flagged with "Change this" comments, so this is acceptable for a tutorial.
- The PDO test file in `app/index.php` does not enable PDO error mode; a failed connection would raise an exception in PHP 8.x by default (`PDO::ERRMODE_EXCEPTION` is the default since PHP 8.0), so failures will be visible. No change required.
