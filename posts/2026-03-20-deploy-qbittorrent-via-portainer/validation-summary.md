# Validation Summary: How to Deploy qBittorrent via Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose / Portainer stacks
- qBittorrent
- LinuxServer.io container images
- Sonarr
- Radarr

## Sources Consulted
- LinuxServer.io qBittorrent image docs: https://docs.linuxserver.io/images/docker-qbittorrent/
- LinuxServer qBittorrent repository README: https://github.com/linuxserver/docker-qbittorrent
- Docker Compose file reference for top-level `version`: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose networking docs: https://docs.docker.com/compose/how-tos/networking/
- Portainer "Add a new stack" docs: https://docs.portainer.io/user/docker/stacks/add
- Official qBittorrent Docker image README: https://github.com/qbittorrent/docker-qbittorrent-nox
- qBittorrent WebUI password recovery wiki: https://github.com/qbittorrent/qBittorrent/wiki/Web-UI-password-locked-on-qBittorrent-NO-X-%28qbittorrent-nox%29
- Sonarr settings reference: https://wikiold.servarr.com/Sonarr_Settings
- Radarr settings reference: https://wikiold.servarr.com/Radarr_Settings

## Issues Found
- The Compose example used the top-level `version: "3.8"` key. Docker now documents the top-level `version` element as obsolete, so I removed it.
- The Compose example used `linuxserver/qbittorrent:latest`. LinuxServer’s current documentation uses `lscr.io/linuxserver/qbittorrent:latest`, so I updated the image reference to the current official form.
- The post description claimed "VPN-through-container support", but the post does not include a VPN container or `network_mode`-based configuration for that pattern. I removed that inaccurate claim from the description.
- The Sonarr/Radarr connection guidance said to use the qBittorrent "container name" on the same network. Docker Compose service discovery works by service name on a shared Docker network, so I corrected that wording.

## Review Notes
- The qBittorrent first-login password guidance is valid for current releases: newer qBittorrent versions generate a temporary password and print it to stdout/container logs, while older versions used `adminadmin`.
- The current snippet keeps the default torrent port mapping (`6881`). LinuxServer documents that `TORRENTING_PORT` matters when changing the torrent port; no change was required for the default mapping shown here.
- A full `docker compose config` validation was not possible in this workspace because the `docker` CLI is not installed. I did parse the YAML block successfully with a local YAML parser.
