# Validation Summary: How to Understand Docker Bridge Networking in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Docker Engine bridge networking
- Docker Compose networking
- Portainer network management
- `docker network` CLI commands
- `jq` for inspecting Docker JSON output

## Sources Consulted
- Docker Docs: Bridge network driver - https://docs.docker.com/engine/network/drivers/bridge/
- Docker Docs: Networking overview - https://docs.docker.com/engine/network/
- Docker Docs: `docker network create` - https://docs.docker.com/reference/cli/docker/network/create/
- Docker Docs: `docker network connect` - https://docs.docker.com/reference/cli/docker/network/connect/
- Docker Docs: `docker network disconnect` - https://docs.docker.com/reference/cli/docker/network/disconnect/
- Docker Docs: `docker network inspect` - https://docs.docker.com/reference/cli/docker/network/inspect/
- Docker Docs: Compose file reference - https://docs.docker.com/reference/compose-file/
- Docker Docs: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Compose networks reference - https://docs.docker.com/reference/compose-file/networks/
- Portainer Docs: Networks - https://docs.portainer.io/user/docker/networks
- Portainer Docs: Add a new network - https://docs.portainer.io/user/docker/networks/add
- Portainer Docs: View a container's details - https://docs.portainer.io/user/docker/containers/view

## Issues Found
- The introduction implied that containers on any bridge network can communicate by name. Docker only provides automatic DNS-based name resolution on user-defined bridge networks, not the default `bridge` network. I corrected the wording and the diagram to reflect that the default bridge is IP-only unless legacy linking is used.
- The post referred to the default network as `docker0`. In Docker terminology, the default network is `bridge`; on Linux it corresponds to the `docker0` bridge interface. I clarified that distinction.
- The Compose example used the top-level `version: "3.8"` field. Docker's current Compose documentation marks the top-level `version` property as obsolete, so I removed it.
- The stack-isolation wording overstated the behavior by implying cross-stack communication is categorically prevented. I revised this to the more precise statement that services remain isolated unless they share a network.
- The `internal: true` explanations were too broad. I updated them to describe Docker's documented behavior as creating an externally isolated network for containers on that network.
- The Portainer guidance for attaching a running container to a network was missing the documented requirement to enable manual container attachment when creating the network in Portainer. I added that note and avoided relying on a possibly version-specific UI label.
- The troubleshooting example using `nc` assumed the tool exists in the container image. I kept the command but added a note that it depends on `nc` being installed.

## Review Notes
- Docker CLI was not installed in the local review environment, so Docker command behavior was verified against official Docker CLI documentation rather than by executing the commands locally.
- The `jq` filters in the examples were sanity-checked locally against representative JSON and are syntactically valid.
- The `docker0` naming is Linux-specific. On Docker Desktop, the underlying bridge exists inside the Linux VM rather than directly on the host OS.
