# Validation Summary: How to Set Up a Docker Learning Lab with Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Portainer HTTP API
- Docker Engine
- Docker Compose / Compose Specification
- Docker networking
- Bash
- Nginx
- WordPress
- MySQL

## Sources Consulted
- Portainer CE install on Docker Linux: https://docs.portainer.io/2.33-lts/start/install-ce/server/docker/linux
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Portainer CE API schema 2.39.1: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer environments and environment access: https://docs.portainer.io/admin/environments/environments
- Portainer access control: https://docs.portainer.io/sts/advanced-topics/access-control
- Portainer add a new stack: https://docs.portainer.io/user/docker/stacks/add
- Portainer relative path support: https://docs.portainer.io/sts/advanced-topics/relative-paths
- Docker Linux post-installation steps: https://docs.docker.com/engine/install/linux-postinstall/
- Docker overlay network driver: https://docs.docker.com/engine/network/drivers/overlay/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose `services` reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose `volumes` reference: https://docs.docker.com/reference/compose-file/volumes/
- Docker Compose version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
1. The Portainer install snippet used `portainer/portainer-ce:latest` and plain `docker` commands immediately after adding the user to the `docker` group. Official docs use supported channel tags, and Docker's post-install docs require a new login before group membership applies. I updated the snippet to `portainer/portainer-ce:lts`, used `sudo docker` for the immediate deployment commands, and added a re-login note.
2. The API examples assumed HTTPS on a bare host name and omitted certificate handling even though the install step uses Portainer's default self-signed certificate on `9443`. I added `:9443`, `curl -k`, and aligned the request bodies with the documented Portainer API payload fields.
3. The user-provisioning step created accounts but did not grant access to any Portainer environment. I added the missing instruction to assign each user or team access under **Environment-related > Environments > Manage access**.
4. The introduction and architecture overstated Portainer team access as full runtime isolation. I reworded those sections to describe Portainer access control accurately and to recommend separate Docker environments when stronger isolation is required.
5. The first Compose example used the obsolete top-level `version` key and a relative bind mount (`./html`) that only works for Git-deployed stacks when Portainer's relative path support is enabled in Business Edition. I removed the `version` key and the relative bind mount so the example remains valid for a Git-backed lab repository.
6. The exercise stacks published fixed host ports (`8080` and `8081`), which would collide as soon as multiple students deployed the same lab on one Docker host. I changed the examples to publish only container port `80`, allowing Docker to allocate an available host port.
7. Step 4 used an overlay network example as "resource limits per student". Overlay networks require Swarm mode and do not implement quotas. I replaced that section with Compose-based CPU, memory, and PID limits for Docker Standalone and a note to use `deploy.resources` on Swarm.
8. The cleanup script filtered on labels that were not applied consistently, so it would miss the second exercise's containers, volumes, and networks. I added consistent `lab.managed=true` labels to the sample resources and updated the cleanup filters accordingly.
9. The instructor dashboard hardcoded environment ID `1`, but the actual Portainer environment ID is installation-specific. I parameterized the value as `ENVIRONMENT_ID` and clarified that it must be replaced.

## Review Notes
- Docker is not installed in this workspace, so I could not run the snippets or validate them with `docker compose config`; the review was performed against current official Portainer and Docker documentation, plus local syntax inspection.
- The updated examples are now compatible with Git-backed Portainer stacks without requiring the BE-only relative path volumes feature.
- The post still uses floating image tags such as `wordpress:latest` for brevity. This is valid, but a classroom environment that values repeatability may want to pin exact image tags in a future revision.
- The guide now clearly targets Docker and Portainer labs. Portainer's namespace resource quota features apply to Kubernetes environments, not this Docker-based setup.
