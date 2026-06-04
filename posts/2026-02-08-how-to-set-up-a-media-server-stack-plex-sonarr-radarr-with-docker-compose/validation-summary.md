# Validation Summary: How to Set Up a Media Server Stack (Plex + Sonarr + Radarr) with Docker Compose

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Plex Media Server
- Sonarr
- Radarr
- Prowlarr
- SABnzbd
- LinuxServer.io container images

## Sources Consulted
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose `version` and `name` reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose CLI reference: https://docs.docker.com/reference/cli/docker/compose/
- LinuxServer.io Plex image documentation: https://docs.linuxserver.io/images/docker-plex/
- LinuxServer.io Sonarr image documentation: https://docs.linuxserver.io/images/docker-sonarr/
- LinuxServer.io Radarr image documentation: https://docs.linuxserver.io/images/docker-radarr/
- LinuxServer.io Prowlarr image documentation: https://docs.linuxserver.io/images/docker-prowlarr/
- LinuxServer.io SABnzbd image documentation: https://docs.linuxserver.io/images/docker-sabnzbd/
- LinuxServer.io PUID/PGID documentation: https://docs.linuxserver.io/general/understanding-puid-and-pgid/
- Servarr Docker guide: https://wiki.servarr.com/docker-guide
- Sonarr Docker installation guide: https://wiki.servarr.com/sonarr/installation/docker
- Plex hardware-accelerated streaming support article: https://support.plex.tv/articles/115002178853-using-hardware-accelerated-streaming/

## Issues Found
- The Docker Compose snippet used the obsolete top-level `version: "3.8"` field. Docker Compose still accepts it for backward compatibility, but current Docker documentation marks it obsolete and warns that Compose always validates against the current specification. Removed the field.
- The directory structure omitted the `docker/sabnzbd/` config directory even though the compose file and startup command used it. Added `sabnzbd/` to the directory tree.
- The original volume layout mounted `/downloads`, `/tv`, and `/movies` as separate paths inside Sonarr and Radarr while claiming hardlinks or atomic moves would be instant. Servarr and LinuxServer.io documentation warn that separate container mounts are treated as different filesystems for this purpose. Updated the compose file to mount the common media root at `/data` for Plex, Sonarr, Radarr, and SABnzbd, and updated the setup instructions and volume explanation to use `/data/downloads/complete`, `/data/tv`, and `/data/movies`.
- The troubleshooting commands still checked `/tv` and `/movies` after the volume strategy correction. Updated them to check `/data/tv` and `/data/movies`.
- The "Check running versions" example read the first lines of a Sonarr log file, which is not a reliable version check. Replaced it with LinuxServer.io's documented `docker inspect` label pattern for container build version inspection.
- The hardware transcoding section omitted Plex Pass as a general requirement for Plex hardware-accelerated streaming. Added the Plex Pass requirement to the enabling condition.

## Review Notes
Validated the edited Docker Compose snippet with `docker compose -f - config` using Docker Compose v5.1.3. The guide remains a practical starting point, but real deployments should still configure SABnzbd categories and Sonarr/Radarr download-client category handling to match the user's preferred workflow.
