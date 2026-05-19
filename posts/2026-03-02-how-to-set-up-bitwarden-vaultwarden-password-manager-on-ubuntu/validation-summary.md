# Validation Summary: How to Set Up Bitwarden/Vaultwarden Password Manager on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Vaultwarden (Rust-based Bitwarden-compatible server)
- Docker & Docker Compose
- Nginx (reverse proxy with TLS)
- Let's Encrypt / certbot
- SQLite and PostgreSQL backends
- systemd-timesyncd / chrony (time sync)
- Bitwarden official clients (browser, desktop, mobile)

## Sources Consulted
- Vaultwarden Wiki — Enabling WebSocket notifications: https://github.com/dani-garcia/vaultwarden/wiki/Enabling-WebSocket-notifications
- Vaultwarden Wiki — Configuration overview: https://github.com/dani-garcia/vaultwarden/wiki/Configuration-overview
- Vaultwarden `.env.template` (main branch): https://github.com/dani-garcia/vaultwarden/blob/main/.env.template
- Vaultwarden Wiki — Proxy examples: https://github.com/dani-garcia/vaultwarden/wiki/Proxy-examples
- Docker Compose `extra_hosts` / `host-gateway` documentation and community references for Linux

## Issues Found

1. **Deprecated WebSocket environment variable.** The post used `WEBSOCKET_ENABLED=true`, but this variable has been deprecated and ignored since Vaultwarden v1.29.0. Replaced with the current `ENABLE_WEBSOCKET=true` and added a clarifying comment that WebSockets are now served on the main HTTP port.

2. **Obsolete port 3012 mapping.** The Docker Compose `ports:` section exposed `127.0.0.1:3012:3012` for the standalone WebSocket server. Support for the dedicated port 3012 was removed in Vaultwarden v1.31.0 — WebSocket traffic now flows through the main HTTP port. Removed the 3012 mapping.

3. **Outdated Nginx WebSocket configuration.** The Nginx config defined a second `vaultwarden-ws` upstream (`127.0.0.1:3012`) and dedicated `location /notifications/hub` and `location /notifications/hub/negotiate` blocks. With the integrated WebSocket, these blocks would point at a non-existent listener. Removed the extra upstream and the dedicated `/notifications/hub*` locations; the main `location /` block already carries the `Upgrade`/`Connection` headers required for WebSocket upgrade.

4. **`host.docker.internal` unresolved on Linux.** The PostgreSQL section instructed users to set `DATABASE_URL=postgresql://...@host.docker.internal:5432/...`, but `host.docker.internal` is only auto-resolved on Docker Desktop (macOS/Windows). On Linux, the container cannot reach the host through that hostname unless `extra_hosts: - "host.docker.internal:host-gateway"` is declared. Added the required `extra_hosts` block to the example.

5. **Deprecated `ntp` package recommendation.** The troubleshooting section ran `sudo apt install -y ntp && sudo systemctl enable --now ntp`. Modern Ubuntu (20.04+) ships with `systemd-timesyncd` enabled by default; installing the legacy `ntp` package conflicts with this and is no longer the recommended approach. Replaced with `timedatectl set-ntp true` for the default daemon, with `chrony` as the preferred alternative if a more featureful NTP daemon is needed.

## Review Notes
- All other Vaultwarden environment variables in the docker-compose snippet (`DOMAIN`, `SIGNUPS_ALLOWED`, `ADMIN_TOKEN`, `INVITATION_ORG_NAME`, SMTP_*, `EMERGENCY_ACCESS_ALLOWED`, `SHOW_PASSWORD_HINT`, `LOG_LEVEL`, `EXTENDED_LOGGING`, `DATABASE_URL`) were verified against the upstream `.env.template` and are correct.
- The `/api/alive` and `/notifications/hub/negotiate` URLs used in the troubleshooting curl commands are valid Vaultwarden endpoints.
- The Docker Compose file uses `version: "3.8"`. Compose v2 has formally deprecated the top-level `version` field (it is now informational and ignored), but it is still accepted and does not produce errors — left as-is to preserve the author's style.
- The `vaultwarden/server:latest` image tag will continue to work, but for production, pinning to a specific version tag is generally safer. This is a recommendation, not a correctness issue.
- The `ADMIN_TOKEN` is shown as a plain string; recent Vaultwarden versions log a warning unless the token is hashed with Argon2 (via `vaultwarden hash`). The plain-string form still functions, so this is informational rather than incorrect.
- The Bitwarden client connection instructions are accurate at a high level; the exact UI labels ("Self-hosted", region selector) vary slightly across client versions but the flow described is correct.
- `ssl_ciphers` list is reasonable but quite narrow — Mozilla's intermediate profile is generally preferred for broader client compatibility. Not a correctness issue.
