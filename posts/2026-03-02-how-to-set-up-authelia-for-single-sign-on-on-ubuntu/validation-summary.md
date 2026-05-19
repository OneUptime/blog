# Validation Summary: How to Set Up Authelia for Single Sign-On on Ubuntu

## Status
validated

## Post Type
Tutorial / Step-by-step setup guide

## Technologies Covered
- Authelia (open-source authentication/authorization server)
- Docker / Docker Compose
- Nginx (reverse proxy with `auth_request` module)
- Ubuntu 22.04 / 24.04
- Argon2id password hashing
- TOTP (Time-based One-Time Passwords)
- SQLite (Authelia's local storage backend)

## Sources Consulted
- Authelia 4.38 release notes: https://www.authelia.com/blog/4.38-release-notes/
- Authelia file authentication backend docs: https://www.authelia.com/configuration/first-factor/file/
- Authelia session configuration: https://www.authelia.com/configuration/session/introduction/
- Authelia NGINX integration guide: https://www.authelia.com/integration/proxies/nginx/
- Authelia CLI reference (`authelia crypto hash generate argon2`)
- OWASP Password Storage Cheat Sheet (argon2id parameter recommendations)
- Docker installation docs for Ubuntu: https://docs.docker.com/engine/install/ubuntu/

## Issues Found

1. **Dangerously weak argon2id hashing parameters (fixed).** The original configuration used `iterations: 1`, `memory: 1024` (1 MiB), and `parallelism: 8`. These values are well below both Authelia's own defaults and OWASP recommendations and would produce password hashes vulnerable to GPU/ASIC attacks. Updated to Authelia's current defaults: `iterations: 3`, `memory: 65536` (64 MiB), `parallelism: 4`. The example argon2id hash strings in `users_database.yml` were also updated from `$argon2id$v=19$m=1024,t=1,p=8$...` to `$argon2id$v=19$m=65536,t=3,p=4$...` so they encode parameters consistent with the new configuration.

## Review Notes

The post uses the pre-4.38 flat configuration syntax for several fields. These continue to work in current Authelia (4.38.x) via automatic remapping at startup, but they emit deprecation warnings and are slated for removal in Authelia 5.0.0. None of these are technically incorrect today, but readers running `authelia/authelia:latest` will see warnings in the container logs:

- `jwt_secret_file` at top level — newer location is `identity_validation.reset_password.jwt_secret_file`.
- `default_redirection_url` at top level — newer location is per-cookie under `session.cookies[].default_redirect_url`.
- `session.domain` (and other top-level session fields like `expiration`, `inactivity`, `remember_me_duration`, `name`, `secret_file`) — newer structure uses a `session.cookies[]` array with these fields per cookie domain.
- `algorithm: argon2id` flat structure — newer structure uses `algorithm: argon2` with a nested `argon2: { variant: argon2id, ... }` block.
- The `/api/verify` endpoint used in the Nginx snippet — deprecated in 4.38 in favor of `/api/authz/auth-request` (with an `Auth-Request` proxy implementation). The legacy endpoint still works.

Other minor observations (not technical errors):

- `version: '3.8'` in `docker-compose.yml` is obsolete in Docker Compose v2+; it is ignored with a warning but does not break anything.
- The post recommends `authelia/authelia:latest` for both production and the hash-generation step. Pinning to a specific minor version (e.g., `authelia/authelia:4.38`) is generally safer for production to avoid surprise breaking changes during `docker compose pull`.
- The SMTP `password: your_smtp_password` is inline plaintext; readers should be steered toward `password_file` (mounting a secret file) for parity with the other secrets, but this is a stylistic improvement rather than a correctness issue.
