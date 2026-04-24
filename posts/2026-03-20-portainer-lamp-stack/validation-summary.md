# Validation Summary: How to Deploy a LAMP Stack via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- Docker Official Images
- PHP
- Apache HTTP Server
- MySQL
- phpMyAdmin
- PECL
- TLS/SSL

## Sources Consulted
- Portainer Docs, "Add a new stack": https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer Docs, "How Relative Path Support works in Portainer": https://docs.portainer.io/advanced/relative-paths
- Portainer Docs, "Docker Compose files including build steps fail": https://docs.portainer.io/faqs/known-issues/docker-compose-files-including-build-steps-fail
- Docker Docs, "Version and name top-level elements": https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Official Image docs for PHP: https://hub.docker.com/_/php
- Docker Official PHP image source (`php:8.2-apache`): https://github.com/docker-library/php/blob/master/8.2/bookworm/apache/Dockerfile
- Docker Official Image docs for MySQL: https://hub.docker.com/_/mysql
- Docker Official MySQL image entrypoint source: https://github.com/docker-library/mysql/blob/master/docker-entrypoint.sh
- phpMyAdmin documentation, "Installing using Docker": https://docs.phpmyadmin.net/en/latest/setup.html#installing-using-docker
- Apache HTTP Server docs, `mod_ssl`: https://httpd.apache.org/docs/2.4/en/mod/mod_ssl.html
- PECL package page for `redis`: https://pecl.php.net/package/redis

## Issues Found
- The original post used Portainer's Web Editor while also relying on relative bind mounts such as `./www`, `./apache/vhost.conf`, `./mysql/init`, and `./docker/php`. Portainer documents relative path volume support for Git-based stack deployments in Business Edition, so I changed the instructions to use **Git Repository** deployment with **Relative path volumes** and updated the prerequisite from CE/BE to BE.
- The `web` service originally set `APACHE_DOCUMENT_ROOT`, but the official `php:8.2-apache` image does not change Apache's `DocumentRoot` from that environment variable by itself. I removed that setting and kept the mounted Apache vhost as the actual source of `DocumentRoot` configuration.
- The PHP test app reads `MYSQL_HOST`, `MYSQL_DATABASE`, `MYSQL_USER`, and `MYSQL_PASSWORD`, but those values were only configured on the `db` service. Docker Compose does not share service environment variables automatically, so I added the database connection variables to the `web` service and updated the Portainer environment-variable example accordingly.
- The main tutorial used `php:8.2-apache` while the test application depends on `pdo_mysql`. I corrected Step 3 to explicitly state that the `web` service must be updated to a custom image (or equivalent prebuilt image) before the MySQL connectivity test will work.
- The custom Dockerfile example enabled `rewrite` and `headers`, but the HTTPS section also needs Apache SSL support and an enabled SSL site. I updated the Dockerfile to enable `ssl` and `default-ssl` so the Step 8 virtual host can actually be served over port 443.
- The PECL example used an unpinned `pecl install redis`. The official PHP image docs recommend explicit PECL versions, so I pinned the example to the current stable `redis-6.3.0` release from PECL.
- The Portainer-based `build:` example could fail on remote Docker environments. Portainer documents this as a current limitation, so I added a note instructing readers to build the image outside Portainer and switch to an `image:` reference when targeting a remote environment.
- The original Step 7 implied that changing `MYSQL_*` environment variables in Portainer would update database credentials on an existing persistent volume. The official MySQL image only applies those initialization variables when the data directory is empty, so I added an explicit note to prevent credential-rotation mistakes.

## Review Notes
- The top-level Compose `version: "3.8"` key is still accepted for backward compatibility, but current Docker Compose treats it as obsolete and validates against the latest Compose Specification.
- The post still uses `mysql:8.0`, which is valid as of April 24, 2026. Docker Hub also publishes `8.4` and `lts` tags, so a future refresh could consider moving the example to an LTS-tagged MySQL image.
