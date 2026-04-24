# Validation Summary: How to Configure Container Port Mappings in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker container networking
- Docker bridge, host, and overlay network modes
- Docker Compose YAML
- Linux `ss` socket inspection

## Sources Consulted
- Portainer Documentation: Add a new container - https://docs.portainer.io/sts/user/docker/containers/add
- Portainer Documentation: View a container's details - https://docs.portainer.io/user/docker/containers/view
- Portainer Documentation: Configure service options - https://docs.portainer.io/user/docker/services/configure
- Portainer Documentation: Edit or duplicate a container - https://docs.portainer.io/2.27/user/docker/containers/edit
- Docker Docs: Networking overview - https://docs.docker.com/engine/network/
- Docker Docs: Port publishing and mapping - https://docs.docker.com/engine/network/port-publishing/
- Docker Docs: Bridge network driver - https://docs.docker.com/engine/network/drivers/bridge/
- Docker Docs: Host network driver - https://docs.docker.com/engine/network/drivers/host/
- Docker Docs: Overlay network driver - https://docs.docker.com/engine/network/drivers/overlay/
- Docker Docs: `docker container port` reference - https://docs.docker.com/reference/cli/docker/container/port/
- Local command help: `ss --help`

## Issues Found
- The introduction overstated reachability by saying a service without a port mapping is inaccessible from the host network. I changed this to say it is generally inaccessible from outside the Docker host, which matches Docker's networking behavior for bridge networks.
- The random host port section described leaving the host port field empty. I changed this to Portainer's documented **Publish all exposed network ports to random host ports** option, which is the current Portainer workflow for random host-port assignment.
- The inter-container communication guidance said to use Docker networks and container names. I changed this to user-defined Docker networks and container names, because Docker's automatic DNS-based name resolution is a user-defined-network feature.
- The troubleshooting command only covered TCP even though the post discusses UDP mappings too. I updated it to use `ss -ltnp` for TCP and `ss -lunp` for UDP.
- The security example used a `bash` code fence even though the snippet is descriptive text, not an executable shell example. I changed the fence to `text`.

## Review Notes
- Portainer UI labels can vary slightly by release, but the revised post now aligns with current Portainer container-creation documentation.
- Host networking remains platform-dependent: Docker Engine on Linux supports it, and Docker Desktop supports it starting with version 4.34 when enabled.
- The overlay-network section is high-level by design. In Swarm, external port publishing is handled at the service level, while standalone attachable overlay networking has additional nuances not covered here.
