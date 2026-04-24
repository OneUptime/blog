# Validation Summary: How to Deploy MySQL via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- Docker volumes and bind mounts
- MySQL 8.4
- phpMyAdmin
- SQL initialization scripts
- Shell commands for backup and restore

## Sources Consulted
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- MySQL Docker Official Image documentation: https://hub.docker.com/_/mysql
- MySQL 8.4 release notes for removed `expire_logs_days`: https://dev.mysql.com/doc/relnotes/mysql/8.4/en/news-8-2-0.html
- MySQL account-management guidance: https://dev.mysql.com/doc/refman/8.4/en/creating-accounts.html
- phpMyAdmin Docker image documentation: https://github.com/phpmyadmin/docker
- Portainer relative path bind mount behavior documentation: https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/empty-relative-bind-mounts
- Portainer stack deployment documentation: https://docs.portainer.io/user/docker/stacks/add?fallback=true

## Issues Found
- The Compose healthcheck used exec-form `CMD` with `${MYSQL_ROOT_PASSWORD}`. In Compose, shell-style expansion requires a shell, so the healthcheck was changed to `CMD-SHELL` and now runs an authenticated `mysql -e 'SELECT 1'` check.
- The phpMyAdmin service set `PMA_USER` and `PMA_PASSWORD`, but the official image documents those variables as only applying to the `config` authentication method. They were removed so the example no longer implies unsupported auto-login behavior.
- The MySQL config used `expire_logs_days`, which MySQL 8.4 has removed. It was replaced with `binlog_expire_logs_seconds = 604800` to keep the same seven-day retention intent.
- The stack example used `./my.cnf` and `./init` relative bind mounts without explaining Portainer's scope for that feature. The text now clarifies that this layout applies to Git-based Portainer Business Edition deployments with relative path volumes enabled.
- The backup section was labeled as a Portainer console workflow, but the command shown is a Docker host `docker exec` command. The section was corrected to describe it accurately and aligned with the official image's documented backup and restore pattern.
- The hardening SQL directly modified `mysql.user`, which MySQL documents as discouraged. It was replaced with supported account-management statements using `DROP USER IF EXISTS`.
- The application connection example said to use the MySQL container name as the host. That comment was corrected to say service name, which matches how Compose service discovery works.

## Review Notes
- The post is now technically correct for the scenario it describes. Readers deploying stacks from the Portainer web editor or Community Edition should use host bind paths instead of the relative `./my.cnf` and `./init` paths shown in the Git-based example.
- The image tags `mysql:8.4` and `phpmyadmin:latest` will continue to move as new patch releases are published, so minor runtime behavior can change over time even though the documented configuration is valid as of 2026-04-24.
