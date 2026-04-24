# Validation Summary: How to Deploy MariaDB via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose / Docker stacks
- MariaDB Server Docker Official Image
- MariaDB replication
- MariaDB configuration
- Adminer

## Sources Consulted
- MariaDB Server Docker Official Image Environment Variables: https://mariadb.com/docs/server/server-management/automated-mariadb-deployment-and-administration/docker-and-mariadb/mariadb-server-docker-official-image-environment-variables
- MariaDB Docker Official Image FAQ: https://mariadb.com/docs/server/server-management/automated-mariadb-deployment-and-administration/docker-and-mariadb/docker-official-image-frequently-asked-questions
- Using `healthcheck.sh` with the MariaDB official image: https://mariadb.com/docs/server/server-management/automated-mariadb-deployment-and-administration/docker-and-mariadb/using-healthcheck-sh
- MariaDB vs MySQL compatibility notes: https://mariadb.com/docs/release-notes/community-server/about/compatibility-and-differences/mariadb-vs-mysql-compatibility
- MariaDB vs MySQL feature differences: https://mariadb.com/docs/release-notes/community-server/about/compatibility-and-differences/mariadb-vs-mysql-features
- MariaDB pluggable authentication overview: https://mariadb.com/docs/server/reference/plugins/authentication-plugins/pluggable-authentication-overview
- MariaDB JSON data type: https://mariadb.com/docs/server/reference/data-types/string-data-types/json
- MariaDB InnoDB flush method documentation: https://mariadb.com/docs/server/server-usage/storage-engines/innodb/innodb-flush-method
- MariaDB replication and binary log variables: https://mariadb.com/docs/server/ha-and-performance/standard-replication/replication-and-binary-log-system-variables
- `mariadb-dump` reference: https://mariadb.com/kb/en/mariadb-dump/
- Portainer relative path volumes documentation: https://docs.portainer.io/sts/advanced-topics/relative-paths
- Portainer add stack documentation: https://docs.portainer.io/user/docker/stacks/add
- MySQL `caching_sha2_password` reference: https://dev.mysql.com/doc/refman/8.0/en/caching-sha2-pluggable-authentication.html

## Issues Found
- The post described MariaDB as fully compatible with MySQL applications and concluded that any MySQL application would run without modification. MariaDB’s official compatibility documentation is more qualified, so the wording was corrected to reflect high compatibility with connectors and many applications while noting that compatibility testing is still required.
- The main Portainer stack used `./mariadb.cnf` and `./init` relative bind mounts as if they were generally portable. Portainer documents relative path volume support as a Git-based Business Edition feature, so the example was corrected to show optional host-path mounts instead of generic `./...` paths.
- The MariaDB 11.4 configuration snippet used `innodb_flush_method=O_DIRECT`. MariaDB documents this variable as deprecated from 11.0, so it was removed from the 11.4 example.
- The MariaDB/MySQL comparison table listed MariaDB’s default authentication plugin as `ed25519`. MariaDB documents `mysql_native_password` as the default authentication plugin, so the table was corrected.
- The comparison table referred to `RocksDB` instead of MariaDB’s `MyRocks` storage engine naming and described Galera clustering as “Built-in”. Those entries were corrected to match MariaDB’s documented terminology and packaging.
- The replication compose example omitted the primary binary-log startup flags and replica `server-id` requirement that the official MariaDB image documentation shows for a replication pair. The example was updated to add the required `command` options and remove unsupported relative config mounts.

## Review Notes
- `mariadb:11.4` is a valid stable GA branch tag, but it floats to the latest 11.4 patch release rather than pinning an exact patch version. Pinning a full tag would make the tutorial more reproducible.
- MariaDB documents that most `MARIADB_*` environment variables only affect first-time initialization; they do not reconfigure an already-populated data directory on later starts.
- `adminer:latest` is functional, but pinning an explicit image version would make the deployment more deterministic.
