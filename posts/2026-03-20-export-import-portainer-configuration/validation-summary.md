# Validation Summary: How to Export and Import Portainer Configuration

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- Portainer HTTP API
- `curl`
- Python 3
- `tar`

## Sources Consulted
- Portainer docs: General settings / backup and restore UI flow: https://docs.portainer.io/admin/settings/general
- Portainer docs: Accessing the Portainer API: https://docs.portainer.io/api/access
- Portainer docs: API documentation index: https://docs.portainer.io/api/docs
- Portainer BE 2.39.1 OpenAPI spec: https://api-docs.portainer.io/versions/ee/2.39.1.yaml
- Portainer CE 2.39.1 OpenAPI spec: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer docs: What does Portainer's backup include?: https://docs.portainer.io/faqs/getting-started/what-does-portainers-backup-include
- Portainer docs: Updating on Docker Standalone: https://docs.portainer.io/start/upgrade/docker

## Issues Found
- The post incorrectly framed Portainer backup/export APIs as Business Edition-only and said CE did not have a dedicated export API. I corrected the scope because the official CE and BE API specs both expose `/backup` and `/restore`, and the local backup UI is documented outside BE-only S3 features.
- The UI navigation for backup was wrong. I changed `Settings > Backup & Restore` to the documented flow: open `Settings`, then scroll to `Back up Portainer`.
- The UI restore workflow was wrong. I changed it from restoring inside a running admin session to the documented restore flow on a fresh Portainer instance during initial setup with an empty data volume.
- The backup API example used the wrong JSON field name. I changed `password` to `Password` to match the published OpenAPI schema for `/api/backup`.
- The restore API example was incorrect. I replaced the undocumented multipart upload example with the documented JSON restore payload format for `/api/restore`, using `FileContent`, `FileName`, and `Password`.
- The exported/not-exported table contained unsupported or inaccurate claims such as live logs and Swarm secret values. I replaced it with items aligned to Portainer's official backup-contents documentation.
- The CE volume-restore example used `portainer/portainer-ce:latest`. I updated it to `portainer/portainer-ce:lts` to match current Portainer Docker guidance.

## Review Notes
- Portainer's general API docs recommend user access tokens via the `X-API-Key` header, but JWT authentication via `/api/auth` remains present in the published OpenAPI spec, so the JWT-based export example is still technically valid.
- The `/api/restore` endpoint is documented as a JSON payload that carries the backup bytes, which is correct but less ergonomic than a multipart file upload.
