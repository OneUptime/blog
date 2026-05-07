# Validation Summary: How to Run a Podman Container with Read-Only Root Filesystem

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Linux containers
- Read-only root filesystems
- tmpfs mounts
- Bind mounts and SELinux volume labels
- Podman Compose / Compose Specification
- nginx Alpine container image
- Python container image

## Sources Consulted
- Podman `podman run` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `podman container inspect` documentation: https://docs.podman.io/en/stable/markdown/podman-container-inspect.1.html
- Podman `podman ps` documentation: https://docs.podman.io/en/v5.7.1/markdown/podman-ps.1.html
- Podman `podman compose` documentation: https://docs.podman.io/en/v5.6.2/markdown/podman-compose.1.html
- Compose Specification service reference: https://compose-spec.github.io/compose-spec/05-services.html
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- containers/podman-compose project documentation: https://github.com/containers/podman-compose

## Issues Found
- The post originally stated that a read-only root filesystem prevents any process inside the container from writing to the filesystem. Podman's `--read-only` makes the root filesystem read-only, but writable tmpfs paths such as `/run`, `/tmp`, and `/var/tmp` are mounted by default unless `--read-only-tmpfs=false` is used, and writable volumes can still be mounted. Updated the wording to specify the image-backed root filesystem.
- The post described writable root filesystems as allowing any process to modify system files or install packages. That depends on Linux permissions and the user inside the container. Updated the wording to "processes with sufficient privileges."
- The benefits section claimed malware is prevented from writing to disk and configuration drift cannot occur. That was too broad because writable tmpfs mounts and volumes may still exist. Updated the wording to focus on the image-backed filesystem and reducing runtime drift.
- The summary claimed the setup prevents unauthorized filesystem modifications. Updated it to "unauthorized root filesystem modifications" for technical precision.

## Review Notes
The commands and configuration snippets use valid Podman and Compose options. Podman was not installed in the local environment, so command behavior was verified against official documentation rather than by executing the examples locally.
