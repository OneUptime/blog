# Validation Summary: How to Get Container IP Address in Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine CLI
- Docker container networking
- Docker Compose networking
- Docker daemon IPv6 configuration
- Bash scripting
- Python socket module
- Node.js os module

## Sources Consulted
- Docker CLI reference: docker inspect: https://docs.docker.com/reference/cli/docker/inspect/
- Docker CLI reference: docker network inspect: https://docs.docker.com/reference/cli/docker/network/inspect/
- Docker CLI reference: docker ps: local `docker ps --help` from Docker 29.4.2
- Docker CLI reference: docker compose ps: local `docker compose ps --help` from Docker Compose v5.1.3
- Docker networking overview: https://docs.docker.com/engine/network/
- Docker Compose networking how-to: https://docs.docker.com/compose/how-tos/networking/
- Docker Compose networks reference: https://docs.docker.com/reference/compose-file/networks/
- Docker Compose services reference for static IP addresses: https://docs.docker.com/reference/compose-file/services/
- Docker Compose version top-level element reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker IPv6 networking documentation: https://docs.docker.com/engine/daemon/ipv6/
- Python socket module documentation: https://docs.python.org/3/library/socket.html
- Node.js os.networkInterfaces documentation: https://nodejs.org/api/os.html

## Issues Found
- The `/proc/net/fib_trie` command could return a broadcast address instead of the container IP. Replaced it with an `ip route get` command that extracts the source address chosen for the default route.
- The "Get IP of Most Recent Container" script used `docker ps -lq`, which can include stopped containers. Changed it to read the first running container from `docker ps -q`.
- The "Find Container by IP" script used a pipeline loop where `exit 0` only exited the subshell, so it could still print "No container found" after a match. Replaced the loop with a `for` loop and checked each network IP on separate lines.
- The same "Find Container by IP" script compared concatenated IP addresses for multi-network containers. Updated the inspect template to print one IP per line and compare with `grep -Fxq`.
- The "Export IPs to Environment" script was documented for `source`, but only echoed export statements and used a pipeline loop that would not persist variable changes in the caller shell. Changed it to export variables directly from a Bash process-substitution loop.
- The environment variable conversion only replaced hyphens, but Docker container names can include other characters such as dots. Updated the conversion to replace all non-environment-variable characters with underscores.
- The Compose examples used the obsolete top-level `version: '3.8'` field. Removed it from the snippets so they match the current Compose Specification guidance.

## Review Notes
The main Docker inspect, network inspect, Compose DNS, static IP, and IPv6 examples are consistent with current Docker documentation. Container IPs remain ephemeral for dynamically assigned addresses, so the post's recommendation to use Docker DNS and service names is correct.
