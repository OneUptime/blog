# Validation Summary: How to Use Kata Containers with Docker for Enhanced Isolation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine
- Docker Compose
- Kata Containers
- containerd shim v2 runtimes
- QEMU
- Cloud Hypervisor
- Firecracker
- Linux KVM virtualization
- virtio-fs

## Sources Consulted
- Kata Containers official repository and README: https://github.com/kata-containers/kata-containers
- Kata Containers runtime documentation: https://github.com/kata-containers/kata-containers/blob/main/src/runtime/README.md
- Kata Containers installation documentation: https://github.com/kata-containers/kata-containers/tree/main/docs/install
- Kata Containers architecture documentation: https://github.com/kata-containers/kata-containers/blob/main/docs/design/architecture/README.md
- Kata Containers limitations documentation: https://github.com/kata-containers/kata-containers/blob/main/docs/Limitations.md
- Kata Containers Firecracker how-to: https://github.com/kata-containers/kata-containers/blob/main/docs/how-to/how-to-use-kata-containers-with-firecracker.md
- Kata Containers releases: https://github.com/kata-containers/kata-containers/releases
- Docker daemon runtime documentation: https://docs.docker.com/reference/cli/dockerd/
- Docker alternative runtimes documentation: https://docs.docker.com/engine/daemon/alternative-runtimes/
- Docker Compose specification: https://docs.docker.com/reference/compose-file/
- Fedora kata-containers package page: https://packages.fedoraproject.org/pkgs/kata-containers/kata-containers

## Issues Found
- The Docker runtime registration used the older `kata-runtime` drop-in style. Updated the daemon configuration to use the current Kata containerd shim v2 runtime, `io.containerd.kata.v2`, and added wrapper shims for Cloud Hypervisor and Firecracker configuration files.
- The Ubuntu/Debian package repository URL and key instructions were not valid against the current upstream installation path. Replaced them with the current official GitHub static release artifact workflow for Kata Containers 3.31.0 on amd64.
- The Fedora/RHEL install heading overpromised generic RHEL support. Narrowed it to Fedora, where the `kata-containers` package is published.
- The post described fixed boot-time and memory overhead numbers as general facts. Reworded those claims to avoid inaccurate version- and environment-specific values.
- The tuning comments mixed up memory preallocation, DAX, I/O threads, and virtio-fs behavior. Corrected the comments while preserving the configuration keys.
- The virtio-fs daemon path was adjusted for the static Kata release layout under `/opt/kata`.
- The monitoring section used invalid or outdated `kata-runtime metrics` and `kata-runtime state` examples. Replaced them with current troubleshooting commands: `kata-runtime env`, `kata-collect-data.sh`, and `journalctl -t kata`.
- The limitations section said there is no privileged mode. Updated it to reflect Kata's documented behavior: privileged containers have different semantics from runc and do not pass host devices through by default.

## Review Notes
- Docker support for Kata relies on Docker versions that can select containerd shim runtimes. The post now follows the current Docker `runtimeType` model.
- The static release example is pinned to Kata Containers 3.31.0, which was the latest release checked during validation on 2026-06-04.
