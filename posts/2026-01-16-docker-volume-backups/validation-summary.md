# Validation Summary: How to Automate Docker Volume Backups with Cron

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker volumes
- Docker CLI
- Docker Compose
- Bash
- Cron
- AWS CLI / Amazon S3
- offen/docker-volume-backup
- PostgreSQL Docker image and pg_dump

## Sources Consulted
- Docker Docs: Volumes, including backup and restore examples: https://docs.docker.com/engine/storage/volumes/
- Docker Docs: Compose top-level version element: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Compose services and container_name: https://docs.docker.com/reference/compose-file/services/
- Docker CLI local help for `docker run`, `docker exec`, `docker volume`, and `docker volume ls`.
- AWS CLI Command Reference for `aws s3 sync`: https://docs.aws.amazon.com/cli/latest/reference/s3/sync.html
- offen/docker-volume-backup configuration reference: https://offen.github.io/docker-volume-backup/reference/
- Docker Hub PostgreSQL Official Image documentation: https://hub.docker.com/_/postgres
- Local command help/version output for `crontab`, GNU `find`, and GNU `tar`.

## Issues Found
- The Compose snippets used `version: '3.8'`. Docker's current Compose documentation marks the top-level `version` property as obsolete and warns that Compose uses the latest schema regardless of this field. Removed the `version` lines from all Compose examples.
- The S3 backup script used `aws s3 sync ${BACKUP_DIR} ${S3_BUCKET}/ --delete`. Because `BACKUP_DIR` is a temporary directory containing only the current run's archives, `--delete` would remove older backups from the S3 prefix. Removed `--delete` so each run uploads the new backups without deleting previous remote backups.
- The complete Compose example ran `docker exec postgres ...`, but the `postgres` service did not set an actual container name. Docker `exec` requires a container name or ID, and Compose normally generates container names. Added `container_name: postgres`.
- The PostgreSQL service used the official `postgres:15` image without required initialization settings. The official image requires `POSTGRES_PASSWORD` for an uninitialized database, and the example dumps `mydb`. Added `POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}` and `POSTGRES_DB: mydb`.

## Review Notes
The remaining Docker volume backup and restore commands match Docker's documented tar-based volume backup pattern. For production databases, filesystem-level volume archives can be inconsistent while the database is running; the post's use of `pg_dump` for PostgreSQL is the right database-specific direction, but future revisions could add more operational guidance around quiescing applications and testing restores.
