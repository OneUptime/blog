# Validation Summary: How to Configure Seccomp Profiles for Containers in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker Compose
- Linux seccomp
- `strace`

## Sources Consulted
- Docker Docs: Seccomp security profiles for Docker — https://docs.docker.com/engine/security/seccomp/
- Docker Docs: Running containers — https://docs.docker.com/engine/containers/run/
- Docker Docs: Define services in Docker Compose — https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Version and name top-level elements — https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Deploy a stack to a swarm — https://docs.docker.com/engine/swarm/stack-deploy/
- Docker Docs: Docker Engine 23.0 release notes — https://docs.docker.com/engine/release-notes/23.0/
- Docker Docs: docker system info — https://docs.docker.com/reference/cli/docker/system/info/
- Portainer Docs: Containers — https://docs.portainer.io/user/docker/containers
- Portainer Docs: Advanced container settings — https://docs.portainer.io/user/docker/containers/advanced
- Portainer Docs: Stacks — https://docs.portainer.io/user/docker/stacks
- Portainer Docs: Add a new stack — https://docs.portainer.io/user/docker/stacks/add
- Portainer official release notes: Portainer 2.40.0 STS — https://github.com/portainer/portainer/releases/tag/2.40.0
- Portainer official source: container create form security option field — https://github.com/portainer/portainer
- `strace --help` output from the local environment

## Issues Found
- The post said Portainer generally supports custom seccomp profiles per container, but current official Portainer support for entering `security-opt` in the standalone container form is new in Portainer 2.40.0 STS. I added that version caveat and corrected the Portainer UI instructions.
- The default-profile explanation used an outdated syscall count. Docker Docs currently describe the default seccomp profile as disabling around 44 syscalls out of 300+, so I updated that wording.
- The `docker inspect` example and its expected output were misleading. `HostConfig.SecurityOpt` contains explicit security options such as a profile path or `unconfined`, not inline JSON. I replaced the command with a direct `docker inspect --format` example and corrected the output description.
- The Compose stack snippet used the obsolete top-level `version` key. Docker’s current Compose docs mark that field as obsolete, so I removed it.
- The `strace` example was brittle because it assumed `strace` would be invoked correctly through the image’s default entrypoint. I changed it to use `--entrypoint strace` and clarified that the image must contain `strace`.
- The “minimal” seccomp profile was presented too strongly as if it were generally reusable. I kept the example but clarified that it is an x86_64 starting point only and that modern runtimes often require additional syscalls.

## Review Notes
- Portainer’s public docs for Advanced container settings had not yet caught up with the new `security-opt` support at review time, so the version caveat and UI wording were cross-checked against the official Portainer 2.40.0 release notes and the current upstream Portainer source.
- The stack example is accurate for Docker Compose-backed Portainer stacks. Docker Swarm stack deployment still uses the legacy Compose v3 format and has different feature constraints, so future revisions could call that distinction out more explicitly if the post is expanded.
