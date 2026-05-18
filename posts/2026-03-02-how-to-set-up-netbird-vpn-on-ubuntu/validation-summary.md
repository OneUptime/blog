# Validation Summary: How to Set Up NetBird VPN on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NetBird (self-hosted overlay VPN)
- WireGuard
- Docker / Docker Compose
- Coturn (TURN/STUN relay)
- Zitadel / OIDC (identity provider for self-hosted setup)
- UFW (firewall)
- systemd
- Ubuntu 20.04 / 22.04

## Sources Consulted
- NetBird official docs: https://docs.netbird.io/
- NetBird self-hosted quickstart: https://docs.netbird.io/selfhosted/selfhosted-quickstart
- NetBird "How NetBird works" architecture page: https://docs.netbird.io/about-netbird/how-netbird-works
- netbirdio/netbird GitHub repo, `infrastructure_files/` directory
- NetBird CLI source (`root.go` / status / up command flags)
- NetBird install script endpoint: https://pkgs.netbird.io/install.sh
- NetBird API reference for policies

## Issues Found

1. **"NetBird has three components" was incorrect** — the post then listed four bullet points. Per the official architecture docs there are four components (Management, Signal, Relay/TURN, Client). Changed "three" to "four".

2. **Broken setup workflow** — the post instructed the reader to:
   - `curl` `setup.env.example` from `github.com/netbirdio/netbird/releases/latest/download/` (this is not published as a release asset; the file lives in the repo under `infrastructure_files/`)
   - `curl` `docker-compose.yml` and `management.json` directly from `infrastructure_files/` — but only `.tmpl` template versions exist in that directory. Downloading them as `.yml`/`.json` would 404, and even if rendered they need variable substitution that the post never performs.
   Rewrote that section to use the official `getting-started-with-zitadel.sh` script (which is the documented self-hosting path and handles template rendering, Zitadel bootstrap, and `docker compose up`).

3. **`netbird logout` does not exist** as a CLI command. The available auth-related commands are `login`, `up`, and `down`. Removed the `sudo netbird logout` example from the "Disconnecting and Removing a Peer" section and clarified that permanent removal happens in the dashboard.

## Review Notes

- The Auth0 OIDC discovery URL example (`https://netbird.eu.auth0.com/.well-known/openid-configuration`) was dropped along with the broken manual-setup flow. The modern self-hosted setup ships Zitadel as the bundled IdP, which is what the `getting-started-with-zitadel.sh` script provisions; this is more accurate than pointing readers at NetBird Cloud's Auth0 tenant.
- `--admin-url` for `netbird up` is still a valid persistent flag and is not formally deprecated, so the example was kept as-is even though many modern self-hosted setups derive the dashboard URL automatically.
- The WireGuard interface name (`wt0`), CGNAT range (`100.64.0.0/10`), install script URL (`https://pkgs.netbird.io/install.sh`), TURN port set (3478/5349, 49152–65535 relay range with the post using 10000–20000), and policy API shape (`Authorization: Token …`, `/api/policies`) were all verified against current NetBird sources and are correct.
- `netbird status --detail` is valid (also accepts `-d`).
