# Validation Summary: How to Inspect Docker Container Changes with docker diff

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker CLI
- Docker containers and writable layers
- Docker volumes and bind mounts
- Bash scripting
- PostgreSQL Docker Official Image
- Nginx Docker image usage

## Sources Consulted
- Docker CLI reference: docker container diff - https://docs.docker.com/reference/cli/docker/container/diff/
- Docker CLI reference: docker container run - local `docker run --help`
- Docker CLI reference: docker container exec - local `docker exec --help`
- Docker CLI reference: docker container cp - https://docs.docker.com/reference/cli/docker/container/cp/
- Docker CLI reference: docker container commit - https://docs.docker.com/reference/cli/docker/container/commit/
- Docker CLI reference: docker container logs - https://docs.docker.com/reference/cli/docker/container/logs/
- Docker storage documentation: Volumes - https://docs.docker.com/engine/storage/volumes/
- PostgreSQL Docker Official Image documentation - https://hub.docker.com/_/postgres

## Issues Found
- The description and opening explanation said `docker diff` inspects running containers or compares against the base image. Docker documents it as listing changes since the container was created, and the command also works for stopped containers. Updated the wording to match Docker's documented behavior.
- The nginx example curled `localhost:80` without publishing the container port. Added `-p 8080:80` and changed the curl target to `localhost:8080` so the request reaches the container.
- The Python slim example used `bash -c`, but slim images should not assume Bash is installed. Changed it to `sh -c`.
- The PostgreSQL example expected `docker diff` to show database files under the image's default data directory, but the PostgreSQL 15 official image declares `/var/lib/postgresql/data` as a volume. Added `PGDATA=/tmp/pgdata` so the example writes data into the container writable layer where `docker diff` can report it.
- The container size script piped the whole `for` loop into `sort`, so Bash would run the loop in a subshell and the final `total` printed as zero. Reworked the script to write entries to a temporary file, sort that file, and keep `total` in the main shell. Also changed the size command to GNU/Linux `stat -c%s`, which is appropriate inside typical Linux containers.

## Review Notes
The security and size-analysis scripts are illustrative and still assume ordinary Unix-style paths. They are suitable for the tutorial, but production-grade scripts should handle unusual filenames and should avoid `eval` unless the operation input is trusted.
