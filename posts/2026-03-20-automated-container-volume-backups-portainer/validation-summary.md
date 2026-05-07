# Validation Summary: How to Set Up Automated Container Volume Backups via Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- Docker Compose stacks
- Docker volumes
- PostgreSQL
- `offen/docker-volume-backup`
- Amazon S3
- AWS CLI

## Sources Consulted
- Portainer documentation, "Add a new stack": https://docs.portainer.io/user/docker/stacks/add
- Portainer documentation, "View container logs": https://docs.portainer.io/user/docker/containers/logs
- Docker documentation, "Volumes": https://docs.docker.com/engine/storage/volumes/
- `offen/docker-volume-backup` documentation home: https://offen.github.io/docker-volume-backup/
- `offen/docker-volume-backup` configuration reference: https://offen.github.io/docker-volume-backup/reference/
- `offen/docker-volume-backup` how-to, "Stop containers during backup": https://offen.github.io/docker-volume-backup/how-tos/stop-containers-during-backup.html
- `offen/docker-volume-backup` how-to, "Automatically prune old backups": https://offen.github.io/docker-volume-backup/how-tos/automatically-prune-old-backups.html
- `offen/docker-volume-backup` how-to, "Restore volumes from a backup": https://offen.github.io/docker-volume-backup/how-tos/restore-volumes-from-backup.html
- `offen/docker-volume-backup` how-to, "Receive notifications": https://offen.github.io/docker-volume-backup/how-tos/set-up-notifications.html
- Shoutrrr documentation, "Generic": https://shoutrrr.nickfedor.com/v0.12.0/services/specialized/generic/
- AWS CLI documentation, "Using high-level (s3) commands in the AWS CLI": https://docs.aws.amazon.com/cli/latest/userguide/cli-services-s3-commands.html

## Issues Found
- The post used the wrong stop-label configuration for `offen/docker-volume-backup` v2. I replaced `BACKUP_STOP_CONTAINER_LABEL` with `BACKUP_STOP_DURING_BACKUP_LABEL`, changed the label key to `docker-volume-backup.stop-during-backup`, and moved that label onto the application container so the backup job stops PostgreSQL instead of labeling the backup container itself.
- The S3 endpoint example used a full URL in `AWS_ENDPOINT`. The official configuration expects the hostname in `AWS_ENDPOINT` and the protocol separately, so I changed it to `s3.amazonaws.com`.
- The backup filename example omitted the archive extension, but later restore commands assumed a `.tar.gz` object. I changed `BACKUP_FILENAME` to include `{{ .Extension }}` so the generated object name matches the documented restore flow.
- The retention example could prune unrelated objects in the same bucket because `BACKUP_RETENTION_DAYS` applies broadly unless a pruning prefix is set. I added `BACKUP_PRUNING_PREFIX=postgres-data-` so pruning is limited to this backup set.
- The post said the backup process would "snapshot the volume", which is not how this image works in the shown configuration. I changed the wording to "archive the mounted volume contents" and removed the fixed downtime claim because backup duration depends on data size and workload.
- The restore example extracted the archive into a different mount path than the one used during backup, which would restore the wrong directory structure. I updated the command to mount the destination volume at `/backup/postgres-data` and extract from a read-only archive mount, matching the tool's documented restore pattern.
- The notification example used a bare HTTPS URL even though `NOTIFICATION_URLS` expects Shoutrrr service URLs. I changed the example to `generic+https://your-webhook.example.com`, which is the documented generic webhook format.
- The summary claimed the setup produced encrypted backups, but the example did not enable GPG encryption. I removed that claim.

## Review Notes
- The post is now technically correct for the documented `offen/docker-volume-backup` v2 flow.
- GPG-encrypted backups are supported by the tool, but they require additional configuration that is not present in this post.
- In Portainer stack deployments, underlying Docker volume names may be prefixed by the stack name at the engine level even when the Compose file declares them as `postgres-data`.
