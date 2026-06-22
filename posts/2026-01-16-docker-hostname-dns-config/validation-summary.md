# Validation Summary: How to Configure Docker Container Hostname and DNS

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker Engine
- Docker CLI
- Docker Compose
- Docker bridge networking
- DNS resolver configuration
- `/etc/hosts` entries

## Sources Consulted
- Docker CLI `docker run --help` output from Docker 29.4.2
- Docker CLI `docker network connect --help` output from Docker 29.4.2
- Docker Compose `docker compose version` output from Docker Compose v5.1.3
- Docker Docs: Networking overview - https://docs.docker.com/engine/network/
- Docker Docs: Bridge network driver - https://docs.docker.com/engine/network/drivers/bridge/
- Docker Docs: Compose file services reference - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Compose version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: dockerd CLI reference - https://docs.docker.com/reference/cli/dockerd/

## Issues Found
- The `docker exec my-container hostname` example attempted to exec into a container created by a foreground `docker run ... alpine hostname` command, which exits immediately. Changed the example to start a detached container with `sleep 3600` before using `docker exec`.
- The Docker Run DNS options example used `--dns-opt`. Docker 29.4.2 accepts it, but the current documented `docker run --help` long option is `--dns-option`. Updated the example and summary table to use `--dns-option`.
- The `/etc/docker/daemon.json` example included a `//` comment inside a `json` code block, making the JSON invalid. Moved the file path label outside the JSON block.
- The complete Compose example included `version: '3.8'`. The current Compose Specification keeps the top-level `version` field only for backward compatibility and reports it as obsolete. Removed the obsolete field.

## Review Notes
The remaining Docker networking, DNS, `extra_hosts`, `host-gateway`, Compose DNS, and network alias examples match current Docker documentation. The `host.docker.internal:host-gateway` pattern is especially relevant for Linux Docker Engine; Docker Desktop also provides `host.docker.internal` behavior for local development.
