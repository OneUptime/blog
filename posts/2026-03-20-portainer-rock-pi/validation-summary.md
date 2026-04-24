# Validation Summary: How to Run Portainer on a Rock Pi

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Radxa Rock Pi / ROCK single-board computers
- Rockchip RK3399 / RK3588 / RK3588S
- Docker Engine
- Docker Compose
- Portainer CE
- UFW
- Linux cgroups
- Rockchip RKNPU2 / RKNN

## Sources Consulted
- Docker Engine install on Ubuntu: https://docs.docker.com/engine/install/ubuntu/
- Docker Engine install on Debian: https://docs.docker.com/engine/install/debian/
- Docker Linux post-install steps: https://docs.docker.com/engine/install/linux-postinstall/
- Docker daemon configuration: https://docs.docker.com/engine/daemon/
- `dockerd` reference: https://docs.docker.com/reference/cli/dockerd/
- Docker packet filtering and firewalls: https://docs.docker.com/engine/network/packet-filtering-firewalls/
- Docker Compose top-level `version` element: https://docs.docker.com/reference/compose-file/version-and-name/
- Portainer CE install on Docker Standalone (Linux): https://docs.portainer.io/start/install-ce/server/docker/linux
- Radxa ROCK 4 series overview: https://docs.radxa.com/en/rock4
- Radxa ROCK 4 official images: https://docs.radxa.com/en/rock4/official-images
- Radxa ROCK 5B introduction: https://docs.radxa.com/en/rock5/rock5b/getting-started/introduction
- Radxa ROCK 5B download summary: https://docs.radxa.com/en/rock5/rock5b/download
- Radxa user management / default credentials: https://docs.radxa.com/en/rock4/rock4ab-se/radxa-os/user
- Radxa boot parameters: https://docs.radxa.com/en/rock5/rock5b/radxa-os/bootparam
- Radxa RKNN installation: https://docs.radxa.com/en/rock3/rock3a/app-development/rknn-install
- Radxa RKLLM installation (RK3588 / RK3582 stack): https://docs.radxa.com/en/rock5/rock5c/app-development/ai/rkllm-install
- Linux kernel cgroup v2 documentation: https://docs.kernel.org/next/admin-guide/cgroup-v2.html

## Issues Found
- The supported model list and intro mixed correct Rockchip ARM64 boards with an incorrect spec line for Rock Pi 4 and an x86_64 Rock Pi X entry that conflicted with the post's ARM64/Rockchip framing. I corrected the model list and intro to match Radxa's Rockchip-based boards and official specs.
- The OS install section incorrectly told readers to fetch an official Ubuntu image from Radxa and suggested `rock` as a default SSH user. Radxa's current official images for these boards are Debian-based, and Radxa OS documents `radxa` as the default username/password, so I corrected both points.
- The Docker install section hardcoded the Ubuntu repository even though the post claimed to support Debian too, and it used an older repository setup. I replaced it with a current Ubuntu-or-Debian flow based on Docker's official repository instructions and added the current `docker-buildx-plugin` package.
- The Docker group step used `newgrp docker` inline in a pasted command block, which can interrupt execution flow. I changed that to a note telling readers to log out and back in or run `newgrp docker` afterward.
- The cgroup troubleshooting step referenced board/image-specific boot file locations that do not match current Radxa OS guidance. I updated it to Radxa's documented `/etc/kernel/cmdline` plus `u-boot-update` flow and narrowed the claim to the memory controller issue that Docker still documents on some systems.
- The Docker daemon configuration included a `features.buildkit` setting that is not part of current documented daemon feature configuration, and the snippet assumed `/etc/docker` already existed. I removed the outdated BuildKit block and added directory creation before writing `daemon.json`.
- The Portainer install command exposed legacy port `9000` by default and used the floating `latest` tag. Current Portainer docs install CE on `9443` by default, treat `9000` as legacy, and use a lifecycle tag such as `sts`, so I updated the command accordingly.
- The firewall section implied that UFW rules would protect published Docker ports. Docker's official firewall docs state that published container ports bypass normal UFW rules, so I replaced that guidance with an accurate warning and kept only the host-level SSH allow rule.
- The Compose example used the obsolete top-level `version` field. I removed it to align with the current Compose specification.
- The NPU section used an unverified `/dev/rknpu0` container mapping example. I replaced it with Radxa-documented host-side verification and installation steps for the RKNPU2 stack.
- The conclusion claimed ARM64 "ensures compatibility with all major Docker images", which was too broad. I softened that to the accurate statement that many major images publish ARM64 variants.

## Review Notes
- The post now matches current official install guidance from Docker, Portainer, and Radxa as of 2026-04-24.
- Official Radxa images for the referenced ROCK 4 and ROCK 5 boards are Debian-based; Ubuntu usage is still possible in practice, but image availability depends on the board and image provider.
- The Portainer guide intentionally omits port `8000` because Portainer documents it as optional and only needed for Edge Agent tunneling.
- The PostgreSQL tuning example was retained, but the note now clarifies it is aimed at an 8GB+ RK3588 board rather than all RK3588 variants.
