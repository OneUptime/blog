# How to Use Podman for Media Streaming

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Media Streaming, Jellyfin, Plex, Container

Description: Learn how to deploy self-hosted media streaming services like Jellyfin, Plex, and Navidrome using Podman containers for managing and streaming your personal media library.

---

> Podman lets you build a personal media streaming platform using containerized services like Jellyfin and Navidrome, keeping your media library under your control without subscription fees.

Self-hosted media streaming gives you a personal Netflix-like experience for your own movie, TV show, and music collections. Instead of relying on commercial streaming services, you can organize and stream your media from anywhere using Podman containers.

This guide covers deploying popular media streaming solutions with Podman, including video streaming with Jellyfin and Plex, music streaming with Navidrome, and supporting services for media management.

---

## Why Podman for Media Streaming

Media servers benefit from container isolation because they need access to large media libraries while remaining separate from the host system. Podman lets you mount your media directories read-only into containers, so the streaming software can access files without being able to modify or delete them. Hardware transcoding can be passed through to containers for efficient media conversion.

## Deploying Jellyfin

Jellyfin is a free, open-source media server with no subscription requirements:

```bash
podman run -d \
  --name jellyfin \
  -p 8096:8096 \
  -p 8920:8920 \
  -v jellyfin-config:/config:Z \
  -v jellyfin-cache:/cache:Z \
  -v /srv/media/movies:/media/movies:ro,Z \
  -v /srv/media/tvshows:/media/tvshows:ro,Z \
  -v /srv/media/music:/media/music:ro,Z \
  docker.io/jellyfin/jellyfin:latest
```

Access Jellyfin at `http://localhost:8096` and run through the setup wizard to configure your media libraries.

## Jellyfin with Hardware Transcoding

For Intel Quick Sync hardware transcoding, pass the GPU device to the container:

```bash
podman run -d \
  --name jellyfin \
  -p 8096:8096 \
  --device=/dev/dri:/dev/dri \
  --group-add keep-groups \
  -v jellyfin-config:/config:Z \
  -v jellyfin-cache:/cache:Z \
  -v /srv/media:/media:ro,Z \
  docker.io/jellyfin/jellyfin:latest
```

On SELinux systems with newer `container-selinux` releases, run `sudo setsebool -P container_use_dri_devices 1` so the container can access `/dev/dri`.

For NVIDIA GPU transcoding, first install the NVIDIA container toolkit and generate a CDI specification for Podman, then pass the GPU device to the container:

```bash
podman run -d \
  --name jellyfin \
  -p 8096:8096 \
  --device=nvidia.com/gpu=0 \
  -v jellyfin-config:/config:Z \
  -v jellyfin-cache:/cache:Z \
  -v /srv/media:/media:ro,Z \
  docker.io/jellyfin/jellyfin:latest
```

On older `container-selinux` releases, add `--security-opt=label=disable`.

## Deploying Plex Media Server

Plex offers a polished interface and wide client support:

```bash
podman run -d \
  --name plex \
  --network host \
  -e TZ=America/New_York \
  -e PLEX_CLAIM=claim-your-token-here \
  -v plex-config:/config:Z \
  -v plex-transcode:/transcode:Z \
  -v /srv/media/movies:/data/movies:ro,Z \
  -v /srv/media/tvshows:/data/tvshows:ro,Z \
  docker.io/plexinc/pms-docker:latest
```

Get your claim token from the Plex website and replace `claim-your-token-here`. Access Plex at `http://localhost:32400/web`.

## Music Streaming with Navidrome

Navidrome provides a Spotify-like experience for your music collection:

```bash
podman run -d \
  --name navidrome \
  -p 4533:4533 \
  -e ND_SCANNER_SCHEDULE="@every 1h" \
  -e ND_LOGLEVEL=info \
  -e ND_SESSIONTIMEOUT=24h \
  -v navidrome-data:/data:Z \
  -v /srv/media/music:/music:ro,Z \
  docker.io/deluan/navidrome:latest
```

Access Navidrome at `http://localhost:4533`. It works with Subsonic-compatible clients on mobile devices.

## Photo Management with Immich

Self-host a Google Photos alternative:

Immich officially recommends using its current release-provided Docker Compose stack for production deployments. The service layout and image names change over time, so use the latest `docker-compose.yml` and `.env` from the Immich release and adapt them to Podman Compose or Quadlets if you want to run Immich under Podman.

## Audiobook Server with Audiobookshelf

Stream audiobooks and podcasts:

```bash
podman run -d \
  --name audiobookshelf \
  -p 13378:80 \
  -v /srv/media/audiobooks:/audiobooks:ro,Z \
  -v /srv/media/podcasts:/podcasts:Z \
  -v audiobookshelf-config:/config:Z \
  -v audiobookshelf-metadata:/metadata:Z \
  ghcr.io/advplyr/audiobookshelf:latest
```

## Media Organization with File Structure

Organize your media library for optimal scanner detection:

```bash
# Recommended directory structure

/srv/media/
  movies/
    Movie Name (2024)/
      Movie Name (2024).mkv
  tvshows/
    Show Name/
      Season 01/
        Show Name - S01E01 - Episode Title.mkv
  music/
    Artist Name/
      Album Name (2024)/
        01 - Track Title.flac
  audiobooks/
    Author Name/
      Book Title/
        Chapter 01.mp3
  photos/
    2024/
      2024-01/
        photo_001.jpg
```

## Automated Media Downloads

Use Radarr and Sonarr for automated media management:

```bash
podman network create media

# Radarr for movies
podman run -d \
  --name radarr \
  --network media \
  -p 7878:7878 \
  -e PUID=1000 \
  -e PGID=1000 \
  -v radarr-config:/config:Z \
  -v /srv/media/movies:/movies:Z \
  -v /srv/downloads:/downloads:Z \
  lscr.io/linuxserver/radarr:latest

# Sonarr for TV shows
podman run -d \
  --name sonarr \
  --network media \
  -p 8989:8989 \
  -e PUID=1000 \
  -e PGID=1000 \
  -v sonarr-config:/config:Z \
  -v /srv/media/tvshows:/tv:Z \
  -v /srv/downloads:/downloads:Z \
  lscr.io/linuxserver/sonarr:latest
```

## Monitoring Media Server Health

Create a health check script for your media stack:

```bash
#!/bin/bash
# media-health.sh

check_service() {
  local name=$1
  local url=$2
  local status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  if [ "$status" -ge 200 ] && [ "$status" -lt 400 ]; then
    echo "$name: OK (HTTP $status)"
  else
    echo "$name: FAILED (HTTP $status)"
  fi
}

check_service "Jellyfin" "http://localhost:8096/health"
check_service "Navidrome" "http://localhost:4533/"
check_service "Audiobookshelf" "http://localhost:13378/"
check_service "Radarr" "http://localhost:7878/"
check_service "Sonarr" "http://localhost:8989/"

echo ""
echo "=== Resource Usage ==="
podman stats --no-stream --format \
  "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" \
  jellyfin navidrome audiobookshelf 2>/dev/null
```

## Running as systemd Services

```ini
# ~/.config/containers/systemd/jellyfin.container
[Container]
Image=docker.io/jellyfin/jellyfin:latest
PublishPort=8096:8096
Volume=jellyfin-config:/config:Z
Volume=jellyfin-cache:/cache:Z
Volume=/srv/media:/media:ro,Z
AutoUpdate=registry

[Service]
Restart=always
TimeoutStartSec=60

[Install]
WantedBy=default.target
```

## Conclusion

Podman provides a secure and efficient platform for self-hosted media streaming. By running Jellyfin, Navidrome, and supporting services in containers, you get a complete media ecosystem that rivals commercial streaming services. Hardware transcoding support, persistent configuration, and systemd integration make these deployments production-ready for personal or family use.
