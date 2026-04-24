# Validation Summary: How to Export and Import Portainer Configuration - Config

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer CE and Business Edition
- Portainer HTTP API
- Docker volumes and containers
- BoltDB
- Bash
- `curl`
- `jq`

## Sources Consulted
- Portainer API documentation overview: https://docs.portainer.io/api/docs
- Portainer CE OpenAPI spec 2.39.1: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer BE OpenAPI spec 2.39.1: https://api-docs.portainer.io/versions/ee/2.39.1.yaml
- Portainer backup and restore settings: https://docs.portainer.io/admin/settings/general
- Portainer backup contents FAQ: https://docs.portainer.io/faqs/getting-started/what-does-portainers-backup-include
- Portainer database encryption documentation: https://docs.portainer.io/advanced/db-encryption
- Portainer CE Docker installation guidance: https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer API access token guidance: https://docs.portainer.io/2.21/api/access
- Portainer source for file-store paths: https://raw.githubusercontent.com/portainer/portainer/develop/api/filesystem/filesystem.go
- Portainer source for encrypted database filenames: https://raw.githubusercontent.com/portainer/portainer/develop/api/database/boltdb/db.go
- Portainer source for chisel key storage: https://raw.githubusercontent.com/portainer/portainer/develop/api/chisel/service.go

## Issues Found
- The post claimed the API backup/export flow was Business Edition only. The current official CE and BE OpenAPI specs both expose `/api/backup` and `/api/restore`, so the method headings and conclusion were corrected.
- The API examples used an API token with `Authorization: Bearer ...` and a lowercase JSON field `password`. Portainer's documented access-token flow uses the `X-API-KEY` header, and the current OpenAPI spec defines the backup payload field as `Password`, so the examples were updated accordingly.
- The API restore example used `multipart/form-data` upload fields, which does not match the current `/api/restore` schema. The example was replaced with a JSON payload that includes `FileName`, `FileContent`, and `Password`, matching the official spec.
- The storage description overstated that all configuration lives only in `portainer.db` and omitted encrypted-database and stack-file storage details. It was corrected to reflect the `/data` volume layout, including `portainer.edb` when database encryption is enabled, the `compose/` directory, and related certificate/tunnel files.
- The import example used `portainer/portainer-ce:latest`, which does not match current official Docker installation guidance. It was updated to an explicit image variable using the documented `:sts` tag, with a note to use the matching BE image when applicable.
- The restore guidance did not mention the external encryption secret required for encrypted databases. A note was added explaining that the same secret mounted at `/run/secrets/portainer` must be preserved for encrypted restores.

## Review Notes
- Portainer documents restore-from-backup as something performed on a fresh instance during initial setup. The API restore example now calls this out explicitly.
- The post's Docker-volume backup method is still valid for backing up the full `/data` volume, but operators should remember that it does not capture external secrets such as the database-encryption secret.
