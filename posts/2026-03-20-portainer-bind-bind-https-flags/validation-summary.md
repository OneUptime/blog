# Validation Summary: How to Use the --bind and --bind-https Flags in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer CE CLI flags
- Docker `docker run`
- Docker Compose
- Docker networking and port publishing

## Sources Consulted
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer CE install docs for Docker on Linux: https://docs.portainer.io/start/install-ce/server/docker/linux
- Docker CLI `docker run` reference: https://docs.docker.com/reference/cli/docker/container/run/
- Docker host network driver docs: https://docs.docker.com/engine/network/drivers/host/
- Docker Compose `version` top-level element docs: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The loopback example mixed Docker host-side port publishing with Portainer's internal bind address. I changed the example to describe host loopback publishing correctly and changed `--bind 0.0.0.0:9000` to `--bind :9000`, which matches the intended behavior.
- The specific-IP example depends on Docker host networking semantics rather than standard bridge networking. I added a Linux host-networking caveat so the example is not presented as universally applicable.
- The Docker Compose snippet used the top-level `version: "3.8"` field. Docker now treats that field as obsolete, so I removed it.

## Review Notes
- Portainer's official CLI docs still define `--bind` with a default of `:9000` and `--bind-https` with a default of `:9443`.
- Portainer's current Docker installation docs publish `9443` by default and document `9000` as optional legacy HTTP exposure on the host. The opening paragraph in the post is still accurate because it describes Portainer's bind defaults rather than Docker's published ports.
