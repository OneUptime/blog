# Validation Summary: How to Deploy and Manage Docker Swarm Clusters on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Docker Engine
- Docker Swarm mode
- Docker services
- Docker stacks
- Compose files for stack deployment
- firewalld

## Sources Consulted
- Docker Docs: Install Docker Engine on RHEL - https://docs.docker.com/engine/install/rhel/
- Docker Docs: Getting started with Swarm mode - https://docs.docker.com/engine/swarm/swarm-tutorial/
- Docker Docs: docker swarm init CLI reference - https://docs.docker.com/reference/cli/docker/swarm/init/
- Docker Docs: docker service create CLI reference - https://docs.docker.com/reference/cli/docker/service/create/
- Docker Docs: docker service scale CLI reference - https://docs.docker.com/reference/cli/docker/service/scale/
- Docker Docs: docker stack deploy CLI reference - https://docs.docker.com/reference/cli/docker/stack/deploy/
- Docker Docs: Deploy a stack to a swarm - https://docs.docker.com/engine/swarm/stack-deploy/
- Red Hat Documentation: Building, running, and managing containers on RHEL 9 - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/building_running_and_managing_containers/

## Issues Found
- The Docker install command omitted `docker-buildx-plugin` and `docker-compose-plugin`, which are part of Docker's current recommended RHEL installation command. Updated the command to match the official Docker Engine installation instructions.
- The Swarm setup omitted the required inter-node Swarm ports. Docker documents that TCP 2377, TCP/UDP 7946, and UDP 4789 must be available between Swarm hosts. Added `firewall-cmd` commands to open those ports on RHEL 9 systems using firewalld.

## Review Notes
- Red Hat's supported container tooling for RHEL 9 is centered on Podman, Buildah, and Skopeo, while Docker Engine is installed from Docker's own repository. The post is still technically relevant because Docker provides official RHEL 9 installation instructions.
- `docker stack deploy` uses the legacy Compose file version 3 format, and the example's `version: '3.8'` is appropriate for Swarm stack deployment even though modern Docker Compose uses the Compose Specification.
