# How to Deploy Sonarr via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Sonarr, TV Shows, Media Management, Self-Hosted

Description: Deploy Sonarr via Portainer as an automatic TV show collection manager that monitors RSS feeds and downloads missing episodes via Usenet or BitTorrent.

## Introduction

Sonarr is a PVR for Usenet and BitTorrent users that automatically downloads TV episodes. It monitors RSS feeds, downloads missing episodes, and organizes your library. Deploy it via Portainer as part of your complete media automation stack.

## Deploy as a Stack

```yaml
services:
  sonarr:
    image: lscr.io/linuxserver/sonarr:latest
    container_name: sonarr
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=America/New_York
    volumes:
      # Sonarr configuration
      - sonarr_config:/config
      # TV show media library
      - /mnt/media/tvshows:/tvshows
      # Download directory (shared with download clients)
      - /mnt/media/downloads:/downloads
    ports:
      - "8989:8989"
    restart: unless-stopped

volumes:
  sonarr_config:
```

## Complete Media Stack with Sonarr

Deploy as part of the full *arr stack:

```yaml
services:
  sonarr:
    image: lscr.io/linuxserver/sonarr:latest
    container_name: sonarr
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=America/New_York
    volumes:
      - sonarr_config:/config
      - /mnt/media/tvshows:/tvshows
      - /mnt/media/downloads:/downloads
    ports:
      - "8989:8989"
    restart: unless-stopped

  radarr:
    image: lscr.io/linuxserver/radarr:latest
    container_name: radarr
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=America/New_York
    volumes:
      - radarr_config:/config
      - /mnt/media/movies:/movies
      - /mnt/media/downloads:/downloads
    ports:
      - "7878:7878"
    restart: unless-stopped

  prowlarr:
    image: lscr.io/linuxserver/prowlarr:latest
    container_name: prowlarr
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=America/New_York
    volumes:
      - prowlarr_config:/config
    ports:
      - "9696:9696"
    restart: unless-stopped

  qbittorrent:
    image: lscr.io/linuxserver/qbittorrent:latest
    container_name: qbittorrent
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=America/New_York
      - WEBUI_PORT=8080
      - TORRENTING_PORT=6881
    volumes:
      - qbittorrent_config:/config
      - /mnt/media/downloads:/downloads
    ports:
      - "8080:8080"
      - "6881:6881"
      - "6881:6881/udp"
    restart: unless-stopped

volumes:
  sonarr_config:
  radarr_config:
  prowlarr_config:
  qbittorrent_config:
```

## Configuring Sonarr

### Add Download Client (qBittorrent)

1. Navigate to **Settings > Download Clients > Add**
2. Select **qBittorrent**
3. Host: `qbittorrent` (service name), Port: `8080`
4. Category: `sonarr`

### Add Indexers via Prowlarr

1. Set up indexers in Prowlarr first
2. In Prowlarr: **Settings > Apps > Add > Sonarr**
3. Prowlarr automatically syncs indexers to Sonarr

### Add Root Folder

1. **Settings > Media Management > Root Folders**
2. Add: `/tvshows`

### Add Shows

1. Click **Add New Show** and search for a TV series
2. Set quality profile and root folder
3. Click **Add Series**

Sonarr will automatically monitor and download new episodes.

## Conclusion

Sonarr deployed via Portainer automates TV show collection management. Combined with Prowlarr for indexer management, Radarr for movies, and qBittorrent for downloads, you have a complete automated media pipeline. Portainer's stack management makes deploying and updating this entire suite straightforward.
