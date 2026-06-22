# Validation Summary: How to Create Images from Running Containers with docker commit

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker CLI
- Docker containers
- Docker images
- Dockerfile image configuration instructions
- Container filesystem export/import

## Sources Consulted
- Docker Docs: docker container commit - https://docs.docker.com/reference/cli/docker/container/commit/
- Docker Docs: docker container export - https://docs.docker.com/reference/cli/docker/container/export/
- Docker Docs: docker image import - https://docs.docker.com/reference/cli/docker/image/import/
- Local Docker CLI help for Docker 29.4.2: `docker commit --help`, `docker export --help`, `docker import --help`, `docker history --help`, `docker inspect --help`, `docker ps --help`, `docker cp --help`, `docker exec --help`

## Issues Found
- The post described `docker commit` as capturing the container filesystem state without noting Docker's documented exception for data in mounted volumes. Updated the introduction to state that mounted volume data is excluded.
- The `--change` options table omitted documented supported instructions `ONBUILD` and `VOLUME`. Added both to the table.
- The post used `docker commit --pause=false` to disable pausing. This still parses in Docker 29.4.2 but is deprecated in local CLI output, which recommends `--no-pause`. Updated the examples and summary table to use `--no-pause`.
- The export/import comparison implied flattened images are always smaller and suitable for creating minimal images. Docker export/import flattens a container filesystem, but size depends on filesystem contents. Updated the table to avoid the overstatement.

## Review Notes
The remaining commands and examples are consistent with Docker CLI syntax and documented behavior. `docker commit` remains useful for debugging and prototyping, but Dockerfiles are still the correct recommendation for reproducible production images.
