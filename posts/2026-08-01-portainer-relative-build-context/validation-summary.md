# Validation Summary: Portainer Cannot Find a Relative Build Context: How Git Stack Paths Really Work

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- Portainer Git repository stacks
- Docker Compose
- Docker Build and Buildx
- Dockerfiles and build contexts
- Git and Git submodules
- Docker Swarm

## Sources Consulted

- [Portainer: Add a Git repository stack](https://docs.portainer.io/user/docker/stacks/add#option-3-git-repository)
- [Portainer: Can I build an image while deploying a stack/application from Git?](https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/can-i-build-an-image-while-deploying-a-stack-application-from-git)
- [Portainer known issue: Docker Compose files including build steps fail](https://docs.portainer.io/faqs/known-issues/docker-compose-files-including-build-steps-fail)
- [Portainer: How Relative Path Support works](https://docs.portainer.io/advanced/relative-paths)
- [Docker Compose Build Specification](https://docs.docker.com/reference/compose-file/build/)
- [Docker: Merge Compose files](https://docs.docker.com/compose/how-tos/multiple-compose-files/merge/)
- [Docker: Build context](https://docs.docker.com/build/concepts/context/)
- [Dockerfile reference](https://docs.docker.com/reference/dockerfile/)
- [Docker Buildx build CLI reference](https://docs.docker.com/reference/cli/docker/buildx/build/)
- [Docker Compose build CLI reference](https://docs.docker.com/reference/cli/docker/compose/build/)
- [Docker Compose config CLI reference](https://docs.docker.com/reference/cli/docker/compose/config/)
- [Docker: Deploy a stack to a Swarm](https://docs.docker.com/engine/swarm/stack-deploy/)

## Issues Found

- The explanation of `COPY ../../shared/package.json` said that the path escapes the build-context boundary. Docker does not permit that traversal: it strips parent-directory navigation from plain local `COPY` sources and resolves the remaining path within the default context. Updated the explanation to describe the actual normalization behavior, qualify the claim to plain `COPY` sources, and explain why the example still fails for the shown repository.
- The post described a Git-derived image tag as immutable. Registry tags are mutable unless the registry enforces immutability. Updated the recommendation to use a unique, non-reused tag or pin a digest.

## Review Notes

- The Portainer limitation is version-specific: the current official known-issue page states that remote Docker environments running Portainer 2.29.2 and later cannot execute Compose build steps and recommends external builds.
- The multi-platform `docker buildx build` command is valid, but the selected Buildx builder must support both target platforms, directly or through emulation.
- `docker stack deploy` still ignores the Compose `build` option and uses the legacy Compose v3 stack format; prebuilding and distributing the image remains required for Swarm deployment.
