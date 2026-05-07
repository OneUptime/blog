# Validation Summary: How to Assign a Static IPv4 Address to a Docker Container

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker Engine
- Docker networking
- IPv4 container addressing
- Docker CLI (`docker run`, `docker network create`, `docker inspect`)
- Docker Compose

## Sources Consulted
- Docker CLI reference for `docker run`: https://docs.docker.com/reference/cli/docker/container/run/
- Docker networking overview: https://docs.docker.com/engine/network/
- Docker bridge network driver documentation: https://docs.docker.com/engine/network/drivers/bridge/
- Docker Compose services reference (`ipv4_address`): https://docs.docker.com/reference/compose-file/services/
- Docker Compose version top-level element reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose networking guide: https://docs.docker.com/compose/how-tos/networking/

## Issues Found
- The introduction said Docker assigns container IPs from a "DHCP pool." Docker documents this as IP allocation from the network's address pool/subnet managed by Docker, so the wording was corrected.
- The Compose example used the top-level `version: "3.8"` field. Current Docker Compose documents this field as obsolete, so it was removed.
- The post referred to the default `docker0` network and explained the limitation using "different internal management mode." This was corrected to the documented terminology: the default network is `bridge` (backed by `docker0` on Linux), and user-specified IP addresses with `--ip` are supported only on user-defined networks.

## Review Notes
- Runtime-validated locally with Docker Engine 29.4.2 and Docker Compose v5.1.3: assigning a static IP on a user-defined bridge worked, `docker run --network bridge --ip ...` failed with Docker's documented error, and the assigned IP persisted across a container restart.
- Docker supports this configuration, but for multi-container apps it still generally recommends using service names on user-defined networks when possible instead of hard-coding IPs.
