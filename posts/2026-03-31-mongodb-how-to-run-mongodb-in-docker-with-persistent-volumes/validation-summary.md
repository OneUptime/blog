# Validation Summary: How to Run MongoDB in Docker with Persistent Volumes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB 7.0 / 8.0
- Docker (named volumes, bind mounts, docker compose)
- Docker Compose V2
- MongoDB Database Tools (mongodump)
- mongod.conf (YAML configuration)

## Sources Consulted
- Official mongo Docker image Dockerfile: https://github.com/docker-library/mongo/blob/master/7.0/Dockerfile
- Docker Hub mongo image documentation: https://github.com/docker-library/docs/blob/master/mongo/content.md
- Docker Compose version field docs: https://docs.docker.com/reference/compose-file/version-and-name/
- MongoDB release notes and upgrade path docs: https://www.mongodb.com/docs/manual/release-notes/
- MongoDB mongod.conf configuration reference: https://www.mongodb.com/docs/manual/reference/configuration-options/

## Issues Found

1. **Docker Compose `version` field is obsolete**: The `version: "3.8"` top-level property is deprecated in Docker Compose V2 and generates a warning. Removed it since the post uses `docker compose` (V2 syntax) to start the stack.

2. **Backup output path inside MongoDB data directory**: The `mongodump --out /data/db/backup` command wrote backup files into MongoDB's data directory (`/data/db`), which mixes backup artifacts with live database files. Changed to `/tmp/backup` to keep backups separate from the data directory.

3. **Upgrade example did not demonstrate an actual upgrade**: The upgrade section claimed to show a version upgrade but used `mongo:7.0` for both the old and new container. Changed the new container to `mongo:8.0` to actually demonstrate the upgrade workflow. Also added a note about MongoDB's requirement to upgrade one major version at a time and to check release notes.

## Review Notes
- The `~/mongodb/logs` directory is created in the bind mount example but never mounted to the container. This is a minor inconsistency but not technically wrong.
- The `docker inspect` verification uses a Python one-liner which works but is unconventional. `docker inspect --format '{{json .Mounts}}' mongodb | python3 -m json.tool` or `docker inspect --format '{{range .Mounts}}{{.Source}} -> {{.Destination}}{{"\n"}}{{end}}' mongodb` would be more idiomatic Docker usage.
- The init script uses legacy `mongo` shell syntax (`db = db.getSiblingDB(...)`) which still works with `mongosh` in the Docker image but is considered legacy style.
- `mongodump` IS included in the `mongo:7.0` Docker image (via the `mongodb-org-database-tools-extra` package), despite being a separately released component since MongoDB 4.4. The backup commands are valid.
