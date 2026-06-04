# Validation Summary: How to Set Up Automated Database Backups in Docker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker Compose
- PostgreSQL 16
- MySQL 8.0
- MongoDB 7
- cron
- AWS CLI S3 sync
- Bash

## Sources Consulted
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose `version` top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- PostgreSQL 16 `pg_dump` documentation: https://www.postgresql.org/docs/16/app-pgdump.html
- PostgreSQL current `pg_restore` documentation: https://www.postgresql.org/docs/current/app-pgrestore.html
- MySQL 8.0 `mysqldump` documentation: https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html
- Docker Official MySQL image source: https://github.com/docker-library/mysql/blob/master/Dockerfile.oracle
- MongoDB `mongodump` documentation: https://www.mongodb.com/docs/database-tools/mongodump/
- MongoDB `mongorestore` documentation: https://www.mongodb.com/docs/database-tools/mongorestore/
- Docker Official MongoDB image source: https://github.com/docker-library/mongo
- AWS CLI v2 `s3 sync` documentation: https://docs.aws.amazon.com/cli/latest/reference/s3/sync.html

## Issues Found
- The Docker Compose examples used the top-level `version: "3.8"` key, which Docker now documents as obsolete and informational. Removed it from all Compose snippets.
- The PostgreSQL and MongoDB backup containers used `cron` without installing it. Added package installation commands for Debian-based images before registering the cron jobs.
- The MySQL backup container used `apt-get`, but the official MySQL image is Oracle Linux-based. Replaced it with `microdnf install -y cronie gzip`, cleaned the package cache, and changed the foreground cron command to `crond -n`.
- The PostgreSQL script created `pg_dump -Fc` output, piped it through `gzip`, named it `.sql.gz`, and restored it directly with `pg_restore`. Changed the script to write a `.dump` custom-format archive directly with `pg_dump -Fc --file=...`, updated cleanup, S3 upload, health checks, and restore examples to match.
- The MySQL `mysqldump` example used an application user without accounting for MySQL 8.0 tablespace privilege behavior. Added `--no-tablespaces` to avoid requiring the global `PROCESS` privilege for this backup.
- The MySQL `--single-transaction` explanation implied table-agnostic consistency. Clarified that it provides a consistent snapshot for transactional tables such as InnoDB.
- The S3 sync comment said existing files are skipped. Updated it to say the command syncs new and changed files, which matches AWS CLI behavior.
- The best-practices claim said PostgreSQL `-Fc` itself ensures consistency. Clarified that `pg_dump` takes the consistent snapshot, while `-Fc` controls the compressed custom archive format.
- The compression guidance referred only to gzip. Updated it to include PostgreSQL's compressed custom format.

## Review Notes
- `depends_on` starts containers in dependency order but does not prove the database is ready; production backup scripts should usually include readiness retries.
- The examples still use inline demo passwords for readability. The post separately warns readers to use Docker secrets or environment files for production.
