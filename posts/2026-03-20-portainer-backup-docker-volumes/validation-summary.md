# Validation Summary: How to Back Up Docker Volumes via Portainer - Backup

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker volumes
- Docker Compose
- PostgreSQL
- AWS CLI
- Amazon S3
- Shell scripting (`bash` and `sh`)

## Sources Consulted
- Docker storage documentation: https://docs.docker.com/engine/storage/
- Docker volume backup and restore documentation: https://docs.docker.com/engine/storage/volumes/
- Docker `docker container run` CLI reference: https://docs.docker.com/reference/cli/docker/container/run
- Docker Compose `version` top-level element reference: https://docs.docker.com/reference/compose-file/version-and-name/
- PostgreSQL `pg_dump` documentation: https://www.postgresql.org/docs/15/app-pgdump.html
- PostgreSQL file-system-level backup documentation: https://www.postgresql.org/docs/15/backup-file.html
- AWS CLI high-level S3 commands documentation: https://docs.aws.amazon.com/cli/latest/userguide/cli-services-s3-commands.html
- AWS CLI official Docker image documentation: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-docker.html
- Portainer Edge Jobs documentation: https://docs.portainer.io/2.33-lts/user/edge/jobs
- `docker-volume-backup` home page: https://offen.github.io/docker-volume-backup/
- `docker-volume-backup` configuration reference: https://offen.github.io/docker-volume-backup/reference/
- `docker-volume-backup` stop-during-backup documentation: https://offen.github.io/docker-volume-backup/how-tos/stop-containers-during-backup.html
- `docker-volume-backup` recipes: https://offen.github.io/docker-volume-backup/recipes/

## Issues Found
- The post said Docker volumes are simply directories on the host. I changed that wording to reflect Docker's documentation that volumes are Docker-managed storage and should be accessed by mounting them into a container, not by direct host interaction.
- Method 2 claimed that pausing a container produces a consistent backup. I changed this to stopping the container before a filesystem-level backup and clarified that databases should prefer native tools such as `pg_dump`, because PostgreSQL documents that file-system-level backups require shutdown or true filesystem snapshots.
- Method 2 also lacked a backup directory creation step and could leave restart behavior ambiguous. I added `mkdir -p`, checked whether the container was running, and used cleanup logic to restart it only when appropriate.
- Method 3 printed an incomplete restore command. I updated it to reference the actual backup path in `${BACKUP_DIR}` so the example matches the file the script creates.
- Method 4 used the obsolete top-level Compose `version` field and a third-party backup image/config that was not documented by authoritative sources. I replaced that example with the documented `offen/docker-volume-backup:v2` container, its official environment variables, the required Docker socket mount, and documented stop-during-backup labels.
- Method 5 streamed data into `docker run` without `-i`, which Docker documents as the flag that keeps stdin open for container input. I added `-i` and removed the redundant outer volume mount.
- Method 6 described Edge Jobs too broadly and used an undefined `DEVICE_ID` variable. I updated the text to match Portainer's documented limitation to Docker Standalone environments using `/etc/cron.d`, and I switched the script to use `hostname` for device-specific backup paths.
- Method 7 had unquoted `dirname` and `basename` substitutions around the backup file path. I fixed the quoting so restore examples handle paths safely.

## Review Notes
- The shell snippets were syntax-checked with `bash -n` or `sh -n`; Docker operations themselves were not executed in this environment.
- The Compose example was YAML-parsed successfully after the corrections.
- The examples still use some `latest` image tags (`alpine:latest`, `amazon/aws-cli:latest`). These are valid, but pinned versions are safer for production because behavior can change over time.
- The PostgreSQL example is a per-database logical backup. It does not cover cluster-wide objects such as roles and tablespaces.
- Portainer documents Edge Jobs as a beta feature in the referenced documentation.
