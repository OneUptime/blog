# Validation Summary: How to Set Up Automated Portainer Backup Scripts

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- Bash
- cron
- AWS CLI / Amazon S3
- MinIO Client (`mc`)
- Healthchecks.io

## Sources Consulted
- Portainer CE install with Docker on Linux - https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer backup and restore settings - https://docs.portainer.io/admin/settings/general
- Portainer FAQ: what a backup includes - https://docs.portainer.io/faqs/getting-started/what-does-portainers-backup-include
- Docker volume backup and restore guidance - https://docs.docker.com/engine/storage/volumes/
- Docker CLI reference: `docker stop` - https://docs.docker.com/reference/cli/docker/container/stop/
- Docker CLI reference: `docker run` - https://docs.docker.com/reference/cli/docker/container/run
- AWS CLI command reference: `aws s3 cp` - https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html
- MinIO client reference: `mc cp` - https://min.io/docs/minio/linux/reference/minio-mc/mc-cp.html
- Healthchecks.io Pinging API - https://healthchecks.io/docs/http_api/
- Healthchecks.io reliability tips - https://healthchecks.io/docs/reliability_tips/
- Local system manual page: `man 5 crontab`
- Local command help: `tar --help`
- Local command help: `find --help`

## Issues Found
- The main backup script stopped the `portainer` container but did not guarantee it would be started again if the archive step or a later command failed. I added an `EXIT` trap and state tracking so the script restarts Portainer automatically after failures.
- The script logged with `tee -a "$LOG_FILE"` while the cron example also appended stdout and stderr to the same file. That would duplicate log output. I changed the script to redirect its own stdout and stderr to `LOG_FILE` and removed the extra cron redirection.
- The Healthchecks example used an outdated ping URL pattern. Healthchecks.io currently documents `https://hc-ping.com/<uuid>` for success pings, so I updated the snippet to that endpoint.

## Review Notes
- The backup script assumes the default Docker standalone deployment Portainer documents today: container name `portainer` and named volume `portainer_data`.
- Portainer also has a built-in backup and restore feature, and Portainer Business Edition can schedule S3 backups directly from the UI. This post's custom Docker-volume backup approach is still technically valid.
- The email notification example assumes a working `mail` command and local mail delivery setup on the host.
- The updated Bash backup snippet was syntax-checked with `bash -n`. The Docker, AWS CLI, and MinIO commands were verified against current documentation but were not executed in this workspace because the required services and credentials are not configured here.
