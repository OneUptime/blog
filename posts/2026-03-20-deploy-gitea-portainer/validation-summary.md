# Validation Summary: How to Deploy Gitea via Portainer

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- Gitea (self-hosted Git service)
- Portainer (Docker container management UI)
- Docker / Docker Compose
- PostgreSQL 16 (Alpine)
- Gitea Actions (CI/CD, GitHub Actions-compatible)
- gitea/act_runner (Actions runner)
- SSH (for git push/pull)
- SMTP (Gmail mailer integration)

## Sources Consulted
- Gitea Configuration Cheat Sheet — https://docs.gitea.com/administration/config-cheat-sheet (verified `GITEA__section__KEY` env var format, `[server]` SSH_PORT vs SSH_LISTEN_PORT semantics, `[database]`, `[mailer]` keys)
- Gitea Install with Docker — https://docs.gitea.com/installation/install-with-docker (verified the recommended `host:22` port mapping pattern)
- Gitea Actions Quickstart — https://docs.gitea.com/usage/actions/quickstart (confirmed `[actions] ENABLED` and that Actions are enabled by default since 1.21.0)
- gitea/act_runner repo — https://gitea.com/gitea/act_runner (confirmed `GITEA_INSTANCE_URL` and `GITEA_RUNNER_REGISTRATION_TOKEN` env vars are correct for Docker-based auto-registration)
- Official Gitea Docker image (`gitea/gitea:latest`) and Postgres image (`postgres:16-alpine`) on Docker Hub

## Issues Found

1. **SSH port inconsistency between `SSH_PORT` env var and clone URL example.** The compose file set `GITEA__server__SSH_PORT=22` while the host port mapping was `2222:22` and the clone URL example used port 2222 (`ssh://git@gitea.yourdomain.com:2222/...`). With `SSH_PORT=22`, Gitea would render clone URLs in its UI showing port 22, contradicting the SSH instructions later in the post.
   - Fix: changed `GITEA__server__SSH_PORT` to `2222` so generated clone URLs match what users actually connect to, and added `GITEA__server__SSH_LISTEN_PORT=22` so the in-container SSH server keeps listening on 22 (matching the `2222:22` port mapping). This is the standard pattern documented in the Gitea config cheat sheet — `SSH_PORT` is the value advertised in clone URLs while `SSH_LISTEN_PORT` is what the built-in SSH server actually binds to.

2. **"Enable in app.ini" prose mismatched the snippet that followed.** The snippet `GITEA__actions__ENABLED=true` is the env var override format (which writes into `[actions] ENABLED = true` in app.ini), not literal app.ini syntax. Also, Gitea Actions has been enabled by default since Gitea 1.21.
   - Fix: clarified the prose to note Actions is enabled by default since 1.21 and that the snippet is an environment variable on the gitea service.

## Review Notes
- The `GITEA__database__HOST=gitea-db:5432` form including the port is correct per the Gitea config cheat sheet (host accepts `host:port`).
- The `[mailer]` block omits `PROTOCOL`, but Gitea auto-detects the protocol from `SMTP_PORT` (587 → `smtp+starttls`), so this works without an explicit setting.
- `pg_isready -U gitea` healthcheck does not specify a database; this still passes for connection acceptance and is fine. Adding `-d gitea` would make the check more strict but is not required.
- `image: gitea/gitea:latest` and `gitea/act_runner:latest` are convenient for a tutorial but pinning to specific versions is generally recommended for production stacks.
- The `gitea-runner` snippet is presented in isolation (no `volumes:` top-level declaration for `gitea_runner_data`); readers adding it to a standalone stack will need to declare the named volume. Left as-is to match the "snippet" presentation.
- The `version: "3.8"` key in compose is now ignored by Docker Compose v2 but is harmless and still widely used in tutorials.
