# Validation Summary: How to Run WordPress with Docker Compose (Nginx + MySQL + PHP)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Docker Compose
- WordPress Docker image
- Nginx
- PHP-FPM
- PHP configuration
- MySQL 8.0
- phpMyAdmin
- Certbot and Let's Encrypt

## Sources Consulted
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose volumes reference: https://docs.docker.com/reference/compose-file/volumes/
- Docker Compose startup order and `depends_on` conditions: https://docs.docker.com/compose/how-tos/startup-order/
- Docker `exec` command reference: https://docs.docker.com/engine/reference/commandline/exec/
- WordPress Docker Official Image documentation: https://hub.docker.com/_/wordpress
- MySQL 8.0 pluggable authentication documentation: https://dev.mysql.com/doc/mysql/8.0/en/pluggable-authentication.html
- MySQL 8.0 InnoDB redo log documentation: https://dev.mysql.com/doc/refman/8.0/en/innodb-redo-log.html
- MySQL 8.0 InnoDB system variables documentation: https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html
- PHP core `php.ini` directive documentation: https://www.php.net/manual/en/ini.core.php
- NGINX compression documentation: https://docs.nginx.com/nginx/admin-guide/web-server/compression/
- Certbot documentation: https://eff-certbot.readthedocs.io/
- MDN `X-XSS-Protection` header reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-XSS-Protection

## Issues Found
- Removed the top-level `version: "3.8"` from the Compose example. Current Docker Compose uses the Compose Specification; legacy 2.x/3.x file versions are no longer the recommended way to declare the schema.
- Removed `--default-authentication-plugin=mysql_native_password` from the MySQL command. MySQL documents `mysql_native_password` as deprecated as of MySQL 8.0.34 and subject to removal.
- Replaced `--innodb-log-file-size=64M` with `--innodb-redo-log-capacity=128M`. MySQL 8.0.30 and later use `innodb_redo_log_capacity`; `innodb_log_file_size` is deprecated.
- Added explicit `name` values for the `wordpress-files` and `mysql-data` Compose volumes. This keeps the raw `docker run -v wordpress-files:/source:ro` backup command pointed at the same volume that Compose creates.
- Updated the Certbot standalone example to stop Nginx before running Certbot and start it again afterward. Certbot standalone needs to bind port 80 for HTTP-01 validation, which conflicts with the running Nginx container.
- Updated the database backup command to use `docker compose exec -T wp-mysql sh -c 'mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" wordpress'`. The original command relied on `$MYSQL_ROOT_PASSWORD` being exported in the host shell, but Compose `.env` values are not automatically exported to later shell commands.
- Removed the `X-XSS-Protection` Nginx header because the header is deprecated and no longer recommended for modern browser security guidance.

## Review Notes
The corrected Docker Compose YAML was validated locally with `docker compose config` using placeholder environment variables. The post still uses fixed image tags such as `nginx:1.25-alpine` and `mysql:8.0`; these are valid for a reproducible tutorial, but should be periodically reviewed for security updates.
