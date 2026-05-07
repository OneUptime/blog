# Validation Summary: How to Run MariaDB in a Podman Container

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- MariaDB
- Docker Official MariaDB image
- SQL
- Container volumes
- MariaDB option files

## Sources Consulted
- MariaDB Docker Official Image documentation: https://hub.docker.com/_/mariadb
- MariaDB Server Docker Official Image Environment Variables: https://mariadb.com/kb/en/mariadb-server-docker-official-image-environment-variables/
- MariaDB Docker Official Image source repository and entrypoint: https://github.com/MariaDB/mariadb-docker
- Podman run documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- MariaDB InnoDB system variables: https://mariadb.com/docs/server/server-usage/storage-engines/innodb/innodb-system-variables
- MariaDB server system variables: https://mariadb.com/docs/server/server-management/variables-and-modes/server-system-variables
- MariaDB slow query log documentation: https://mariadb.com/docs/server/server-management/server-monitoring-logs/slow-query-log/slow-query-log-overview
- MariaDB and MySQL compatibility documentation: https://mariadb.com/docs/release-notes/compatibility-and-differences/mariadb-vs-mysql-compatibility

## Issues Found
- The post said `mariadb:11` pulled the "latest" MariaDB image. Changed the wording to "MariaDB 11 image" because `latest` is a separate tag and currently points to the latest stable major line, not necessarily MariaDB 11.
- The post described MariaDB as having "full MySQL compatibility." Changed this to "broad MySQL compatibility" because MariaDB documents compatibility limits, especially across newer MySQL and MariaDB versions.
- The app-user and tuned-container examples reused the same `mariadb-data` volume while relying on initialization environment variables. Changed those examples to use separate named volumes, because the official MariaDB image only applies initialization variables when the data directory is empty.
- The custom configuration wrote the slow query log to `/var/log/mysql/slow.log`. Changed it to `/var/lib/mysql/slow.log` so the path is in MariaDB's writable data directory in the container.
- The cleanup command did not remove all containers and volumes introduced by the examples. Updated it to include `mariadb-tuned`, `mariadb-init`, `mariadb-app-data`, and `mariadb-tuned-data`.
- The post implied all Podman execution is rootless. Changed the summary and introduction to clarify that this applies when Podman is run rootless.

## Review Notes
- Podman was not installed in the review environment, so Podman CLI behavior was checked against the official Podman documentation rather than local `podman --help` output.
- Docker was available, but Docker Hub unauthenticated pull rate limits prevented live inspection of the MariaDB image.
