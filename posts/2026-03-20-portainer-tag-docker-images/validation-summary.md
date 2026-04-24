# Validation Summary: How to Tag Docker Images in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine CLI
- Docker Hub
- GitHub Container Registry (GHCR)
- Private container registries
- Bash

## Sources Consulted
- Docker CLI reference: `docker image tag` https://docs.docker.com/reference/cli/docker/image/tag/
- Docker CLI reference: `docker image ls` https://docs.docker.com/reference/cli/docker/image/ls/
- Docker CLI filtering reference https://docs.docker.com/config/filter/
- Docker CLI reference: `docker image rm` https://docs.docker.com/reference/cli/docker/image/rm/
- Docker Hub documentation: pushing images https://docs.docker.com/docker-hub/repos/manage/hub-images/push/
- Docker Hub documentation: tags https://docs.docker.com/docker-hub/repos/manage/hub-images/tags/
- Portainer documentation: Images https://docs.portainer.io/user/docker/images
- Portainer documentation: Import an image https://docs.portainer.io/sts/user/docker/images/import
- Portainer documentation: Manage a registry https://docs.portainer.io/admin/registries/manage
- Portainer documentation: Docker roles and permissions https://docs.portainer.io/advanced/docker-roles-and-permissions

## Issues Found
- The post described the full Docker image reference as `registry/repository:tag`, which is incomplete. I updated it to Docker's documented `[HOST[:PORT]/]NAMESPACE/REPOSITORY[:TAG]` format and adjusted the examples accordingly.
- The multi-registry script used `registry.hub.docker.com/myorg` for Docker Hub. I changed this to `docker.io/myorg`, which matches Docker's documented registry naming behavior.
- The Git-based tagging example referenced `BUILD_NUMBER` without defining it. I added a default assignment so the example is self-contained and runnable as written.
- The Portainer UI steps relied on a specific `Tag` button/form label that is not consistently documented in the public user docs. I reworded the steps to describe the image details tagging action without tying the post to an unverified label.

## Review Notes
- Docker was not installed in the local review workspace on 2026-04-24, so command syntax was validated against official Docker documentation rather than local `docker --help` output.
- Portainer's documentation confirms image tag capabilities and registry tag management, but its public docs are lighter on exact local-image button labels across versions. The revised wording avoids version-specific UI assumptions.
