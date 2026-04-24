# Validation Summary: How to Deploy qBittorrent via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose / Docker stacks
- qBittorrent
- LinuxServer.io qBittorrent container
- VueTorrent
- Sonarr
- Radarr
- binhex `arch-qbittorrentvpn`
- WireGuard

## Sources Consulted
- LinuxServer.io qBittorrent image documentation: https://docs.linuxserver.io/images/docker-qbittorrent/
- Docker Compose reference for top-level `version`: https://docs.docker.com/reference/compose-file/version-and-name/
- qBittorrent options reference: https://github.com/qbittorrent/qBittorrent/wiki/Explanation-of-Options-in-qBittorrent
- qBittorrent Web UI password behavior: https://github.com/qbittorrent/qBittorrent/wiki/Web-UI-password-locked-on-qBittorrent-NO-X-%28qbittorrent-nox%29
- qBittorrent WebUI API category save paths: https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-%28qBittorrent-4.1%29
- VueTorrent installation guide: https://github.com/VueTorrent/VueTorrent/wiki/Installation
- Sonarr settings reference: https://wiki.servarr.com/sonarr/settings
- Radarr settings reference: https://wiki.servarr.com/radarr/settings
- binhex qBittorrent VPN image README: https://github.com/binhex/arch-qbittorrentvpn

## Issues Found
- The Compose snippets used the top-level `version` key. Docker now documents this field as obsolete, so it was removed from both stack examples.
- The LinuxServer qBittorrent example omitted `TORRENTING_PORT=6881`, which is part of the current documented configuration when exposing the torrent port. It was added to keep the stack aligned with the published image docs.
- The post stated the default qBittorrent Web UI password was `adminadmin`. Current qBittorrent and LinuxServer documentation show a temporary password is generated and shown on first startup, so the initial-access section was corrected.
- The optional VueTorrent Docker mod used an outdated mod reference and did not mention the required alternate WebUI setting. The mod reference was updated to the current official value and the matching WebUI configuration step was added.
- The post said to configure the torrent port under `Options > BitTorrent`. Current qBittorrent documentation places the listening port under `Options > Connection`, so that instruction was corrected.
- The Sonarr/Radarr integration text implied categories should be created directly in qBittorrent settings from the *Arr side. Servarr documents category selection as part of the download client settings, so that wording was corrected.
- The post implied qBittorrent automatically separates categories into subdirectories. qBittorrent only does that when category save paths or path-appending behavior is configured, so the explanation was narrowed accordingly.
- The VPN example for `binhex/arch-qbittorrentvpn` was incomplete for WireGuard. The official README requires `privileged` mode plus `net.ipv4.conf.all.src_valid_mark=1`, so the stack example was corrected to match.
- The VPN example used `/downloads` for the binhex image, while the official image documentation uses `/data`. The stack example was corrected and a note was added so the later path examples are not misapplied to the VPN image.
- The cleanup section suggested deleting torrents/data directly in qBittorrent after seeding. Servarr documents automatic removal through the *Arr download client `Remove` option once seed goals are reached and the torrent is paused, so the cleanup guidance was updated to reflect that workflow.

## Review Notes
- The post is technically relevant and salvageable; no removal concerns were found.
- The LinuxServer example and the VPN example use different internal download paths (`/downloads` vs `/data`). The post now calls this out, but it remains an implementation detail readers need to keep straight when mixing examples.
- The post still uses floating image tags such as `latest`. This is valid, but it means behavior can change over time as the images update.
