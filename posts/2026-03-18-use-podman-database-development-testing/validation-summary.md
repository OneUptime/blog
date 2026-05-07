# Validation Summary: How to Use Podman for Database Development and Testing

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- PostgreSQL
- MySQL
- MongoDB
- Redis
- Bash
- Jest

## Sources Consulted
- Podman `podman create` reference: https://docs.podman.io/en/latest/markdown/podman-create.1.html
- Podman `podman pod create` reference: https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html
- PostgreSQL Docker initialization guide: https://docs.docker.com/guides/postgresql/advanced-configuration-and-initialization/
- PostgreSQL Docker Official Image docs: https://hub.docker.com/_/postgres/
- PostgreSQL `pg_isready` docs: https://www.postgresql.org/docs/16/app-pg-isready.html
- MySQL Docker Official Image docs: https://hub.docker.com/_/mysql
- MySQL general query log docs: https://dev.mysql.com/doc/refman/en/query-log.html
- MySQL log destination docs: https://dev.mysql.com/doc/refman/en/log-destinations.html
- MongoDB Docker Official Image docs: https://hub.docker.com/_/mongo/
- MongoDB Shell connection docs: https://www.mongodb.com/docs/mongodb-shell/connect/
- MongoDB Shell options reference: https://www.mongodb.com/docs/mongodb-shell/reference/options/
- Redis persistence docs: https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
- Redis `PING` command docs: https://redis.io/docs/latest/commands/ping/
- Redis eviction policy docs: https://redis.io/docs/latest/develop/reference/eviction/
- Jest 30 upgrade guide: https://jestjs.io/docs/upgrading-to-jest30

## Issues Found
- The MongoDB connection example omitted `--authenticationDatabase admin`, even though the official `mongo` image creates the root user in the `admin` authentication database. I updated the command to authenticate correctly and open `myapp_dev`.
- The MySQL custom config used `/var/log/mysql/slow.log` and `/var/log/mysql/general.log` without creating that directory. MySQL writes log files to the data directory by default unless you point it at an existing absolute path, so I changed both settings to relative filenames that work in the official image as shown.
- The disposable test script used `set -e` but captured `$?` after `npm test`, which would not run if the test command failed. I added an `EXIT` trap for cleanup, made the readiness check target `test_db`, and switched the Jest CLI flag to the current `--testPathPatterns`.
- The PostgreSQL restore comment said it restored into a new container, but the command targets the existing `postgres-dev` container. I corrected the comment.
- The volume-backup example bind-mounted `./backups` without ensuring the directory existed. Podman requires bind-mount source paths to exist, so I added `mkdir -p ./backups`.

## Review Notes
- The post is technically relevant and includes executable commands, configuration, and initialization examples, so it qualifies as a code blog.
- The Podman pod networking explanation is accurate: containers in the same pod share a network namespace and can communicate over `localhost`.
- The post depends on official image entrypoint behaviors such as `/docker-entrypoint-initdb.d` for PostgreSQL and MongoDB. Those sections should be rechecked if the post is later updated to different image families or major versions.
