# Validation Summary: How to Deploy Authelia via Portainer

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- Authelia (authentication & authorization server, v4.38+)
- Portainer (container management)
- Docker Compose
- Redis (session storage)
- SQLite (local user database storage)
- Argon2id (password hashing)
- TOTP (two-factor authentication)

## Sources Consulted
- Authelia configuration prologue: https://www.authelia.com/configuration/prologue/introduction/
- Authelia migration guide: https://www.authelia.com/configuration/prologue/migration/
- Authelia 4.38 release notes: https://www.authelia.com/blog/4.38-release-notes/
- Authelia server configuration: https://www.authelia.com/configuration/miscellaneous/server/
- Authelia session configuration: https://www.authelia.com/configuration/session/introduction/
- Authelia Redis session: https://www.authelia.com/configuration/session/redis/
- Authelia identity validation / reset password: https://www.authelia.com/configuration/identity-validation/reset-password/
- Authelia storage introduction: https://www.authelia.com/configuration/storage/introduction/
- Authelia password hash CLI: https://www.authelia.com/reference/cli/authelia/authelia_crypto_hash_generate_argon2/
- Authelia config template: https://github.com/authelia/authelia/blob/master/config.template.yml

## Issues Found
The original post used pre-v4.38 configuration syntax. Since `authelia/authelia:latest` resolves to v4.39.x, the original config would emit deprecation warnings and (because the `session.cookies` array is required) would not work end-to-end. Fixed the following:

1. **Top-level `jwt_secret` deprecated.** Moved into `identity_validation.reset_password.jwt_secret` per the v4.38 restructuring of identity-validation settings.
2. **Top-level `default_redirection_url` deprecated.** Removed from the top level and added as `default_redirection_url` inside the new `session.cookies[]` entry.
3. **`server.host` / `server.port` deprecated.** Replaced with the unified `server.address: 'tcp://0.0.0.0:9091/'` syntax introduced in v4.38.
4. **Missing required `session.cookies` array.** v4.38+ requires at least one entry in `session.cookies` describing the protected domain (`domain`, `authelia_url`, etc.). Added an entry for `example.com` with `name: authelia_session` (relocated from the deprecated top-level `session.name`).
5. **Missing required `storage.encryption_key`.** This field is required in current Authelia (minimum 20 chars). Added a placeholder with a "Change this" comment.
6. **Outdated CLI command.** The `authelia hash-password` command has been replaced by `authelia crypto hash generate argon2`. Updated the inline comment to use `docker run --rm authelia/authelia:latest authelia crypto hash generate argon2 --password 'yourpassword'`.

## Review Notes
- The Compose stack itself (image, ports, volumes, `depends_on`, redis sidecar) is correct for current Authelia versions. The `version: "3.8"` key in the Compose file is informational only on modern Docker Compose (Compose v2 ignores it) but is harmless.
- The `/api/health` endpoint and its `{"status":"OK"}` response are consistent with Authelia's healthcheck endpoint behavior.
- The `password: "$argon2id$v=19$m=65536,t=1,p=8$..."` hash format example is a syntactically valid Argon2id PHC string; the `m=65536,t=1,p=8` parameters match Authelia's documented defaults at the time the post was written, though authors should regenerate using the current CLI to pick up any future default changes.
- For production use, secrets (`jwt_secret`, `session.secret`, `storage.encryption_key`) should be supplied via Docker secrets or environment-variable-backed secret files rather than written in plaintext into `configuration.yml`. The post does not call this out — a future revision could.
- The access_control rule `domain: "*.example.com"` will only match cookies whose `session.cookies[].domain` covers those subdomains; the corrected config sets `domain: example.com`, which does cover `*.example.com`.
