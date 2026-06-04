# Validation Summary: How to Use Docker with User Namespace Remapping

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine
- Docker user namespace remapping
- Linux user namespaces
- Linux subordinate UID/GID ranges
- Docker Compose
- Docker volumes and bind mounts

## Sources Consulted
- Docker Docs: Isolate containers with a user namespace - https://docs.docker.com/engine/security/userns-remap/
- Docker Docs: docker container run reference - https://docs.docker.com/reference/cli/docker/container/run/
- Docker Docs: dockerd reference - https://docs.docker.com/reference/cli/dockerd/
- Docker Docs: Compose services reference - https://docs.docker.com/reference/compose-file/services/
- Linux man-pages: user_namespaces(7) - https://www.man7.org/linux/man-pages/man7/user_namespaces.7.html

## Issues Found
- The introduction and conclusion stated too absolutely that user namespace remapping fixes or eliminates the risk of a container escape granting host root. Updated the wording to say it reduces that risk and specifically protects escaped container processes by mapping container root to an unprivileged high-numbered host UID.
- The volume-permissions section suggested using a remapped container to run `chown -R 1000:1000 /data` on a host bind mount. A remapped root process usually cannot change ownership of root-owned host files, and UID 1000 inside the container maps to the subordinate host UID, not literal host UID 1000. Replaced the example with a host-side `chown` to the mapped UID/GID for an app running as container UID 1000.

## Review Notes
The Docker daemon `userns-remap` configuration, `default` dockremap behavior, subordinate ID mapping explanation, `/var/lib/docker/<uid>.<gid>/` storage behavior, `--userns=host`, and Compose `userns_mode: "host"` examples match current Docker documentation. The examples assume rootful Docker Engine on Linux, not Docker Desktop or rootless Docker.
