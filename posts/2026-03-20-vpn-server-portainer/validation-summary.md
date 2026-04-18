# Validation Summary: How to Self-Host a VPN Server with Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- WireGuard (VPN protocol, Linux kernel module)
- Docker / Docker Compose
- Portainer
- wg-easy (`ghcr.io/wg-easy/wg-easy`)
- linuxserver/wireguard (`lscr.io/linuxserver/wireguard`)
- iptables / MASQUERADE
- UFW firewall
- qrencode
- Linux sysctl (IP forwarding)

## Sources Consulted
- wg-easy GitHub repo and README — https://github.com/wg-easy/wg-easy
- LinuxServer.io WireGuard image docs — https://docs.linuxserver.io/images/docker-wireguard/
- WireGuard project documentation — https://www.wireguard.com/
- WireGuard Linux kernel merge history (merged 28 Jan 2020, shipped in Linux 5.6 on 29 March 2020)
- Docker Compose reference (cap_add, sysctls, volumes, ports)

## Issues Found
1. **Invalid `WG_MAX_AGE` environment variable** — The original compose file included `WG_MAX_AGE=0` with the comment "Maximum number of clients". No such variable exists in wg-easy, and the comment was also inaccurate. **Fix:** removed the line entirely.
2. **Inconsistent password hash variable name** — The YAML used `PASSWORD_HASH` (correct for wg-easy v14), but the accompanying `wgpw` bash snippet commented "use in WG_PASSWORD_HASH" (incorrect name). **Fix:** corrected the comment to reference `PASSWORD_HASH` and added a note about doubling `$` in docker-compose.
3. **Image tag pinned to avoid v14 → v15 breakage** — `ghcr.io/wg-easy/wg-easy:latest` now resolves to v15+, which uses `INIT_*` variables instead of `PASSWORD_HASH` / `WG_DEFAULT_ADDRESS` / `WG_DEFAULT_DNS` / `WG_PORT` / `PORT` / `WG_PRE_UP` / `WG_POST_DOWN`. The compose file as written only works against v14. **Fix:** pinned both the service image and the `wgpw` helper command to `ghcr.io/wg-easy/wg-easy:14`.
4. **`cat` on a PNG file does not display a QR code** — The original Step 5 said `cat /opt/wireguard/config/peer_phone/peer_phone.png`, which would dump binary garbage to the terminal. **Fix:** replaced with the linuxserver-provided `docker exec -it wireguard /app/show-peer phone` (renders QR as ASCII), plus `xdg-open` for the PNG and the existing `qrencode` alternative.

## Review Notes
- Kernel 5.6+ claim for WireGuard support is correct (WireGuard was merged into mainline Linux and shipped in 5.6 on 29 March 2020).
- `PERSISTENTKEEPALIVE_PEERS=all` is a valid value for the linuxserver/wireguard image per its official docs.
- `INTERNAL_SUBNET=10.13.13.0` is the documented default for linuxserver/wireguard.
- `version: "3.8"` at the top of the compose files is obsolete in Compose v2 but still accepted — not an error, could be removed in a future revision.
- The post is titled "with Portainer" but the compose files can be deployed via any Docker host; Portainer use is implicit (stacks UI). This is a content choice rather than a technical error.
- For readers on wg-easy v15+, the configuration will need migration to `INIT_USERNAME` / `INIT_PASSWORD` / `INIT_HOST` / `INIT_PORT` / `INIT_DNS` / `INIT_IPV4_CIDR` / `INIT_ALLOWED_IPS`. A future refresh of this post could add that note.
- Running `watch -n 1 wg show` through `docker exec` without `-it` will not render cleanly; left as-is because the underlying `wg show` command is correct.
