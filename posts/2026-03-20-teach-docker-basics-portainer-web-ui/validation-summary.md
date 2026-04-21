# Validation Summary: How to Teach Docker Basics Using Portainer's Web UI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Docker Engine
- Docker containers
- Docker images
- Docker volumes
- Docker bridge networks
- Docker Compose / Portainer Stacks
- Nginx and Redis container images

## Sources Consulted
- Portainer documentation: Pull an image - https://docs.portainer.io/sts/user/docker/images/pull
- Portainer documentation: Add a new container - https://docs.portainer.io/user/docker/containers/add
- Portainer documentation: Access a container's console - https://docs.portainer.io/sts/user/docker/containers/console
- Portainer documentation: Volumes - https://docs.portainer.io/user/docker/volumes
- Portainer documentation: Add a new network - https://docs.portainer.io/user/docker/networks/add
- Portainer documentation: Add a new stack - https://docs.portainer.io/sts/user/docker/stacks/add
- Docker documentation: docker container run - https://docs.docker.com/reference/cli/docker/container/run/
- Docker documentation: docker container exec - https://docs.docker.com/reference/cli/docker/container/exec/
- Docker documentation: docker container ls statuses - https://docs.docker.com/reference/cli/docker/container/ls/
- Docker documentation: Bridge network driver - https://docs.docker.com/engine/network/drivers/bridge/
- Docker documentation: Volumes - https://docs.docker.com/engine/storage/volumes/
- Docker documentation: Compose file version and name - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker documentation: Compose networks - https://docs.docker.com/reference/compose-file/networks/

## Issues Found
- The introduction overstated that Portainer can browse volume contents unconditionally and can trace network connections. Updated it to say volume browsing requires Docker Swarm or the Portainer Agent, and changed "trace network connections" to inspecting network attachments.
- The images table claimed the Portainer image list shows layers. Portainer's image list documents image IDs, usage states, tags, sizes, and creation dates, so the table now says "Image IDs, size, tags."
- The network table described "Bridge/overlay topologies," which was too broad for the Portainer Networks page. Updated it to "Bridge/overlay network types and container attachments."
- Lesson 2 called lifecycle controls "three container states" while listing actions. Updated it to describe lifecycle actions and clarified that stopped containers retain their writable layer until removed, while persistent data belongs in volumes.
- Lesson 3 used `ubuntu:22.04 env`, which exits immediately and does not support the later instruction to open a console in the running container. Replaced it with a detached `nginx:alpine` example, `docker exec env-demo env`, and a note to select `/bin/ash` for Alpine-based images in Portainer's Console.
- Lesson 4 referenced Portainer's file browser without noting the deployment requirement. Updated it to specify that Portainer's volume browser is available with Docker Swarm or the Portainer Agent.
- Lesson 5 deployed Alpine containers without a long-running command, so they would exit before students could use the Console. Added `sleep 3600`, noted the `/bin/ash` Console selection for Alpine, and clarified that cross-network testing should ping the other container's IP address.
- The Compose example used the obsolete top-level `version: "3.8"` field. Removed it and kept the snippet in current Compose Specification form.

## Review Notes
The corrected Compose snippet could not be validated with `docker compose config` because `docker` is not installed in this workspace. The YAML was reviewed against Docker's Compose Specification documentation instead.
