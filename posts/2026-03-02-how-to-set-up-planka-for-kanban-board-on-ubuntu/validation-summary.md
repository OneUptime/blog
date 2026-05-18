# Validation Summary: How to Set Up Planka for Kanban Board on Ubuntu

## Status
validated

## Post Type
Tutorial / Self-hosting guide

## Technologies Covered
- Planka (open-source Kanban board)
- Docker & Docker Compose
- PostgreSQL 16
- nginx (reverse proxy with WebSocket support)
- Certbot / Let's Encrypt
- Ubuntu 20.04 / 22.04

## Sources Consulted
- Official Planka docker-compose.yml on master: https://raw.githubusercontent.com/plankanban/planka/master/docker-compose.yml
- Planka documentation - Admin User configuration: https://docs.planka.cloud/docs/configuration/admin-user/
- Planka documentation - Docker production installation: https://docs.planka.cloud/docs/installation/docker/production-version/
- Planka documentation index: https://docs.planka.cloud/docs/welcome/

## Issues Found

Several technical issues were found and corrected:

1. **Outdated volume mounts in docker-compose.yml**: The post used three separate volumes (`user-avatars:/app/public/user-avatars`, `project-background-images:/app/public/project-background-images`, `attachments:/app/private/attachments`). Current Planka uses a single unified volume `data:/app/data`. Updated the Compose file accordingly and removed the obsolete `version: '3'` key (Compose v2 no longer requires it).

2. **Non-existent environment variable `ATTACHMENTS_MAX_SIZE`**: The current variable name is `MAX_UPLOAD_FILE_SIZE`. Renamed in the example.

3. **Incorrect `DEFAULT_LANGUAGE` example value**: Changed `en` to `en-US`, which matches the documented default and locale format.

4. **Non-existent environment variable `ALLOW_ALL_TO_CREATE_PROJECTS`**: This variable does not exist in current Planka, and the inline comment ("disable registration") misrepresented what it would do anyway. Replaced this block with the documented `DEFAULT_ADMIN_*` variables for initial admin provisioning.

5. **Wrong admin user creation method**: The post invoked `docker compose exec planka node ./dist/db/createUser.js --name ... --email ... --password ... --admin`. This script and CLI flag set do not exist in current Planka. The correct, documented methods are:
   - `docker compose run --rm planka npm run db:create-admin-user` (interactive prompts)
   - Or setting `DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_PASSWORD`, `DEFAULT_ADMIN_NAME`, and (optionally) `DEFAULT_ADMIN_USERNAME` in `docker-compose.yml` and restarting.
   Rewrote the "Creating the Initial Admin User" section to use these methods.

6. **Incorrect claim that the first registered user becomes admin**: Since Planka 1.13 no administrator is created automatically and self-registration does not promote the first user. Removed this misleading paragraph.

7. **Non-existent `listUsers.js` script and other invalid helper commands** in the "Managing Users" section. Removed and simplified to point at the supported admin-creation script plus the web UI for regular user management.

8. **Backup/restore scripts referenced a `planka_attachments` volume** that no longer exists. Updated both scripts to operate on the new unified `planka_data` volume (and renamed the resulting tarballs from `planka-attachments-*.tar.gz` to `planka-data-*.tar.gz`).

## Review Notes
- The post pins `ghcr.io/plankanban/planka:latest`. For production reproducibility, pinning to a specific Planka version tag (e.g., `:1.x.x`) would be safer, but this matches the upstream Compose template so it was left as-is.
- The post uses a custom Postgres user/password (`planka` / `dbpassword`) instead of the upstream template's `POSTGRES_HOST_AUTH_METHOD=trust` with a `postgres` superuser. Both work; the post's approach is reasonable.
- `MAX_UPLOAD_FILE_SIZE` units (bytes) are not explicitly documented in the upstream Compose comment, but the post's example value (10 MiB) is plausible. Users should test before relying on a hard limit.
- The nginx config correctly enables WebSocket support (`Upgrade`/`Connection` headers and HTTP/1.1), which Planka requires for real-time updates.
- The `TRUST_PROXY=true` setting is correctly recommended for the nginx-reverse-proxy setup so that Planka honors `X-Forwarded-*` headers.
