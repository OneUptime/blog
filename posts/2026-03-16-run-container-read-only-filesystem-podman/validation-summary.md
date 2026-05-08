# Validation Summary: How to Run a Container with Read-Only Filesystem in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Linux containers
- Read-only container root filesystems
- tmpfs mounts
- Podman named volumes
- Nginx container image
- PostgreSQL container image
- Container security hardening

## Sources Consulted
- Podman `podman run` official documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman `podman diff` official documentation: https://docs.podman.io/en/latest/markdown/podman-diff.1.html
- Podman `podman inspect` official documentation: https://docs.podman.io/en/v4.9.3/markdown/podman-inspect.1.html
- Podman Quadlet/container unit documentation for `ReadOnlyTmpfs` behavior: https://docs.podman.io/en/latest/markdown/podman-container.unit.5.html

## Issues Found
- The post originally stated that a read-only root filesystem prevents processes from modifying "the filesystem" generally. Podman read-only mode protects the root filesystem, while writable tmpfs mounts and volumes can still be present. Updated the wording to refer specifically to the image-backed root filesystem and to mention writable tmpfs and volume mounts.
- The basic read-only example explanation originally implied that every write operation would fail. With Podman's default `--read-only-tmpfs=true`, common paths such as `/tmp`, `/run`, and `/var/tmp` can be writable. Updated the explanation to clarify that writes to the image-backed root filesystem, such as `/test-file`, fail.
- Replaced `alpine sleep infinity` with `alpine sleep 3600` in the verification example to avoid depending on `sleep infinity` support in the image's `sleep` implementation.

## Review Notes
The current environment does not have Podman installed, so commands could not be executed locally. Validation was performed against official Podman documentation. The examples use valid Podman flags and documented behavior, including `--read-only`, `--read-only-tmpfs`, `--tmpfs`, volume mounts, `podman diff`, `podman inspect --format`, capability flags, and `--security-opt no-new-privileges`.
