# Validation Summary: How to Run MySQL in a Podman Container

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- MySQL
- Docker Official MySQL container image
- Container volumes and bind mounts
- MySQL option files
- MySQL initialization scripts
- mysqldump backup and restore

## Sources Consulted
- Docker Hub MySQL Official Image documentation: https://hub.docker.com/_/mysql
- Podman `podman run` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `podman volume create` documentation: https://docs.podman.io/en/stable/markdown/podman-volume-create.1.html
- Podman `podman volume inspect` documentation: https://docs.podman.io/en/latest/markdown/podman-volume-inspect.1.html
- MySQL 8.4 Reference Manual, Slow Query Log: https://dev.mysql.com/doc/refman/8.4/en/slow-query-log.html
- MySQL 8.4 Reference Manual, Server Character Set and Collation: https://dev.mysql.com/doc/refman/en/charset-server.html
- MySQL 8.0 Reference Manual, Removed Options and Variables: https://dev.mysql.com/doc/refman/8.0/en/added-deprecated-removed.html

## Issues Found
- The post used `mysql:8.0`, but the Docker Official Image currently lists MySQL 8.4 LTS and 9.x tags, not 8.0. Updated all examples to use `docker.io/library/mysql:8.4` and updated the pull comment accordingly.
- The examples reused `mysql-data` for containers that rely on first-start initialization environment variables. The MySQL image documentation states these variables have no effect when the data directory already contains a database. Added separate named volumes for the application-user example and tuned-configuration example.
- The custom configuration set `query_cache_size = 0`. MySQL removed query cache variables, including `query_cache_size`, in MySQL 8.0.3, so this option would prevent current MySQL servers from starting cleanly. Removed that line.
- The slow query log path was set to `/var/log/mysql/slow.log`, which may not exist or be writable in the official container. Updated it to `/var/lib/mysql/slow.log`, under the mounted MySQL data directory.

## Review Notes
The examples pass passwords directly on the command line for simplicity, which is common in quick-start tutorials but not ideal for production. MySQL documents that command-line passwords can be briefly visible to other processes; a future hardening pass could show prompting, option files, secrets, or environment-file based alternatives.
