# How to Deploy qBittorrent via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, qBittorrent, BitTorrent, Downloading, Self-Hosted

Description: Deploy qBittorrent via Portainer with a web UI for remote torrent management, optional VPN kill switch, and proper file permission handling.

## Introduction

qBittorrent is a feature-rich, open-source BitTorrent client with a web UI. When deployed via Portainer, it provides remote torrent management accessible from any browser. Combined with Sonarr and Radarr, it forms the download client in an automated media pipeline.

## Deploy as a Stack

```yaml
services:
  qbittorrent:
    image: lscr.io/linuxserver/qbittorrent:latest
    container_name: qbittorrent
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=America/New_York
      - WEBUI_PORT=8080
      - TORRENTING_PORT=6881
      - DOCKER_MODS=ghcr.io/vuetorrent/vuetorrent-lsio-mod:latest   # Optional: VueTorrent alternate WebUI
    volumes:
      - qbittorrent_config:/config
      # Download directory
      - /mnt/media/downloads:/downloads
    ports:
      - "8080:8080"    # Web UI
      - "6881:6881"    # BitTorrent port
      - "6881:6881/udp"
    restart: unless-stopped

volumes:
  qbittorrent_config:
```

## Initial Access

Navigate to `http://<host>:8080`. Initial credentials:
- Username: `admin`
- Password: temporary password shown in the container logs on first startup (change this immediately!)

## Configuring for *arr Integration

In qBittorrent Web UI:

1. **Options > Web UI**: Change password
2. If using VueTorrent: enable **Use alternative WebUI** and set **Files location** to `/vuetorrent`
3. **Options > Downloads**: Set default save path to `/downloads`
4. **Options > Connection**: Configure listening port (6881 recommended)

For Sonarr/Radarr integration, the download category is important:

- In Sonarr: Set the qBittorrent download client category to `sonarr`
- In Radarr: Set the qBittorrent download client category to `radarr`

If you configure category save paths in qBittorrent, you can separate downloads into folders:
- `sonarr` → `/downloads/tvshows/`
- `radarr` → `/downloads/movies/`

## VPN Kill Switch Configuration

For privacy, use a VPN-enabled image. This example uses PIA with WireGuard:

```yaml
services:
  qbittorrent:
    image: binhex/arch-qbittorrentvpn:latest
    container_name: qbittorrent-vpn
    privileged: true
    sysctls:
      - net.ipv4.conf.all.src_valid_mark=1
    environment:
      - VPN_ENABLED=yes
      - VPN_USER=your_vpn_username
      - VPN_PASS=your_vpn_password
      - VPN_PROV=pia           # Private Internet Access
      - VPN_CLIENT=wireguard
      - LAN_NETWORK=192.168.1.0/24   # Replace with your LAN subnet
      - WEBUI_PORT=8080
      - PUID=1000
      - PGID=1000
    volumes:
      - qbittorrent_config:/config
      - /mnt/media/downloads:/data
      - /etc/localtime:/etc/localtime:ro
    ports:
      - "8080:8080"
      - "58946:58946"
      - "58946:58946/udp"
    restart: unless-stopped
```

## Download Categories and Paths

Configure in qBittorrent:

If you use the VPN image above, replace `/downloads` with `/data` because that image stores download data there.

```text
Default save path: /downloads
Keep incomplete torrents in: /downloads/incomplete

Category save paths:
sonarr  → /downloads/tvshows/
radarr  → /downloads/movies/
```

## Automating Cleanup

After downloads complete and Sonarr/Radarr import them, configure automatic removal:

**Options > BitTorrent > Share Ratio Limiting:**
- Set a seeding ratio limit such as `1.0`
- Configure qBittorrent to pause the torrent when that limit is reached

In Sonarr/Radarr, enable the download client's `Remove` option so completed torrents are deleted after import once the seed goal is reached.

## Conclusion

qBittorrent deployed via Portainer provides reliable, web-accessible torrent downloading for your media automation pipeline. The category system integrates cleanly with Sonarr and Radarr for automatic file management after downloads complete. The optional VPN kill switch integration ensures downloading activity is protected by your VPN.
