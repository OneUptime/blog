# Validation Summary: Why “Re-Pull Image and Redeploy” Fails in Portainer—and What to Check

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker CLI
- Docker Compose
- Docker Swarm
- OCI/Docker container images and registries
- Bind mounts and volumes

## Sources Consulted
- Portainer: Edit or duplicate a container: https://docs.portainer.io/user/docker/containers/edit
- Portainer: Stacks: https://docs.portainer.io/user/docker/stacks
- Portainer: Add a new stack: https://docs.portainer.io/user/docker/stacks/add
- Portainer: Inspect or edit a stack: https://docs.portainer.io/user/docker/stacks/edit
- Portainer: Add a new service: https://docs.portainer.io/user/docker/services/add
- Portainer: Access control and external resources: https://docs.portainer.io/advanced/access-control
- Docker: Pull an image: https://docs.docker.com/reference/cli/docker/image/pull/
- Docker: Inspect Docker objects and format command output: https://docs.docker.com/reference/cli/docker/inspect/ and https://docs.docker.com/engine/cli/formatting/
- Docker: List and filter containers: https://docs.docker.com/reference/cli/docker/container/ls/
- Docker Compose: Render the resolved configuration: https://docs.docker.com/reference/cli/docker/compose/config/
- Docker Compose: Service image and `pull_policy`: https://docs.docker.com/reference/compose-file/services/
- Docker Compose Build Specification: behavior when both `build` and `image` are set: https://docs.docker.com/reference/compose-file/build/
- Docker Swarm: Deploy services and resolve image tags to digests: https://docs.docker.com/engine/swarm/services/
- Docker Swarm: Inspect service tasks: https://docs.docker.com/reference/cli/docker/service/ps/
- Docker: Registry login and certificate trust: https://docs.docker.com/reference/cli/docker/login/ and https://docs.docker.com/engine/security/certificates/
- Docker: Bind mounts and volumes over existing container data: https://docs.docker.com/engine/storage/bind-mounts/ and https://docs.docker.com/engine/storage/volumes/
- CNCF Distribution: Registry HTTP API V2 error codes: https://distribution.github.io/distribution/spec/api/

## Issues Found
- The image-pull sequence implied that Docker always obtains image layers from the registry. Updated it to say Docker obtains any layers that are not already cached, matching Docker's content-addressable layer reuse behavior.
- The digest-pinned Compose example used `sha256:0123456789abcdef...`, which is not a syntactically valid digest reference. Replaced it with a 64-hex-character SHA-256 example so the image reference has valid syntax.
- The Swarm inspection commands did not state that `docker service inspect` and `docker service ps` are cluster-management commands that must run on a manager node. Added that requirement to the command introduction.
- The Portainer stack-list status was described generically as a grey indicator. Changed this to the documented grey hyphen so the description matches the current Portainer UI and its documented meaning.

## Review Notes
- All shell commands, flags, Compose fields, interpolation syntax, and Docker Go templates were checked against current official documentation. The non-networking inspection and formatting commands were also exercised successfully with Docker Engine client 29.4.3 and Docker Compose 5.1.4.
- The post correctly distinguishes an image manifest digest from the local image ID checks used to prove which locally resolved image a container uses.
- Portainer control labels can vary by resource and release, as the introduction already notes. The current Portainer documentation identifies the stack option as `Re-pull image` and documents `Pull latest image` as its previous label.
