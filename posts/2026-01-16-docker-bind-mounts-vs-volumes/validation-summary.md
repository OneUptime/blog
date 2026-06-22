# Validation Summary: How to Choose Between Docker Bind Mounts and Named Volumes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker Engine storage
- Bind mounts
- Named volumes
- Docker Compose
- PostgreSQL and Redis container data directories
- Shell commands for Docker volume backup and restore

## Sources Consulted
- Docker bind mounts documentation: https://docs.docker.com/engine/storage/bind-mounts/
- Docker volumes documentation: https://docs.docker.com/engine/storage/volumes/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version and name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose merge files documentation: https://docs.docker.com/compose/how-tos/multiple-compose-files/merge/
- Docker Compose CLI reference: https://docs.docker.com/reference/cli/docker/compose/
- Docker Compose installation documentation: https://docs.docker.com/compose/install/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Local CLI checks with Docker 29.4.2 and Docker Compose v5.1.3.

## Issues Found
- The bind mount comparison table said the host path must exist. Docker's `--mount type=bind` requires an existing host path, but `-v`/`--volume` creates a missing host path as a directory. Updated the table to reflect this distinction.
- Compose snippets used the obsolete top-level `version: '3.8'` field. Modern Compose treats this field as informational and warns that it is obsolete, so it was removed from the examples.
- Run commands used the legacy standalone `docker-compose` command. Updated them to the current `docker compose` plugin command.
- Backup and restore examples used `$(pwd)` unquoted in volume mounts, which can break when the current path contains spaces. Updated the examples to use quoted `$PWD`.
- The permissions example used `UID=$(id -u)`, but `UID` is a readonly Bash variable. Updated the Compose interpolation variables to `HOST_UID` and `HOST_GID`.

## Review Notes
The remaining guidance is accurate for current Docker behavior. Docker Desktop now has newer synchronized file share behavior for some bind mounts, so the note that `cached`, `delegated`, and `consistent` are less necessary in newer Docker Desktop versions is appropriate.
