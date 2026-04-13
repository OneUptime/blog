# Validation Summary: How to Use Docker Volumes for MongoDB Data Persistence

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB 7.0
- Docker (volumes, bind mounts, container lifecycle)
- Docker Compose V2
- mongodump / mongorestore (logical backup tooling)
- Alpine Linux (used as a utility container for tar-based backups)

## Sources Consulted
- Docker official documentation on volumes: https://docs.docker.com/engine/storage/volumes/
- Docker Compose file reference (variable substitution): https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/
- Official MongoDB Docker image on Docker Hub: https://hub.docker.com/_/mongo
- MongoDB documentation on mongodump: https://www.mongodb.com/docs/database-tools/mongodump/
- Docker CLI reference for `docker volume`: https://docs.docker.com/reference/cli/docker/volume/

## Issues Found

1. **Missing `mongo_data` volume declaration in Shared Volume section.** The `mongo` service referenced `mongo_data:/data/db` but the top-level `volumes` block only declared `shared_exports`. Docker Compose would fail with an error about an undefined volume. **Fix:** Added `mongo_data:` to the top-level `volumes` declaration.

2. **Unescaped `$` in Docker Compose command field.** The backup service command contained `$(date +%Y%m%d)`, but Docker Compose interprets `$` as a variable substitution trigger. This would either cause an error or produce unexpected output. **Fix:** Changed to `$$(date +%Y%m%d)` which is the correct way to produce a literal `$` in a Compose file, allowing the shell inside the container to perform the command substitution.

## Review Notes
- The `version: "3.8"` field in the first Docker Compose example is deprecated in Docker Compose V2 (the current standard) and generates a warning. It is not incorrect — Compose V2 simply ignores it — but future readers may want to omit it. Not changed since it still functions correctly.
- The `mongodump` section uses container name `mongo-dev` while the Compose file defines the service as `mongo`. This is not an error (container names and service names are independent), but readers following along may need to adjust the container name to match their setup.
- The backup commands using `tar` on the raw data directory create physical backups that are tied to the specific MongoDB version and storage engine. The post correctly notes `mongodump` as the portable alternative.
