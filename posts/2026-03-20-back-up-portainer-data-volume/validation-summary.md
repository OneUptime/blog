# Validation Summary: How to Back Up Portainer Data Volume

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker volumes
- Docker CLI
- `tar`
- `curl`
- Bash

## Sources Consulted
- Portainer docs: General settings / Back up Portainer - https://docs.portainer.io/admin/settings/general
- Portainer docs: What does Portainer's backup include? - https://docs.portainer.io/faqs/getting-started/what-does-portainers-backup-include
- Portainer docs: Updating on Docker Standalone - https://docs.portainer.io/start/upgrade/docker
- Portainer docs: Client sent an HTTP request to an HTTPS server - https://docs.portainer.io/faqs/troubleshooting/client-sent-an-http-request-to-an-https-server
- Portainer docs: API documentation - https://docs.portainer.io/api/docs
- Docker docs: Volumes / Back up, restore, or migrate data volumes - https://docs.docker.com/engine/storage/volumes/#back-up-restore-or-migrate-data-volumes
- Portainer source: backup route registration - https://raw.githubusercontent.com/portainer/portainer/2.39.1/api/http/handler/backup/handler.go
- Portainer source: backup API handler - https://raw.githubusercontent.com/portainer/portainer/2.39.1/api/http/handler/backup/backup.go
- Portainer source: backup archive contents - https://raw.githubusercontent.com/portainer/portainer/2.39.1/api/backup/backup.go
- Portainer source: restore logic handling `portainer.db` and `portainer.edb` - https://raw.githubusercontent.com/portainer/portainer/2.39.1/api/backup/restore.go
- Portainer source: database filenames for encrypted and unencrypted stores - https://raw.githubusercontent.com/portainer/portainer/2.39.1/api/database/boltdb/db.go
- Portainer release metadata: latest LTS release 2.39.1 - https://github.com/portainer/portainer/releases/tag/2.39.1

## Issues Found
- The opening paragraph overstated the scope of the Portainer data volume as containing "everything". I changed it to clarify that it contains Portainer's own configuration data and not managed container or application data, matching Portainer's backup documentation.
- The API backup example used legacy HTTP on port `9000` and omitted the JSON body required by the current backup handler. I updated it to use `https://localhost:9443/api/backup`, added the admin API key placeholder, and sent `--data '{}'` with `Content-Type: application/json`.
- The UI instructions did not mention the admin requirement and described the backup as only the database. I changed this to match the current UI flow and clarified that the UI backup is a backup of Portainer's configuration.
- The automation example performed a raw volume tar backup while Portainer was still running. I added a stop-and-restart pattern so the volume backup is consistent, matching the guidance already used in Method 1.
- The integrity check only searched for `portainer.db`. I broadened it to match `portainer.db` or `portainer.edb`, because encrypted Portainer deployments use `portainer.edb`.
- The comment above the `tar` command claimed it was preserving ownership. I corrected the comment to avoid an inaccurate description of what the example was doing.

## Review Notes
- Portainer CE/BE defaults to HTTPS on port `9443` from CE 2.9 / BE 2.10 onward. HTTP on `9000` is legacy and only available if explicitly enabled.
- The API example uses `--insecure` because many local Portainer installs use the default self-signed certificate. On deployments with a trusted certificate, that flag should be removed.
- Review was checked against the current Portainer LTS release metadata available on May 7, 2026: release `2.39.1`, published on March 19, 2026.
