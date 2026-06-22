# Validation Summary: Demystifying Docker Base Images: Why Ubuntu in a Container Isn't Really Ubuntu

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker
- Linux containers
- Linux kernel namespaces and cgroups
- Docker images and layers
- Ubuntu, Debian, Alpine, Fedora, and Arch Linux base images
- Dockerfile `FROM`, `COPY`, `CMD`, and `ENTRYPOINT`
- Distroless images
- Linux system calls and syscall ABI
- OverlayFS and copy-on-write storage

## Sources Consulted
- Docker Docs: What is a container? https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-a-container/
- Docker Docs: What is Docker? https://docs.docker.com/get-started/docker-overview/
- Docker Docs: Docker Engine security https://docs.docker.com/engine/security/
- Docker Docs: Understanding image layers https://docs.docker.com/get-started/docker-concepts/building-images/understanding-image-layers/
- Docker Docs: Storage drivers https://docs.docker.com/engine/storage/drivers/
- Docker Docs: Dockerfile reference https://docs.docker.com/reference/dockerfile/
- Docker Docs: `docker container run` reference https://docs.docker.com/reference/cli/docker/container/run/
- Linux man-pages: namespaces(7) https://man7.org/linux/man-pages/man7/namespaces.7.html
- Linux man-pages: pid_namespaces(7) https://man7.org/linux/man-pages/man7/pid_namespaces.7.html
- Linux man-pages: syscalls(2) https://man7.org/linux/man-pages/man2/syscalls.2.html
- Linux kernel documentation: stable API notes https://www.kernel.org/doc/Documentation/process/stable-api-nonsense.rst
- Linux kernel documentation: ABI README https://www.kernel.org/doc/Documentation/ABI/README
- GoogleContainerTools distroless README https://github.com/GoogleContainerTools/distroless
- Local Docker CLI help for `docker run`, plus live checks of `ubuntu:22.04`, `alpine:3.19`, `fedora:39`, and `gcr.io/distroless/python3-debian12` images.

## Issues Found
- The `ubuntu:22.04` `/etc/os-release` example used `VERSION="22.04.3 LTS (Jammy Jellyfish)"`. The current `ubuntu:22.04` image reports `VERSION="22.04.5 LTS (Jammy Jellyfish)"`, so the example was updated.
- The syscall explanation said the call "passes through the container runtime's namespace isolation." That implied the runtime mediates syscalls after container startup. The text was changed to clarify that the runtime configures namespaces and the host kernel handles the syscall in that namespace context.

## Review Notes
The numeric memory, startup time, disk size, and density values are approximate and workload-dependent. They are acceptable as illustrative examples, but future revisions could label them more explicitly as estimates and refresh image sizes as tags move.
