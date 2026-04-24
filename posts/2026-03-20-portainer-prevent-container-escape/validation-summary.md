# Validation Summary: How to Prevent Container Escape Attacks with Portainer Settings

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker Compose / Compose file syntax
- Linux container capabilities
- Docker Bench for Security

## Sources Consulted
- Docker Docs: Running containers (`--privileged`, capabilities): https://docs.docker.com/engine/containers/run/
- Docker Docs: Compose services reference (`environment`, `cap_add`, `cap_drop`, `security_opt`, `read_only`, `tmpfs`): https://docs.docker.com/reference/compose-file/services/
- Docker Docs: `docker inspect` CLI reference (`--format`): https://docs.docker.com/reference/cli/docker/inspect/
- Docker Docs: `docker container run` reference (`--security-opt`, `--userns`): https://docs.docker.com/reference/cli/docker/container/run
- Docker Docs: Isolate containers with a user namespace: https://docs.docker.com/engine/security/userns-remap/
- Portainer Docs: Advanced container settings (Privileged mode, capabilities, read-only mounts): https://docs.portainer.io/user/docker/containers/advanced
- Docker Bench for Security upstream README: https://github.com/docker/docker-bench-security
- Tecnativa Docker Socket Proxy upstream README: https://github.com/Tecnativa/docker-socket-proxy
- Tecnativa GitHub Container Registry package page: https://github.com/Tecnativa/docker-socket-proxy/pkgs/container/docker-socket-proxy
- Linux capabilities reference: https://man7.org/linux/man-pages/man7/capabilities.7.html

## Issues Found
- The article said Portainer alone could configure all of the described protections. I changed that to "Portainer and Docker" because `userns-remap` is a Docker daemon setting, not a Portainer UI setting.
- The "Do Not Mount the Docker Socket" Compose example was invalid YAML because it placed `docker-socket-proxy:2375` under `volumes`. I replaced it with a valid `DOCKER_HOST: tcp://socket-proxy:2375` example and kept the warning against mounting `/var/run/docker.sock`.
- The Docker Socket Proxy snippet was not a valid standalone Compose example because it omitted the `services:` root key. I corrected the YAML and updated the image reference to the current upstream-recommended GHCR image path.
- The comment describing `CONTAINERS: 1` as "read-only container listing" was too narrow. Upstream documents that `POST=0` is what makes enabled API sections read-only, so I adjusted the comment to "Allow container-related GET endpoints."
- The post attributed kernel module loading to `CAP_SYS_ADMIN`. I corrected the diagram and capability table to match Linux capabilities documentation: kernel module loading is `CAP_SYS_MODULE`, while `CAP_SYS_ADMIN` covers mount and broad admin/namespace operations.
- The `docker/docker-bench-security` image reference was outdated. Upstream currently says that image is out-of-date and recommends building `docker-bench-security` locally first, so I updated the command sequence accordingly.

## Review Notes
- `userns-remap` is valid hardening guidance, but Docker documents compatibility limitations with some features, including `--privileged`, host PID/NET namespace sharing, and some storage-driver scenarios.
- Tecnativa documents the socket proxy as a way to reduce API exposure, but the proxy container still has access to the host socket. It should remain on an internal Docker network and only expose the minimum API sections needed.
