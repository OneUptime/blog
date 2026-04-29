# How to Self-Host a Media Server Stack with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Self-Hosted, Media Server, Jellyfin, Home Lab

Description: Deploy a complete self-hosted media server stack including Jellyfin, Sonarr, Radarr, and more using Portainer.

## Introduction

A self-hosted media server lets you stream your own movies, TV shows, and music to any device. This guide covers deploying a full media stack - Jellyfin for streaming, Sonarr/Radarr for automation, Prowlarr for indexers, and qBittorrent for downloads - all managed through Portainer.

## Prerequisites

- Portainer installed and running
- Sufficient storage (media library can be several TBs)
- Basic understanding of Docker networks

## Architecture Overview

```text
Users → Jellyseerr (Requests)
                ↓
         Radarr/Sonarr (Automation)
                ↓
         Prowlarr (Indexers)
                ↓
        qBittorrent (Downloads)
                ↓
         Jellyfin (Streaming) → Users
```

## Step 1: Create Directory Structure

```bash
# Create media directories on your host

sudo mkdir -p /opt/media/{movies,tv,music,downloads/{complete,incomplete}} /opt/jellyseerr

# Set proper permissions
sudo chown -R 1000:1000 /opt/media /opt/jellyseerr
sudo chmod -R 755 /opt/media /opt/jellyseerr
```

## Step 2: Create the Media Stack in Portainer

In Portainer, go to **Stacks** > **Add stack** and use the following compose file:

```yaml
# docker-compose.yml - Complete Media Server Stack
networks:
  media_network:
    driver: bridge

volumes:
  jellyfin_config:
  sonarr_config:
  radarr_config:
  prowlarr_config:
  qbittorrent_config:

services:
  # Jellyfin - Media streaming server
  jellyfin:
    image: jellyfin/jellyfin:latest
    container_name: jellyfin
    restart: unless-stopped
    ports:
      - "8096:8096"   # HTTP
      - "8920:8920"   # Optional HTTPS if enabled and configured in Jellyfin
    user: "1000:1000"
    environment:
      - TZ=America/New_York
    volumes:
      - jellyfin_config:/config
      - /opt/media/movies:/media/movies    # Movie library
      - /opt/media/tv:/media/tv            # TV show library
      - /opt/media/music:/media/music      # Music library
    # Uncomment for Intel/AMD hardware transcoding on Linux
    # group_add:
    #   - "<render_gid>"
    # devices:
    #   - /dev/dri:/dev/dri
    networks:
      - media_network

  # Sonarr - TV show management
  sonarr:
    image: lscr.io/linuxserver/sonarr:latest
    container_name: sonarr
    restart: unless-stopped
    ports:
      - "8989:8989"
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=America/New_York
    volumes:
      - sonarr_config:/config
      - /opt/media/tv:/tv                          # TV destination
      - /opt/media/downloads/complete:/downloads   # Download source
    networks:
      - media_network

  # Radarr - Movie management
  radarr:
    image: lscr.io/linuxserver/radarr:latest
    container_name: radarr
    restart: unless-stopped
    ports:
      - "7878:7878"
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=America/New_York
    volumes:
      - radarr_config:/config
      - /opt/media/movies:/movies                  # Movie destination
      - /opt/media/downloads/complete:/downloads   # Download source
    networks:
      - media_network

  # Prowlarr - Indexer manager
  prowlarr:
    image: lscr.io/linuxserver/prowlarr:latest
    container_name: prowlarr
    restart: unless-stopped
    ports:
      - "9696:9696"
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=America/New_York
    volumes:
      - prowlarr_config:/config
    networks:
      - media_network

  # qBittorrent - Download client
  qbittorrent:
    image: lscr.io/linuxserver/qbittorrent:latest
    container_name: qbittorrent
    restart: unless-stopped
    ports:
      - "8080:8080"   # WebUI
      - "6881:6881"   # BitTorrent port
      - "6881:6881/udp"
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=America/New_York
      - WEBUI_PORT=8080
    volumes:
      - qbittorrent_config:/config
      - /opt/media/downloads:/downloads   # Set completed to /downloads/complete and incomplete to /downloads/incomplete
    networks:
      - media_network

  # Jellyseerr - Request management for Jellyfin
  jellyseerr:
    image: fallenbagel/jellyseerr:latest
    container_name: jellyseerr
    restart: unless-stopped
    ports:
      - "5055:5055"
    environment:
      - TZ=America/New_York
    volumes:
      - /opt/jellyseerr:/app/config
    networks:
      - media_network
```

## Step 3: Configure Hardware Transcoding (Optional)

For Intel Quick Sync or NVIDIA GPU transcoding:

```yaml
# Add to jellyfin service for Intel iGPU
group_add:
  - "<render_gid>"  # Replace with: getent group render | cut -d: -f3
devices:
  - /dev/dri:/dev/dri

# For NVIDIA, use nvidia-container-toolkit
deploy:
  resources:
    reservations:
      devices:
        - driver: nvidia
          count: 1
          capabilities: [gpu]
```

## Step 4: Post-Deployment Configuration

### Configure Prowlarr
1. Access Prowlarr at `http://server-ip:9696`
2. Add indexers under **Indexers** > **Add Indexer**
3. Under **Settings** > **Apps**, add Sonarr and Radarr with their API keys

### Configure Sonarr/Radarr
1. In qBittorrent, set the completed downloads path to `/downloads/complete` and the incomplete path to `/downloads/incomplete`
2. Go to **Settings** > **Download Clients**
3. Add qBittorrent: Host = `qbittorrent`, Port = `8080`
4. Set root folders to `/tv` or `/movies`

### Configure Jellyfin
1. Access at `http://server-ip:8096`
2. Complete the setup wizard
3. Add media libraries pointing to `/media/movies`, `/media/tv`, `/media/music`

## Step 5: Set Up Reverse Proxy with Traefik Labels

```yaml
# Add labels to jellyfin service for Traefik routing
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.jellyfin.rule=Host(`jellyfin.yourdomain.com`)"
  - "traefik.http.routers.jellyfin.entrypoints=websecure"
  - "traefik.http.routers.jellyfin.tls=true"
  - "traefik.http.services.jellyfin.loadbalancer.server.port=8096"
```

## Monitoring Your Media Stack

```bash
# Check all media stack containers
docker ps --filter "network=<stack-name>_media_network"

# View Jellyfin logs
docker logs -f jellyfin

# Check disk usage
df -h /opt/media
```

## Conclusion

You now have a fully automated media server running in Docker containers managed through Portainer. The stack automatically discovers, downloads, and organizes your media library. Portainer makes it easy to update containers, view logs, and manage the entire stack through a clean web interface. Start by configuring Prowlarr indexers, then set up Sonarr/Radarr to begin automating your media collection.
