# Validation Summary: How to Clean Up Orphaned Docker Volumes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker Engine
- Docker CLI
- Docker volumes
- Docker Compose
- Bash
- Cron

## Sources Consulted
- Docker Docs: docker volume prune - https://docs.docker.com/reference/cli/docker/volume/prune/
- Docker Docs: docker volume ls - https://docs.docker.com/reference/cli/docker/volume/ls/
- Docker Docs: docker system prune - https://docs.docker.com/reference/cli/docker/system/prune/
- Docker Docs: docker container rm - https://docs.docker.com/reference/cli/docker/container/rm/
- Docker Docs: docker container run - https://docs.docker.com/reference/cli/docker/container/run/
- Docker Docs: docker container ls / docker ps filters - https://docs.docker.com/reference/cli/docker/container/ls/
- Docker Docs: docker compose down - https://docs.docker.com/reference/cli/docker/compose/down/
- Docker Docs: Compose file volumes reference - https://docs.docker.com/reference/compose-file/volumes/
- Local Docker CLI help output for `docker volume prune`, `docker system prune`, `docker volume ls`, `docker rm`, `docker run`, `docker compose down`, and `docker system df`.

## Issues Found
- Corrected the `docker volume prune -f` explanation. Current Docker behavior prunes unused anonymous local volumes by default, not every dangling named and anonymous volume.
- Corrected the `docker volume prune -a -f` explanation. The `--all` flag removes unused local volumes not referenced by any container, including named volumes; it is not limited to volumes not mounted by running containers.
- Corrected the `docker system prune --volumes -f` explanation. Current Docker documentation describes `--volumes` as pruning anonymous volumes.
- Fixed the cron installation command so it preserves existing root crontab entries instead of replacing the whole crontab with a single line.

## Review Notes
The remaining commands and examples are technically valid for current Docker CLI and Compose behavior. The monitoring script assumes Docker's default Linux data root at `/var/lib/docker/volumes`; installations using rootless Docker, Docker Desktop, or a custom Docker data root may need to adjust `VOLUME_DIR`.
