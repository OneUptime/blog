# Validation Summary: How to Hide Docker Hub from the Registry Dropdown in Portainer (2)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Hub
- Docker Engine
- Container registries
- Docker daemon configuration

## Sources Consulted
- Portainer docs, Registries: https://docs.portainer.io/sts/admin/registries
- Portainer docs, Add a DockerHub account: https://docs.portainer.io/sts/admin/registries/add/dockerhub
- Portainer docs, Docker Host Registries: https://docs.portainer.io/user/docker/host/registries
- Portainer docs, API documentation: https://docs.portainer.io/api/docs
- Portainer docs, API usage examples: https://docs.portainer.io/sts/api/examples
- Docker docs, Mirror the Docker Hub library: https://docs.docker.com/docker-hub/image-library/mirror/
- Docker docs, dockerd reference: https://docs.docker.com/reference/cli/dockerd/

## Issues Found
- The post described the UI path incorrectly. Portainer documents hiding Docker Hub from the `Registries` page on the built-in `Docker Hub (anonymous)` entry, not through `Settings` or by editing a normal registry entry. Updated the navigation and action to `Hide for all users`.
- The post implied Docker Hub could be fully removed from the dropdown in all cases. Portainer documents that hiding is UI-only and that `Docker Hub (anonymous)` still appears when a user has no other registries available. Added that limitation to the hide and test steps.
- The API example was not supported by the official docs and treated Docker Hub as a normal user-added registry that could be updated with `PUT /api/registries/{id}`. Replaced the unsupported command block with a note to consult the version-specific Portainer API docs before automating.
- The team access section was inaccurate for the built-in anonymous Docker Hub entry. Portainer documents `Manage access` for registries available to an environment, and that access is environment-specific. Rewrote the section to describe managing access to approved private registries instead.
- The Docker daemon example claimed `registry-mirrors` would block Docker Hub entirely. Docker documents `registry-mirrors` as a preferred mirror configuration, not a hard block. Updated the wording and config snippet to reflect that and kept network/proxy enforcement as the hard-block option.
- The sample policy text overstated the result as “Docker Hub is disabled in Portainer.” Updated it to say Docker Hub is hidden in the Portainer UI, which matches the documented behavior.

## Review Notes
- The Portainer behavior checked here matches the current official documentation as of 2026-04-24. Because Portainer publishes version-specific docs, future updates should be verified against the docs for the exact Portainer release in use.
- Docker `registry-mirrors` only affects Docker Hub pull behavior. It is useful alongside UI changes, but it should not be presented as a security control equivalent to network or proxy blocking.
