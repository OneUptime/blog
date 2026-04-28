# Validation Summary: How to Self-Host a Note-Taking App with Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Docker / Docker Compose
- Joplin Server
- PostgreSQL (15-alpine, used as Joplin Server backend)
- Silverbullet (markdown PKM tool)
- Memos (note-taking app by neosmemo)
- Traefik (reverse proxy labels)
- Bash / cron (backup automation)

## Sources Consulted
- [Joplin Server env.ts (laurent22/joplin)](https://github.com/laurent22/joplin/blob/dev/packages/server/src/env.ts) — Authoritative list of supported environment variables
- [Joplin Server Docker image](https://hub.docker.com/r/joplin/server) — Image and default port (22300)
- [Breaking change on mailer configuration in Joplin Server 2.7](https://discourse.joplinapp.org/t/breaking-change-on-mailer-configuration-in-joplin-server-2-7/23464) — `MAILER_SECURE` renamed to `MAILER_SECURITY`
- [Joplin architecture docs](https://joplinapp.org/help/dev/spec/architecture/) — Confirms `items` table stores notes, notebooks, tags, etc.
- [SilverBullet Docker docs](https://silverbullet.md/Install/Docker) — Image, port 3000, `SB_USER` env var, `/space` mount path
- [zefhemel/silverbullet on Docker Hub](https://hub.docker.com/r/zefhemel/silverbullet) — Confirmed actively maintained image
- [Memos Docker Compose docs](https://usememos.com/docs/deploy/docker-compose) — Confirms `neosmemo/memos:stable`, port 5230, `/var/opt/memos` volume

## Issues Found

1. **`MAILER_SECURE=false` is outdated** — Fixed to `MAILER_SECURITY=starttls`.
   - Joplin Server 2.7 introduced a breaking change renaming `MAILER_SECURE` (boolean) to `MAILER_SECURITY` (enum: `none` | `tls` | `starttls`). Since the compose uses `joplin/server:latest`, the new variable must be used. Port 587 with the previous `MAILER_SECURE=false` indicated STARTTLS, which maps to `MAILER_SECURITY=starttls`.

2. **`SELECT COUNT(*) FROM notes;` would fail** — Fixed to `SELECT COUNT(*) FROM items;`.
   - Joplin Server's PostgreSQL schema does not have a `notes` table. All Joplin object metadata (notes, notebooks, tags, etc.) is stored in the `items` table. The original query would error with `relation "notes" does not exist`.

## Review Notes

- The `joplin_db` and `silverbullet`/`memos` services share `notes_network` across separate compose files. In practice, networks defined in different `docker-compose.yml` files are scoped per project and won't be shared automatically — readers who want true cross-stack networking would need to mark `notes_network` as `external: true` after creating it once. This is a configuration nuance rather than a hard technical error, so left as-is.
- The comment `# Disable signups after creating account` paired with `SIGNUP_ENABLED=true` is intentional guidance (enable initially, set to `false` later). Left unchanged.
- The post uses `:latest` tags throughout (`joplin/server:latest`, `zefhemel/silverbullet:latest`). For production deployments, pinning to specific versions is generally safer, but this is a stylistic recommendation, not a correctness issue.
- The "Step 3: Set Up Automated Backups" heading skips a Step 2 numbering, but this is structural rather than a technical error and was not modified per the no-restructuring rule.
- `postgres:15-alpine`, port 22300, port 3000, port 5230, `/var/opt/memos`, `/space`, and `SB_USER=username:password` format are all confirmed correct against official sources.
