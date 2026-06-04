# Validation Summary: How to Remove All Stopped Docker Containers

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Docker CLI
- Docker containers
- Docker prune commands
- Bash shell scripting
- cron
- systemd timers and services

## Sources Consulted
- Docker CLI reference: docker container prune - https://docs.docker.com/reference/cli/docker/container/prune/
- Docker CLI reference: docker container rm - https://docs.docker.com/reference/cli/docker/container/rm/
- Docker CLI reference: docker container ls / docker ps - https://docs.docker.com/reference/cli/docker/container/ls/
- Docker CLI reference: docker container run - https://docs.docker.com/reference/cli/docker/container/run/
- Docker docs: Prune unused Docker objects - https://docs.docker.com/engine/manage-resources/pruning/
- Docker docs: Volumes - https://docs.docker.com/engine/storage/volumes/
- Local Docker CLI help for `docker container prune`, `docker rm`, `docker ps`, `docker run`, `docker system prune`, `docker inspect`, `docker logs`, and `docker cp`

## Issues Found
- The post said anonymous volumes are deleted when a container is removed. Docker's documentation says named and anonymous volumes persist after normal container removal; anonymous volumes are removed only when using `docker rm -v` or when a container started with `--rm` exits. Updated the volume data loss note to reflect that behavior.
- The `docker system prune --volumes` example described removing unused volumes generally. Current Docker CLI help describes this flag as pruning anonymous volumes, so the example comment was narrowed to "unused anonymous volumes."

## Review Notes
- The `docker rm $(docker ps ...)` examples are valid, but they can print a usage error when the command substitution is empty. The post already includes the `xargs -r` approach for handling empty lists gracefully.
- The `xargs -r` flag is GNU-specific and may not be available on BSD/macOS `xargs` without adjustment.
