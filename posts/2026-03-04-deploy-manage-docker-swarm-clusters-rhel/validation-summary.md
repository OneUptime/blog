# Validation Summary: How to Deploy and Manage Docker Swarm Clusters on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Docker Engine
- Docker Swarm mode
- Docker services
- Docker Stack deploy
- Compose file deploy configuration
- firewalld
- Nginx container image
- Redis container image

## Sources Consulted
- Docker Docs: Install Docker Engine on RHEL - https://docs.docker.com/engine/install/rhel/
- Docker Docs: Getting started with Swarm mode - https://docs.docker.com/engine/swarm/swarm-tutorial/
- Docker Docs: docker swarm init CLI reference - https://docs.docker.com/reference/cli/docker/swarm/init/
- Docker Docs: docker node ls CLI reference - https://docs.docker.com/reference/cli/docker/node/ls/
- Docker Docs: docker service create CLI reference - https://docs.docker.com/reference/cli/docker/service/create/
- Docker Docs: docker service update CLI reference - https://docs.docker.com/reference/cli/docker/service/update/
- Docker Docs: docker stack deploy CLI reference - https://docs.docker.com/reference/cli/docker/stack/deploy/
- Docker Docs: Compose Deploy Specification - https://docs.docker.com/reference/compose-file/deploy/
- Docker Docs: Compose version top-level element - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Hub: nginx Official Image tags - https://hub.docker.com/_/nginx
- Local Docker CLI help for `docker swarm init`, `docker service create`, `docker service update`, and `docker stack deploy`

## Issues Found
- The Docker installation example omitted `dnf-plugins-core`, which provides `dnf config-manager` on RHEL. Added `sudo dnf install -y dnf-plugins-core` before adding the Docker CE repository.
- The old package removal command did not include the current set of conflicting packages listed by Docker for RHEL. Expanded the removal list to include `docker-client-latest`, `docker-latest-logrotate`, `docker-logrotate`, `docker-engine`, `podman`, and `runc`.
- The Docker package installation command omitted `docker-buildx-plugin` and `docker-compose-plugin`, which are included in Docker's current RHEL install command. Added both packages.
- The rolling update example used `nginx:1.25`, which is outdated relative to the current official Nginx image tags. Updated the example to `nginx:1.29`.
- The firewall section stated that all listed ports were required on all Swarm nodes. Updated the wording to clarify that `2377/tcp` is needed on manager nodes, while the overlay network ports must be available between nodes.

## Review Notes
The top-level `version` key in the Compose file is obsolete for the modern Compose Specification, but `docker stack deploy` still documents support for Compose file version 3.0 and above. The example remains valid for the Swarm stack deploy context.
