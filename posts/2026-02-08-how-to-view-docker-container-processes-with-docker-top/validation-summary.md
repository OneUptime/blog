# Validation Summary: How to View Docker Container Processes with docker top

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker CLI
- Docker Compose CLI
- Linux process inspection with ps
- Linux PID namespaces
- Container process monitoring and debugging

## Sources Consulted
- Docker Docs: docker container top - https://docs.docker.com/reference/cli/docker/container/top/
- Docker Docs: docker compose top - https://docs.docker.com/reference/cli/docker/compose/top/
- Docker Docs: docker container run --init - https://docs.docker.com/reference/cli/docker/container/run/#specify-an-init-process
- Docker Docs: docker container inspect - https://docs.docker.com/reference/cli/docker/container/inspect/
- Local Docker CLI help for Docker 29.4.2: `docker top --help`, `docker compose top --help`
- Local GNU ps manual/help output
- Live command verification against a temporary `nginx:alpine` container

## Issues Found
- The sorted memory example used `docker top web-server -o pid,pmem,cmd --sort=-pmem`. In live verification, this only displayed one process because the command/args output field can consume the remaining arguments when used in that position. Changed it to `docker top web-server -eo pid,pmem,args --sort=-pmem`, which lists all container processes and sorts them correctly.
- The PID namespace comparison used `docker exec my-container ps -o pid,cmd`. BusyBox `ps`, common in Alpine-based containers, rejects `cmd` as an output field. Changed both comparison commands to use `args`, which works with the verified Alpine container and still displays the command line.

## Review Notes
The rest of the Docker and Docker Compose command forms matched official CLI usage. `docker top` accepts container IDs or names followed by ps options, `docker compose top` supports optional service names, `docker run --init` is documented for reaping zombie processes, and `docker inspect --format='{{.State.Pid}}'` is consistent with Docker's Go template formatting support.
