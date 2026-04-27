# Validation Summary: How to Self-Host a Password Manager with Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Vaultwarden (formerly Bitwarden_RS)
- Bitwarden client compatibility (browser, mobile, desktop)
- Portainer (Docker stack management)
- Docker / Docker Compose
- Traefik (reverse proxy, TLS termination, Let's Encrypt)
- Nginx Proxy Manager
- SMTP (Gmail / starttls)
- Bash scripting (backup script)
- cron (scheduled backups)

## Sources Consulted
- Official Vaultwarden `.env.template`: https://github.com/dani-garcia/vaultwarden/blob/main/.env.template
- Vaultwarden source (`src/config.rs`, `src/auth.rs`) for confirmation of which config knobs exist
- Vaultwarden release notes / project history (rename from `bitwarden_rs` → `vaultwarden` in 2021)
- Vaultwarden 1.29.0 changelog regarding WebSocket integration into the main HTTP port
- Traefik v2/v3 router/service label conventions: https://doc.traefik.io/traefik/routing/providers/docker/
- Nginx WebSocket proxy documentation: https://nginx.org/en/docs/http/websocket.html

## Issues Found

1. **`WEBSOCKET_ENABLED` is the wrong variable name.**
   The current Vaultwarden environment variable is `ENABLE_WEBSOCKET`. Changed in the compose snippet.

2. **Port 3012 (separate WebSocket port) is deprecated.**
   Since Vaultwarden 1.29.0, WebSocket traffic is served on the same HTTP port as the API (default 80). The previously-required separate `:3012` port no longer exists. Removed:
   - The `traefik.http.routers.vaultwarden-ws.*` labels and the `vaultwarden-ws` Traefik service pointing to port 3012.
   - The Nginx `location /notifications/hub` block was changed to proxy to `http://vaultwarden:80` instead of `:3012`.
   Added a short comment in both snippets explaining the consolidation so readers on older Vaultwarden tutorials understand the change.

3. **`SESSION_JWT_EXPIRATION` does not exist in Vaultwarden.**
   No such environment variable is defined anywhere in `config.rs`. Access token lifetime is hardcoded (`BW_EXPIRATION` = 5 minutes); there is no user-tunable login-token lifetime. The closest configurable lifetime is `ADMIN_SESSION_LIFETIME` (admin panel only, in minutes, default 20). Replaced the bogus variable with `ADMIN_SESSION_LIFETIME=20` and updated the comment.

## Review Notes

- `REQUIRE_DEVICE_EMAIL`, `LOGIN_RATELIMIT_*`, `ADMIN_RATELIMIT_*`, `ORG_CREATION_USERS`, `SMTP_SECURITY=starttls`, and the `Bitwarden_RS → Vaultwarden` rename history are all accurate.
- `DOMAIN` is technically not a hard requirement for Vaultwarden to start, but it is strongly recommended (and effectively required) because without it WebAuthn/U2F, attachment downloads, and email links break. The post's "REQUIRED for Bitwarden clients" framing is reasonable for a real deployment and was left as-is.
- `version: "3.8"` in the compose file is harmless but is now treated as obsolete by recent Docker Compose versions; modern Compose ignores the `version` key. Left in place because it does not break anything and matches what most existing Portainer tutorials show.
- `image: vaultwarden/server:latest` works, but pinning to a specific tag (e.g., `vaultwarden/server:1.30.5`) is safer for production. Not changed — outside the scope of fixing technical errors.
- The directory ownership `chown -R 1000:1000 /opt/vaultwarden` matches the default non-root UID used by the Vaultwarden container image, so this is correct.
- The Bitwarden mobile app's "Self-hosted" option is currently surfaced via the region selector / "Logging in on" screen on recent app versions; the wording "Tap the region selector and choose **Self-hosted**" is a reasonable approximation of the current flow.
