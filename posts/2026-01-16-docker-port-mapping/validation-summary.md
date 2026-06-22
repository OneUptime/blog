# Validation Summary: How to Map Docker Ports Correctly (Host, Bridge, and Container Networks)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine networking
- Docker bridge, host, none, and container network modes
- Docker port publishing with `docker run`
- Docker Compose ports, expose, and networks
- Linux port and network troubleshooting commands

## Sources Consulted
- Docker Docs: Port publishing and mapping - https://docs.docker.com/engine/network/port-publishing/
- Docker Docs: Bridge network driver - https://docs.docker.com/engine/network/drivers/bridge/
- Docker Docs: Host network driver - https://docs.docker.com/engine/network/drivers/host/
- Docker Docs: None network driver - https://docs.docker.com/engine/network/drivers/none/
- Docker Docs: Networking overview / container networks - https://docs.docker.com/engine/network/
- Docker Docs: Compose file reference - https://docs.docker.com/reference/compose-file/
- Docker Docs: Compose services reference (`ports`, `expose`) - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Networking in Compose - https://docs.docker.com/compose/how-tos/networking/
- Docker Docs: `docker container port` CLI reference - https://docs.docker.com/reference/cli/docker/container/port/
- Local Docker CLI help output for `docker run`, `docker ps`, and `docker network create`

## Issues Found
- The host networking table said all ports are exposed. Changed it to explain that port publishing is not used and applications bind directly to host ports, matching Docker's host network behavior.
- The host networking section said port mapping was "not possible" and omitted Docker's warning behavior. Updated it to say `-p` and `-P` are ignored with a warning.
- The Docker Desktop drawback said host networking is not available on macOS/Windows. Updated it because Docker Desktop 4.34 and later supports host networking when enabled in Settings.
- The Compose examples used the obsolete top-level `version: '3.8'` field. Removed it because the current Compose Specification treats `version` as obsolete and informational only.
- The Compose long syntax used `published: 3000` as a number. Quoted it as `published: "3000"` because the Compose services reference defines `published` as a string.
- The `expose` explanation said it is documentation only. Updated it because Compose `expose` defines container ports exposed to other services on the Docker network, while still not publishing them to the host.
- The `none` network mode table said "No networking." Changed it to "Only loopback networking" because Docker's none driver still creates the loopback device.

## Review Notes
The remaining Docker commands and Compose snippets are technically valid. The edited Compose snippets were checked with `docker compose config`. Some troubleshooting commands such as `netstat` may require packages that are not installed by default in minimal images, but the post already provides `ss` as an alternative.
