# Validation Summary: How to Optimize Portainer Performance on ARM Devices - Part 3

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker Compose / Compose Specification
- Linux system tuning (`systemd`, `sysctl`, PAM limits, swap, zram)
- cAdvisor
- ARM single-board computers

## Sources Consulted
- Docker daemon configuration overview: https://docs.docker.com/engine/daemon/
- `dockerd` reference: https://docs.docker.com/reference/cli/dockerd/
- Docker JSON-file logging driver: https://docs.docker.com/engine/logging/drivers/json-file/
- Docker OverlayFS / `overlay2` storage driver: https://docs.docker.com/engine/storage/drivers/overlayfs-driver/
- Docker resource constraints: https://docs.docker.com/engine/containers/resource_constraints/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose `version` top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Portainer general settings: https://docs.portainer.io/admin/settings/general
- Portainer CE install with Docker on Linux: https://docs.portainer.io/sts/start/install-ce/server/docker/linux
- cAdvisor running guide: https://github.com/google/cadvisor/blob/master/docs/running.md
- GNU Bash reference manual, escape character / line continuation: https://www.gnu.org/s/bash/manual/html_node/Escape-Character.html
- `dphys-swapfile` man page: https://manpages.debian.org/testing/dphys-swapfile/dphys-swapfile.8.en.html
- `zramswap` man page: https://manpages.debian.org/testing/zram-tools/zramswap.1.en.html
- `limits.conf` man page: https://manpages.debian.org/jessie/libpam-modules/limits.conf.5.en.html

## Issues Found
- The post described `overlay2` as the "fastest" Linux storage driver. I changed this to "recommended" because Docker documents `overlay2` as the supported/recommended driver rather than making a blanket fastest-performance claim.
- The swap guidance was inaccurate. I changed the Raspberry Pi OS example to disable the disk-backed swap file explicitly and kept zram as the compressed-RAM alternative, which better matches the `dphys-swapfile` and `zramswap` documentation.
- The file-descriptor section called `/etc/security/limits.d` a system-wide limit change. I corrected the wording to reflect that PAM limits apply to login sessions, while the `sysctl` block handles the system-wide file descriptor cap.
- The SSD migration snippet overwrote `daemon.json` with only `data-root` and `storage-driver`, which would silently drop the earlier log rotation, ulimit, and live-restore settings. I updated the example so the migrated configuration preserves the earlier daemon options.
- The Portainer `docker run` example was broken shell syntax because inline comments followed line-continuation backslashes. I removed the inline comments and replaced them with a single leading comment. I also corrected the `--memory-swap=512m` explanation to reflect Docker's documented "total memory plus swap" behavior.
- The Portainer snapshot interval instructions were wrong. Portainer documents the setting under `Settings > General`, and the default is 5 minutes, not 5 seconds. I corrected the UI path and interval change accordingly.
- Both YAML examples used the obsolete top-level Compose `version` field. I removed it to match the current Compose Specification.
- The cAdvisor example used the older `gcr.io/cadvisor/cadvisor` image reference. I updated it to the current `ghcr.io/google/cadvisor` registry and aligned the host mounts/device list with the current cAdvisor container guidance.

## Review Notes
- Docker Engine 29.0 and later uses the containerd image store by default on fresh installs. The post's `overlay2` guidance is still valid for traditional Docker graphdriver setups, but this area may need another refresh as Docker's defaults continue to evolve.
- The examples still use moving image tags such as `portainer/portainer-ce:latest` and `ghcr.io/google/cadvisor:latest`. They are functional, but pinning explicit versions would make the post more reproducible.
- The scheduled `docker system prune -f` cleanup job is technically valid but operationally aggressive; readers should review it carefully before enabling it on hosts where cached images are important.
