# Validation Summary: How to Run MariaDB and MySQL Simultaneously Using Containers on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Podman
- Podman Quadlet
- systemd
- MariaDB 11 container image
- MySQL 8.0 container image
- firewalld

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Using containers to run multiple MariaDB and MySQL instances on a single host": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_using_database_servers/using-mariadb_configuring-and-using-database-servers
- Podman documentation, `podman-generate-systemd`: https://docs.podman.io/en/latest/markdown/podman-generate-systemd.1.html
- Podman documentation, Quadlet `podman-systemd.unit`: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman documentation, `podman-run`: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- MariaDB documentation, Docker Official Image environment variables: https://mariadb.com/docs/server/server-management/automated-mariadb-deployment-and-administration/docker-and-mariadb/mariadb-server-docker-official-image-environment-variables
- MariaDB documentation, `mysqldump` legacy utility: https://mariadb.com/docs/server/clients-and-utilities/legacy-clients-and-utilities/mysqldump
- MariaDB documentation, command-line client: https://mariadb.com/docs/server/clients-and-utilities/mariadb-client/mariadb-command-line-client
- Docker Official Image documentation for MySQL: https://hub.docker.com/_/mysql
- Docker Official Image documentation for MariaDB: https://hub.docker.com/_/mariadb

## Issues Found
- The post used `podman generate systemd`, which current Podman documentation marks as deprecated. Replaced that workflow with rootful Quadlet `.container` files under `/etc/containers/systemd`, including `[Install]` sections so the generated services start on boot.
- The custom configuration section recreated containers manually after introducing systemd management. Updated it to add configuration bind mounts to the Quadlet files, reload systemd, and restart the managed services.
- The MariaDB container examples used the legacy `mysql` client name and `mysqldump` for a MariaDB 11 image. Updated the MariaDB client example to `mariadb` and the backup command to `mariadb-dump`, because the `mysqldump` symlink is deprecated and removed from the official MariaDB Docker image starting with MariaDB 11.0.1.
- The backup commands wrote to `/backup` without creating it, and shell redirection would not run under `sudo`. Added `sudo mkdir -p /backup` and wrapped the dump commands in `sudo sh -c` so the output files are created with the intended privileges.

## Review Notes
The core approach is technically valid: Red Hat documents that MariaDB and MySQL server packages conflict on the same RHEL host and recommends containers for running multiple database instances or both products together. The examples use Docker Official Images rather than Red Hat registry images; that is acceptable, but users in locked-down RHEL environments may prefer Red Hat-supported images from `registry.redhat.io`.
