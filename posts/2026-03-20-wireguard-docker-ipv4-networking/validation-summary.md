# Validation Summary: How to Use WireGuard with Docker Containers for IPv4 Networking

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- WireGuard VPN
- Docker / Docker Compose
- linuxserver/wireguard container image (lscr.io/linuxserver/wireguard)
- Linux network namespaces (via Docker `network_mode: service:*`)
- Linux capabilities (NET_ADMIN, SYS_MODULE)
- sysctls (net.ipv4.conf.all.src_valid_mark, net.ipv4.ip_forward)
- wg-quick, iproute2 (`ip route`)

## Sources Consulted
- linuxserver/docker-wireguard README: https://github.com/linuxserver/docker-wireguard
- linuxserver image documentation for environment variables (PUID, PGID, TZ, SERVERURL, SERVERPORT, PEERS, PEERDNS, INTERNAL_SUBNET)
- Docker Compose reference for `network_mode: "service:<name>"`, `cap_add`, `sysctls`
- WireGuard project documentation (wg-quick)

## Issues Found
1. **Incorrect client config mount path in Option 2.** The post mounted the client config to `/config/wg0.conf`, but the linuxserver/wireguard image expects client config files under `/config/wg_confs/<tunnel>.conf`. Updated the volume mount to `./wg0.conf:/config/wg_confs/wg0.conf:ro`.
2. **Wrong container name in the verification section.** The snippet ran `docker exec -it wireguard-client /bin/sh`, but the Option 2 compose file sets `container_name: wg-client`. `docker exec` targets container names (not compose service names), so this would fail. Updated to `docker exec -it wg-client /bin/sh`.

## Review Notes
- The Compose `version: "3.8"` field is still accepted but is considered obsolete by modern Docker Compose (v2). It is harmless and emits only a warning, so it was left unchanged.
- In Option 1, server mode is correctly triggered by setting `PEERS`. The `SYS_MODULE` capability plus the `/lib/modules:ro` bind mount is only required if the host kernel does not already have WireGuard built-in (kernels >= 5.6 typically do); this is acceptable as a safe default.
- Option 3 creates a `vpn-net` Docker network but then runs the example container with `--network=host`, which bypasses that network. The created network isn't consumed in the shown example — it is presumably there for other containers to optionally attach to. This is a minor stylistic/clarity point, not a technical error, so no change was made.
- `depends_on` without a `condition` only orders start-up, not readiness — worth keeping in mind but standard Compose behavior and not incorrect as written.
