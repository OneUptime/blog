# Validation Summary: How to Deploy Radarr via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose / Portainer stacks
- Radarr
- LinuxServer.io Radarr container
- qBittorrent
- Radarr API
- Trakt and IMDb import lists

## Sources Consulted
- Radarr settings documentation: https://wiki.servarr.com/radarr/settings
- Radarr naming and Docker guidance: https://radarr.video/docs/naming_conventions
- LinuxServer.io Radarr container documentation: https://docs.linuxserver.io/images/docker-radarr/
- Portainer stacks documentation: https://docs.portainer.io/user/docker/stacks
- Radarr API controller source: https://github.com/Radarr/Radarr/blob/master/src/Radarr.Api.V3/Movies/MovieController.cs
- Radarr API movie resource source: https://github.com/Radarr/Radarr/blob/master/src/Radarr.Api.V3/Movies/MovieResource.cs
- Radarr add-options source: https://github.com/Radarr/Radarr/blob/master/src/NzbDrone.Core/Movies/AddMovieOptions.cs
- Radarr localization source for current UI wording: https://github.com/Radarr/Radarr/blob/master/src/NzbDrone.Core/Localization/Core/en.json
- Radarr latest stable release: https://github.com/Radarr/Radarr/releases/tag/v6.1.1.10360

## Issues Found
- The stack example mounted `/movies` and `/downloads` separately. Current Radarr and LinuxServer guidance recommends a single common data mount to preserve hardlinks and atomic moves, so the example was corrected to mount `/mnt/media:/data` and the related Radarr paths were updated to `/data/movies`.
- The existing-library import step used outdated UI wording. Current Radarr uses `Import Existing Movies`, so that menu path was corrected.
- The quality-upgrade section used outdated terminology (`Cutoff`) and described `Upgrade Until` as if it were a toggle. Current Radarr quality profiles use `Upgrades Allowed` plus `Upgrade Until`, so that explanation was corrected.

## Review Notes
- The Radarr API examples are valid against the current v3 API shape: `GET /api/v3/movie` and `POST /api/v3/movie` with `qualityProfileId`, `rootFolderPath`, `monitored`, and `addOptions.searchForMovie`.
- The LinuxServer image used in the post is current and valid, but Radarr’s own docs note that Docker images are third-party maintained rather than official first-party Radarr images.
- Review performed against the latest Radarr stable release available on April 24, 2026: `6.1.1.10360` (published March 26, 2026).
