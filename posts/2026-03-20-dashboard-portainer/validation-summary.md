# Validation Summary: How to Self-Host a Dashboard (Heimdall/Homer/Homarr) with Portainer

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Homarr (self-hosted dashboard)
- Homer (self-hosted dashboard)
- Heimdall (self-hosted dashboard)
- Docker / Docker Compose
- Portainer
- Traefik (referenced via labels)
- Uptime Kuma
- Jellyfin / Sonarr / Gitea / Grafana (referenced as example services)

## Sources Consulted
- [Homarr official documentation — Docker installation](https://homarr.dev/docs/getting-started/installation/docker/)
- [Homarr 1.0 release announcement (rewrite, repo move to homarr-labs)](https://homarr.dev/blog/2024/09/23/version-1.0/)
- [Homarr Docker Hub (homarr/homarr)](https://hub.docker.com/r/homarr/homarr)
- [Homarr ajnart vs homarr-labs comparison](https://www.answeroverflow.com/m/1335383669443133480)
- [Homer GitHub repository (bastienwirtz/homer)](https://github.com/bastienwirtz/homer)
- [Homer Docker Hub (b4bz/homer)](https://hub.docker.com/r/b4bz/homer)
- [LinuxServer.io Heimdall image (lscr.io/linuxserver/heimdall)](https://docs.linuxserver.io/images/docker-heimdall/)
- [Uptime Kuma (louislam/uptime-kuma)](https://github.com/louislam/uptime-kuma)

## Issues Found

1. **Outdated Homarr Docker image.** The post used `ghcr.io/ajnart/homarr:latest`. The `ajnart/homarr` repository was archived in late 2024 and the project moved to `homarr-labs/homarr` with the v1.0 rewrite. The original image receives no updates and is not recommended for new installations. Updated to `ghcr.io/homarr-labs/homarr:latest`.

2. **Incorrect Homarr volume mappings.** The post used the old v0 paths (`/app/data/configs`, `/app/public/icons`, `/data`) which no longer exist in Homarr v1. The current image uses a single `/appdata` mount that holds the SQLite database, configs, and icons. Replaced the three volumes with a single `homarr_appdata:/appdata` mount, matching the official docs.

3. **Missing required `SECRET_ENCRYPTION_KEY`.** Homarr v1 requires a `SECRET_ENCRYPTION_KEY` environment variable (used to encrypt integration credentials in the database). Without it the container fails to start. Added the variable with a comment showing how to generate it via `openssl rand -hex 32`.

4. **Misleading comment.** The comment `# Enable authentication` was placed above `DEFAULT_COLOR_SCHEME=dark`, which only sets the UI color scheme and has nothing to do with authentication. The variable was also a v0 setting and has been removed; replaced the block with the encryption key plus an accurate comment.

## Review Notes

- The Homer section (`b4bz/homer:latest`, internal port 8080, YAML config under `/www/assets/config.yml`) matches the official Homer documentation and is correct, including the `type: "Emby"` smart card for Jellyfin (Jellyfin exposes an Emby-compatible API and Homer's "Emby" smart card type is the documented way to surface its status).
- The Heimdall section (`lscr.io/linuxserver/heimdall:latest`, `PUID`/`PGID`/`TZ`, `/config` volume, ports 80/443) matches the LinuxServer.io documented configuration. Users should be aware that binding host ports 80 and 443 will conflict with most reverse-proxy setups; this is documented behavior of the image, not an error in the post.
- The Uptime Kuma snippet (`louislam/uptime-kuma:latest`, port 3001, `/app/data` volume) is correct.
- Section numbering is mixed ("Option 1/2/3" then "Step 4/5"), which is a minor stylistic inconsistency rather than a technical issue and was left as-is per the review scope.
- The third-party icon URLs (NX211/homer-icons, selfhosters/unRAID-CA-templates) are stable community-maintained repositories and are appropriate for the examples shown.
