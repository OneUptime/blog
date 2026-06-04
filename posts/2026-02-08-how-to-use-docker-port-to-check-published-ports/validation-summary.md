# Validation Summary: How to Use Docker Port to Check Published Ports

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker CLI
- Docker container port publishing
- Docker Compose
- Container networking
- Shell scripting

## Sources Consulted
- Docker Docs: docker container port CLI reference - https://docs.docker.com/reference/cli/docker/container/port/
- Docker Docs: docker container run CLI reference - https://docs.docker.com/reference/cli/docker/container/run/
- Docker Docs: Publishing and exposing ports - https://docs.docker.com/get-started/docker-concepts/running-containers/publishing-ports/
- Docker Docs: Port publishing and mapping - https://docs.docker.com/engine/network/port-publishing/
- Docker Docs: Dockerfile EXPOSE reference - https://docs.docker.com/reference/builder/#expose
- Docker Docs: docker compose port CLI reference - https://docs.docker.com/reference/cli/docker/compose/port/
- Local Docker CLI help: `docker port --help`, `docker ps --help`, `docker inspect --help`, `docker compose port --help`, `docker compose ps --help`

## Issues Found
- The shell examples used `cut -d: -f2` to extract host ports from `docker port` output. This works for simple IPv4 bindings such as `0.0.0.0:8080`, but it is fragile for IPv6-style output such as `[::]:8080`, which the post itself shows. Changed the examples to use `awk -F: '{print $NF}'`, which extracts the final field and works for both IPv4 and IPv6-style bindings.
- The explanation for `0.0.0.0:8080` said all network-connected machines can reach it. Docker does publish to all IPv4 interfaces by default, but actual reachability still depends on traffic reaching the Docker host and any surrounding network/firewall rules. Reworded this to say the port is bound to any IPv4 interface and traffic that reaches the Docker host on that port can access it.

## Review Notes
The Docker CLI commands, Compose commands, `-p` and `-P` behavior, `EXPOSE` explanation, `docker inspect` template, and port range examples are consistent with current Docker documentation. Future improvements could mention that host reachability can vary on Docker Desktop because traffic may pass through the Desktop backend or VM layer, but the current post remains technically accurate for its stated scope.
