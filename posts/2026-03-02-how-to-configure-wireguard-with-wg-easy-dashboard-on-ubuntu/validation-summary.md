# Validation Summary: How to Configure WireGuard with wg-easy Dashboard on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- WireGuard
- wg-easy
- Docker Engine
- Docker Compose
- UFW
- Nginx reverse proxying
- Linux sysctl and iptables networking

## Sources Consulted
- wg-easy Getting Started: https://wg-easy.github.io/wg-easy/latest/getting-started/
- wg-easy Basic Installation: https://wg-easy.github.io/wg-easy/latest/examples/tutorials/basic-installation/
- wg-easy Docker Run example: https://wg-easy.github.io/wg-easy/latest/examples/tutorials/docker-run/
- wg-easy No Reverse Proxy guidance: https://wg-easy.github.io/wg-easy/latest/examples/tutorials/reverse-proxyless/
- wg-easy Unattended Setup configuration: https://wg-easy.github.io/wg-easy/latest/advanced/config/unattended-setup/
- wg-easy v14 to v15 migration notes: https://wg-easy.github.io/wg-easy/latest/advanced/migrate/from-14-to-15/
- wg-easy Setup guide: https://wg-easy.github.io/wg-easy/latest/guides/setup/
- wg-easy Edit Client guide: https://wg-easy.github.io/wg-easy/latest/guides/clients/
- Docker Compose file reference for obsolete `version` key: https://docs.docker.com/reference/compose-file/version-and-name/
- WireGuard installation documentation: https://www.wireguard.com/install/
- Ubuntu Server WireGuard documentation: https://ubuntu.com/server/docs/how-to/wireguard-vpn/

## Issues Found
- The Docker Compose snippet used the untagged `ghcr.io/wg-easy/wg-easy` image. wg-easy documentation states that untagged `latest` points to v14 and should be avoided, so the snippet now pins `ghcr.io/wg-easy/wg-easy:15`.
- The Compose snippet used v14-style wg-easy environment variables such as `WG_HOST`, `WG_PORT`, `WG_DEFAULT_DNS`, and `WG_DEFAULT_ADDRESS`. wg-easy v15 moved most of these settings into the setup flow/Admin Panel, so the snippet now uses documented first-run `INIT_*` variables.
- The web UI is accessed directly over HTTP in the tutorial. wg-easy v15 requires `INSECURE=true` for this mode, so the Compose snippet now includes it with a production warning.
- The Compose file included the obsolete top-level `version: '3.8'` field. It was removed to align with the current Compose Specification.
- The v15 reference deployment includes `/lib/modules`, IPv6 forwarding sysctls, and an IPv6-capable bridge network. The snippet was updated to include those settings.
- The domain-name section referred to changing `WG_HOST`, which is no longer the current v15 approach. It now points readers to the Admin Panel or first-run `INIT_HOST`.
- The split-tunnel section described the full-tunnel default as `0.0.0.0/0` only. Current wg-easy defaults include IPv6 as well, so it now says `0.0.0.0/0, ::/0`.

## Review Notes
The corrected Docker Compose example was validated with `docker compose -f - config`. The post still targets Ubuntu 20.04 and 22.04, which are older but technically valid for the commands shown; a future content refresh could include Ubuntu 24.04/26.04 and a stronger recommendation to put the dashboard behind HTTPS instead of exposing HTTP directly.
