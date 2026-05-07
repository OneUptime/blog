# Validation Summary: How to Run WireGuard in a Podman Container

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- WireGuard
- WireGuard tools (`wg`, `wg-quick`)
- Podman
- linuxserver.io WireGuard container image
- Linux networking, kernel modules, sysctls, and iptables
- systemd and Podman Quadlet

## Sources Consulted
- WireGuard quick start: https://www.wireguard.com/quickstart/
- WireGuard `wg(8)` man page: https://git.zx2c4.com/wireguard-tools/about/src/man/wg.8
- WireGuard `wg-quick(8)` man page: https://git.zx2c4.com/wireguard-tools/about/src/man/wg-quick.8
- linuxserver.io WireGuard image documentation: https://docs.linuxserver.io/images/docker-wireguard/
- Podman `podman run` documentation: https://docs.podman.io/en/v4.4/markdown/podman-run.1.html
- Podman `podman generate systemd` documentation: https://docs.podman.io/en/v5.2.5/markdown/podman-generate-systemd.1.html
- Podman Quadlet documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html

## Issues Found
- The server config was written to `~/wireguard-config/wg0.conf`, but current linuxserver.io WireGuard images start live tunnel config files from `/config/wg_confs/`. Changed the host path to `~/wireguard-config/wg_confs/wg0.conf`.
- The prerequisites stated that WireGuard requires both `NET_ADMIN` and `SYS_MODULE`. `NET_ADMIN` is required for interface management, while `SYS_MODULE` is only needed when loading kernel modules from the container. Updated the wording.
- The key-generation commands created private-key files without first setting a restrictive umask. Added `umask 077` before generating keys to match WireGuard's documented practice and the post's security guidance.
- The container image reference used `docker.io/linuxserver/wireguard:latest`. Updated it to the current linuxserver.io documented image name, `lscr.io/linuxserver/wireguard:latest`.
- The systemd unit move command did not preserve/fix SELinux context. Changed it to `sudo mv -Z ...`, matching Podman documentation guidance for generated unit files on SELinux-enabled systems.
- The kernel-version wording said WireGuard is "built in" on most modern kernels. Updated it to say WireGuard is included in the mainline kernel from Linux 5.6, which is more precise.

## Review Notes
The tutorial remains a manual-configuration approach rather than using linuxserver.io's server-mode environment variables (`PEERS`, `SERVERURL`, and related settings). That is valid for advanced/manual configuration as long as the config file is placed under `/config/wg_confs/`. The NAT rules assume the container's outbound interface is `eth0`, which is typical for a default Podman bridge network but may need adjustment for custom network setups.
