# Validation Summary: How to Back Up Portainer Data Before an Upgrade

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- Shell scripting
- `curl`
- Cron
- Backup and restore operations

## Sources Consulted
- Portainer docs, "What does Portainer's backup include?": https://docs.portainer.io/faqs/getting-started/what-does-portainers-backup-include
- Portainer docs, "Back up Portainer" in General settings: https://docs.portainer.io/admin/settings/general
- Portainer docs, "Accessing the Portainer API": https://docs.portainer.io/api/access
- Portainer source, backup archive implementation: https://github.com/portainer/portainer/blob/develop/api/backup/backup.go
- Portainer source, `/api/backup` handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/backup/backup.go
- Portainer source, backup route registration and admin restriction: https://github.com/portainer/portainer/blob/develop/api/http/handler/backup/handler.go
- Portainer source, database filename selection (`portainer.db` vs `portainer.edb`): https://github.com/portainer/portainer/blob/develop/api/database/boltdb/db.go
- Docker docs, "Volumes" (`Back up, restore, or migrate data volumes`): https://docs.docker.com/engine/storage/volumes/
- Docker CLI docs, `docker container run`: https://docs.docker.com/reference/cli/docker/container/run/
- Docker CLI docs, `docker container stop`: https://docs.docker.com/reference/cli/docker/container/stop/
- Docker CLI docs, `docker container start`: https://docs.docker.com/reference/cli/docker/container/start/

## Issues Found
- The introduction implied that all upgrade-relevant Portainer state lives only in the BoltDB file. Portainer's official docs and source show that backups also include related files under `/data` such as stack files, certificates, templates, and other Portainer-managed artifacts. I corrected the wording to reflect database plus related files.
- The post hard-coded `portainer.db` as the only possible database filename. Portainer's source supports `portainer.edb` when the database is encrypted, so the "copy only the database file" example could fail on encrypted installations. I updated the section and command example to handle either filename.
- The API section described the backup endpoint as a Portainer Business Edition-only feature. Current Portainer docs/source expose `/api/backup` in the main API without BE-only wording for local backup, while S3 backup is the specifically BE-only feature. I removed the BE-only framing and kept the section focused on the API endpoint itself.
- The API example used a JWT/Bearer flow description, while Portainer's official API access docs document access tokens in the `X-API-Key` header for scripted API usage. I changed the example to use an admin access token in the documented header.
- The API example always printed a success message even if the server returned an HTTP error, because `curl` would still exit successfully without `--fail`. I added `--fail --silent --show-error` and wrapped the success message in a conditional.
- The tar-archive example used `$(date ...)` twice, which could produce a printed filename that does not match the archive actually created if the timestamp changed between commands. I introduced a single `TIMESTAMP` variable so the archive path and status output stay consistent.
- The verification section referenced `backups/portainer_backup_latest.tar.gz`, but none of the earlier commands created a file with that name. I changed the example to select the newest actual backup file before running `tar tzf`.

## Review Notes
- The post now aligns with current Portainer docs/source as of May 6, 2026. A manual runtime test against a live Portainer instance was not performed in this environment, so validation was based on official documentation, route definitions, and command syntax review.
