# Validation Summary: How to Create a Full Docker Backup Strategy

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker CLI
- Docker volumes
- Docker images
- Docker Compose
- Bash scripting
- PostgreSQL backups with pg_dump, pg_dumpall, and pg_restore
- MySQL/MariaDB backups with mysqldump
- MongoDB backups with mongodump
- Redis persistence with BGSAVE and LASTSAVE
- Cron
- AWS CLI S3 sync

## Sources Consulted
- Docker Docs: Volumes - https://docs.docker.com/engine/storage/volumes/
- Docker Docs: docker container run - https://docs.docker.com/reference/cli/docker/container/run/
- Docker Docs: docker container exec - https://docs.docker.com/engine/reference/commandline/exec/
- Docker Docs: docker image save - https://docs.docker.com/reference/cli/docker/image/save/
- Docker Docs: Docker Compose application model - https://docs.docker.com/compose/intro/compose-application-model/
- PostgreSQL Docs: pg_dump - https://www.postgresql.org/docs/17/app-pgdump.html
- PostgreSQL Docs: pg_dumpall - https://www.postgresql.org/docs/17/app-pg-dumpall.html
- PostgreSQL Docs: pg_restore - https://www.postgresql.org/docs/17/app-pgrestore.html
- MySQL 8.4 Reference Manual: Using mysqldump for Backups - https://dev.mysql.com/doc/refman/8.4/en/using-mysqldump.html
- MySQL 8.4 Reference Manual: Dumping Data in SQL Format with mysqldump - https://dev.mysql.com/doc/refman/8.4/en/mysqldump-sql-format.html
- MongoDB Database Tools Docs: mongodump - https://www.mongodb.com/docs/database-tools/mongodump/
- Redis Docs: BGSAVE - https://redis.io/docs/latest/commands/bgsave/
- Redis Docs: LASTSAVE - https://redis.io/docs/latest/commands/lastsave/
- AWS CLI Command Reference: s3 sync - https://docs.aws.amazon.com/cli/latest/reference/s3/sync.html

## Issues Found
- The database dump examples used `docker exec -t` while streaming dump data through stdout. I removed `-t` from PostgreSQL, MySQL/MariaDB, MongoDB, and pg_dumpall examples because `-t` allocates a pseudo-TTY and is not appropriate for non-interactive backup streams, especially binary dump/archive output.
- The Redis backup examples triggered `BGSAVE` and then waited a fixed number of seconds. I changed them to record `LASTSAVE`, run `BGSAVE`, and wait until `LASTSAVE` changes so the copied `dump.rdb` corresponds to the completed snapshot.
- The full backup script detected container names with substring matching, which could match names such as `old-postgres` while still trying to exec into `postgres`. I changed those checks to exact-name matching with `grep -qx`.
- The Compose config backup only recognized `docker-compose.yml`. I updated the check to also include `compose.yaml`, `compose.yml`, and `docker-compose.yaml`, matching the current preferred and backwards-compatible Compose filenames.
- The old-backup cleanup command did not exclude the backup root from `find` results. I added `-mindepth 1` so cleanup only targets child backup directories.

## Review Notes
- The examples are valid as host-run Bash scripts, but production deployments should also handle credentials, encryption, retention policy, exit-code reporting, and restore drills according to the operator's environment.
- The MySQL/MariaDB example assumes `MYSQL_ROOT_PASSWORD` is available in the host environment that runs the script.
- Logical database dumps are appropriate for portable backups, but high-throughput production databases may also need engine-specific physical backups, replication-aware backups, or point-in-time recovery.
