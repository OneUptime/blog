# Validation Summary: How to Configure tmpfs Mounts for Containers in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (Docker stack management)
- Docker Compose (YAML stack files)
- Docker Engine `--tmpfs` flag
- Linux tmpfs (in-memory filesystem)
- `dd` for write benchmarking
- ClamAV (example image)
- nginx (example image)
- `docker stats` / `docker exec`

## Sources Consulted
- [Docker tmpfs mounts docs](https://docs.docker.com/engine/storage/tmpfs/)
- [Docker Compose Spec — services.tmpfs](https://docs.docker.com/reference/compose-file/services/#tmpfs)
- [docker/cli issue #698 — tmpfs-size and tmpfs-mode in compose](https://github.com/docker/cli/issues/698)
- [docker/compose issue #5372 — tmpfs-size in docker-compose](https://github.com/docker/compose/issues/5372)
- [minio issue #13818 — O_DIRECT not supported on tmpfs](https://github.com/minio/minio/issues/13818)
- [open(2) man page — O_DIRECT requires filesystem support](https://man7.org/linux/man-pages/man2/open.2.html)
- `dd(1)` GNU coreutils documentation for `conv=fdatasync` and `oflag=direct`

## Issues Found
1. **`oflag=direct` against tmpfs would fail** — In the "Performance Benchmarks" section, the original `dd` command wrote to a tmpfs target (`--tmpfs /test:size=1g`) using `oflag=direct`. tmpfs does not implement O_DIRECT, so `open()` returns `EINVAL` and `dd` aborts with "Invalid argument". I changed both benchmark commands to use `conv=fdatasync` instead, which works on tmpfs (effectively a no-op) and forces a real flush on disk, keeping the comparison meaningful and apples-to-apples.

## Review Notes
- The Compose `tmpfs:` short-form inline option syntax (e.g. `/tmp:size=100m,mode=1777`) is supported by Docker Compose because it is forwarded to the Engine's `--tmpfs` flag, which accepts these mount options. The Compose spec's documented "long form" alternative (`type: tmpfs` under `volumes:` with a `tmpfs.size` key) is more formal but more verbose; the short form used in the post is widely supported and works correctly.
- `version: "3.8"` at the top of one stack snippet is harmless but obsolete — Compose v2 ignores the field. Not a technical error.
- The disk benchmark uses `-v /tmp/disk-test:/test`. On hosts where `/tmp` is itself a tmpfs (some systemd-default desktop distros), this would not actually exercise disk I/O. On typical Docker server hosts (Debian/Ubuntu defaults, RHEL/CentOS), `/tmp` is on the root filesystem and the example works as intended. Left unchanged because the typical Docker host case is correct.
- The claim "tmpfs is typically 3-10x faster than SSD for small file I/O" is reasonable; on NVMe with `conv=fdatasync` the gap may be smaller, on SATA SSD it is often larger.
- `mode=755` as an octal string (without leading zero) is accepted by tmpfs/Docker; the resulting permissions are `rwxr-xr-x` as intended.
- `read_only: true` combined with `tmpfs:` for writable scratch directories (the nginx and app examples) is the canonical Docker pattern and correct.
