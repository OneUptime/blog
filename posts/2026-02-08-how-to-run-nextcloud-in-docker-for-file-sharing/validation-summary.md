# Validation Summary: How to Run Nextcloud in Docker for File Sharing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Docker Compose
- Nextcloud
- MariaDB
- Redis
- Nginx reverse proxy
- Cron
- PHP configuration

## Sources Consulted
- Nextcloud Docker Official Image documentation: https://hub.docker.com/_/nextcloud
- Nextcloud Administration Manual, background jobs: https://docs.nextcloud.com/server/stable/admin_manual/configuration_server/background_jobs_configuration.html
- Nextcloud Administration Manual, memory caching: https://docs.nextcloud.com/server/latest/admin_manual/configuration_server/caching_configuration.html
- Nextcloud Administration Manual, reverse proxy configuration: https://docs.nextcloud.com/server/latest/admin_manual/configuration_server/reverse_proxy_configuration.html
- Nextcloud Administration Manual, configuration parameters: https://docs.nextcloud.com/server/latest/admin_manual/configuration_server/config_sample_php_parameters.html
- Docker Compose documentation, history and Compose Specification behavior: https://docs.docker.com/compose/intro/history/
- MariaDB Docker Official Image documentation: https://hub.docker.com/_/mariadb
- MariaDB documentation, mariadb-dump: https://mariadb.com/docs/server/clients-and-utilities/backup-restore-and-import-clients/mariadb-dump
- NGINX release documentation for HTTP/2 directive deprecation: https://docs.nginx.com/nginx/releases/

## Issues Found
- The Compose example used the legacy top-level `version: "3.8"` key. Docker Compose v2 and v5 use the Compose Specification and ignore the top-level version, so it was removed.
- The MariaDB container used `MYSQL_*` initialization variables. Updated these to the current `MARIADB_*` variables documented by the MariaDB official image while leaving Nextcloud's required `MYSQL_*` client connection variables unchanged.
- The setup installed apps but did not persist `/var/www/html/custom_apps`. Added `custom_apps` directory creation, a Compose bind mount, and backup coverage for installed apps.
- The trusted domains command comment said it edited `config.php`, but the command only displayed the file. Updated the comment to accurately describe the command.
- The Nginx example used the deprecated `listen ... http2` parameter. Updated it to `listen 443 ssl;` plus `http2 on;`.
- The reverse proxy snippet omitted CalDAV/CardDAV `.well-known` redirects recommended by Nextcloud for reverse proxies. Added the two redirect locations.
- The reverse proxy snippet trusted `127.0.0.1`, which is usually not the source address seen by a Dockerized Nextcloud container when Nginx runs on the host. Updated the example to trust the Docker private bridge range.
- The cron command relied on the container working directory. Updated it to call `php -f /var/www/html/cron.php`, matching Nextcloud's documented cron invocation pattern.
- The backup command used `mysqldump` with `mariadb:11`. MariaDB documents that the `mysqldump` symlink is removed from the MariaDB Docker Official Image from MariaDB 11.0, so the command was changed to `mariadb-dump`.
- The backup example wrote into `~/nextcloud-backup` without creating it first. Added `mkdir -p` for the backup directories.

## Review Notes
The corrected Docker Compose YAML was parsed successfully with `docker compose -f - config`. The guide remains a basic self-hosted setup; future hardening could cover health checks, secrets, image pinning, mail configuration, and a fuller restore procedure.
