# Validation Summary: How to Self-Host a Wiki with Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (Docker stack management UI)
- Docker Compose (v3.8 schema)
- Wiki.js 2.x (`ghcr.io/requarks/wiki:2`)
- BookStack (`lscr.io/linuxserver/bookstack`)
- PostgreSQL 15 (alpine) and MariaDB 10.11
- Traefik (reverse proxy labels, Let's Encrypt cert resolver)
- LDAP / Active Directory authentication
- Docker secrets (Swarm / Portainer Secrets)
- Bash shell scripting for backups (`pg_dump`, `tar`, `find`)

## Sources Consulted
- Wiki.js Docker install docs: https://docs.requarks.io/install/docker
- Wiki.js LDAP authentication docs: https://docs.requarks.io/auth/ldap
- Requarks/wiki GitHub repo and reference `docker-compose.yml`: https://github.com/Requarks/wiki
- LinuxServer.io BookStack image docs: https://docs.linuxserver.io/images/docker-bookstack/
- `linuxserver/docker-bookstack` GitHub README: https://github.com/linuxserver/docker-bookstack
- BookStack application documentation: https://www.bookstackapp.com/docs/admin/installation/
- PostgreSQL 15 official image on Docker Hub
- MariaDB 10.11 official image on Docker Hub
- Traefik v2 routing labels documentation: https://doc.traefik.io/traefik/routing/providers/docker/
- Docker Compose `secrets` reference (Swarm requirement): https://docs.docker.com/compose/compose-file/09-secrets/

## Issues Found

1. **Invalid Wiki.js environment variables.** The `wikijs` service declared `WIKI_PORT=3000` and `WIKI_DB_TYPE=postgres`. Neither is a real Wiki.js env var — Wiki.js 2.x only uses `DB_TYPE`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME` (and optionally `DB_SSL` / `HTTP_PORT`). The fabricated `WIKI_*` names would be silently ignored. Removed both lines.

2. **Wrong BookStack database variable names.** The BookStack stack used `DB_USERNAME` and `DB_PASSWORD`, but the LinuxServer image expects `DB_USER` and `DB_PASS`. With the wrong names the container would fail to connect to MariaDB. Renamed both variables to match the image's documented parameters.

3. **Missing required `APP_KEY` for BookStack.** LinuxServer's BookStack image requires an `APP_KEY` (base64-encoded 32-byte Laravel encryption key) in addition to `APP_URL`. Without it the application will not start cleanly. Added `APP_KEY=base64:generate_with_appkey_command` with an inline hint that users need to generate it (via the image's `appkey` entrypoint or `php artisan key:generate --show`).

4. **LDAP cannot be configured via environment variables in Wiki.js.** The "Step 3: Set Up LDAP Authentication" section showed a list of `WIKI_LDAP_*` env vars (host, port, base DN, bind DN, credentials, search filter). None of these exist in Wiki.js — LDAP (and every other auth strategy) is configured exclusively through the admin panel (Administration → Authentication → Add Strategy → LDAP / Active Directory). Replaced the fabricated env-var block with the correct admin-UI workflow while keeping the same example values (URL, base DN, bind DN, search filter) so readers still get a working reference configuration.

## Review Notes

- **Compose `version: "3.8"`** is ignored by modern Docker Compose (v2+) but remains harmless; kept as-is to match the author's style.
- **Wiki.js `/wiki/data` volume** is not strictly required — Wiki.js 2.x stores content in the database, and the default Requarks compose file mounts no volume. The bind point is benign (creates an unused volume) so it was left in place.
- **Docker secrets with `external: true`** require Docker Swarm mode; standalone Portainer environments running plain Compose will not honor this. The author frames it as a Portainer Secrets feature, which is accurate for Swarm-backed Portainer setups. Worth calling out to readers but not factually wrong.
- **BookStack MariaDB healthcheck** (`healthcheck.sh --connect --innodb_initialized`) is correct for MariaDB 10.5+ images.
- The Wiki.js image tag `ghcr.io/requarks/wiki:2` is the current canonical tag; Wiki.js 3.x ("Wiki.js Next") is still in beta and not the recommended stable channel at the time of review.
- The `pg_dump` backup stream and the `docker volume inspect ... -f '{{ .Mountpoint }}'` pattern in the backup script are both valid on Linux hosts. On Docker Desktop for macOS/Windows the mountpoint path is inside the VM and the `tar` line would need to be adjusted — minor caveat, not a correctness error.
