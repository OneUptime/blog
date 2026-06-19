# Validation Summary: How to Get Host IP Address from Inside a Docker Container

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine networking
- Docker Desktop networking
- Docker Compose
- Linux bridge networking
- Docker CLI
- Python
- Flask
- PostgreSQL connection configuration

## Sources Consulted
- Docker Docs: Explore networking how-tos on Docker Desktop: https://docs.docker.com/desktop/features/networking/networking-how-tos/
- Docker Docs: Host network driver: https://docs.docker.com/engine/network/drivers/host/
- Docker Docs: Bridge network driver: https://docs.docker.com/engine/network/drivers/bridge/
- Docker Docs: docker container run reference: https://docs.docker.com/reference/cli/docker/container/run/
- Docker Docs: Compose file `version` and `name` top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Local Docker CLI help output for `docker run --help` and `docker network inspect --help`.

## Issues Found
- The Compose examples used the top-level `version: '3.8'` field. Docker Compose now treats the top-level `version` property as obsolete and uses the current Compose Specification regardless of that field. Removed the `version` field from the Compose snippets.
- The Compose `extra_hosts` snippets used `host.docker.internal:host-gateway`. Docker Compose currently prefers `HOSTNAME=IP` syntax for `extra_hosts`, with `:` support only added in newer Compose versions. Changed the Compose snippets to `host.docker.internal=host-gateway`.
- The host network mode section said host networking only works on Linux. Docker's current documentation says host networking is supported on Docker Engine for Linux and Docker Desktop 4.34+ when enabled. Updated the bullet list and comparison table accordingly.
- The comparison table said the Docker API bridge gateway method works on Mac and Windows. That method is generally reliable for Linux bridge networks, but Docker Desktop runs Docker Engine inside a VM, so the bridge gateway is not generally the host machine's IP. Updated the table and narrowed the Python comment.

## Review Notes
The remaining examples are technically valid for the contexts described. Some examples assume common tools are installed inside the container, such as `ping`, `ip`, `awk`, `sed`, `getent`, and Python packages like `requests`, `flask`, and `docker`; minimal container images may require installing those tools or dependencies first.
