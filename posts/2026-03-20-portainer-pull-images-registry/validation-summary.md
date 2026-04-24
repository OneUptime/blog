# Validation Summary: How to Pull Docker Images from a Registry in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker CLI
- Docker Hub
- GitHub Container Registry (GHCR)
- AWS Elastic Container Registry (ECR)
- Private container registries

## Sources Consulted
- Portainer Docs: Add a new registry - https://docs.portainer.io/admin/registries/add
- Portainer Docs: Add a DockerHub account - https://docs.portainer.io/sts/admin/registries/add/dockerhub
- Portainer Docs: Add a custom registry - https://docs.portainer.io/admin/registries/add/custom
- Portainer Docs: Add an AWS ECR registry - https://docs.portainer.io/admin/registries/add/ecr
- Portainer Docs: Pull an image - https://docs.portainer.io/user/docker/images/pull
- Portainer Docs: Add a new container - https://docs.portainer.io/sts/user/docker/containers/add
- Portainer Docs: Add a GitHub registry - https://docs.portainer.io/sts/admin/registries/add/ghcr
- Docker Docs: docker login - https://docs.docker.com/reference/cli/docker/login/
- Docker Docs: docker image pull - https://docs.docker.com/reference/cli/docker/image/pull/
- Docker Docs: Personal access tokens - https://docs.docker.com/security/access-tokens/
- Docker Docs: Registry mirror / pull-through cache - https://docs.docker.com/docker-hub/image-library/mirror/
- Docker Docs: Docker Hub pull usage and limits - https://docs.docker.com/docker-hub/usage/storage/
- GitHub Docs: Working with the Container registry - https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry

## Issues Found
- The Portainer navigation path was inaccurate. The post said `Settings` / `Admin > Registries`, but current Portainer documentation uses `Registries`, with `Host > Registries` for environment-specific registry access. I corrected the navigation and registry type wording.
- The Docker Hub example used a password-based example and an outdated token-creation path. Portainer's current Docker Hub flow documents a Docker Hub access token, and Docker's current docs place token creation under `Account Settings > Personal access tokens`. I updated both.
- The GHCR example did not specify that GitHub Packages registry auth requires a personal access token (classic). I corrected the credential description to match GitHub's current documentation.
- The AWS ECR example omitted key fields Portainer requires, including the registry name and registry URL. I added the missing fields so the example matches Portainer's documented form.
- The image pull examples mixed Portainer's registry dropdown flow with fully qualified image references. In Portainer simple mode, you select the registry separately and then enter the image name; full registry entry is for Advanced mode. I corrected the examples and added the Advanced mode note.
- The container creation section implied Portainer always re-pulls the image. Current Portainer docs distinguish between pulling a missing image and forcing a refresh with `Always pull the image`. I clarified that behavior.
- The digest example used an invalid placeholder command. I replaced it with a valid digest-based `docker pull` example from Docker's official documentation.
- The registry mirror section contained invalid JSON comments, included an incorrect `registry-1.docker.io` mirror entry, and implied offline use for mirrors in general. I replaced it with valid `daemon.json` syntax and corrected the explanation.
- The Docker Hub rate-limit note was too broad. Docker documents different limits for anonymous, Personal, and paid authenticated users. I revised the wording to avoid overstating the effect.

## Review Notes
Portainer Business Edition includes a dedicated GitHub registry provider with different token scope requirements than using `ghcr.io` as a generic custom registry. The post now stays accurate for the custom-registry pull flow it documents. The `systemctl restart docker` example is Linux systemd-specific, which is now noted in the post.
