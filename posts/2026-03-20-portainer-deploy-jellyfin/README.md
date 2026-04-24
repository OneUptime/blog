# How to Deploy Jellyfin via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Jellyfin, Media Server, Self-Hosted, Streaming

Description: Deploy Jellyfin via Portainer as a completely free and open-source media server with hardware transcoding, no subscription fees, and no external account required.

## Introduction

Jellyfin is the free software alternative to Plex and Emby. It requires no account, has no usage limits, and supports hardware transcoding for Intel, NVIDIA, and AMD GPUs. Deploying via Portainer gives you full control over your media server without any vendor lock-in.

## Deploy as a Stack

```yaml
version: "3.8"

services:
  jellyfin:
    image: jellyfin/jellyfin:latest
    container_name: jellyfin
    # Host networking is only required if you plan to use the DLNA plugin
    network_mode: host
    environment:
      - JELLYFIN_PublishedServerUrl=http://192.168.1.100:8096
    volumes:
      # Jellyfin configuration
      - jellyfin_config:/config
      # Cache directory (media metadata, thumbnails)
      - jellyfin_cache:/cache
      # Media directories (read-only)
      - /mnt/media/movies:/movies:ro
      - /mnt/media/tvshows:/tvshows:ro
      - /mnt/media/music:/music:ro
    # Uncomment for Intel hardware transcoding
    # devices:
    #   - /dev/dri:/dev/dri
    restart: unless-stopped

volumes:
  jellyfin_config:
  jellyfin_cache:
```

## Hardware Transcoding

### Intel Quick Sync

```yaml
services:
  jellyfin:
    devices:
      - /dev/dri/renderD128:/dev/dri/renderD128
      - /dev/dri/card0:/dev/dri/card0
    group_add:
      - "109"   # render group GID (check with: getent group render)
      - "44"    # video group GID (check with: getent group video)
```

In Jellyfin Admin: **Dashboard > Playback**, set **Hardware acceleration** to **Intel QuickSync (QSV)**

### NVIDIA

```yaml
services:
  jellyfin:
    runtime: nvidia
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
```

Install the NVIDIA driver and NVIDIA Container Toolkit on the host first.

In Jellyfin Admin: **Dashboard > Playback**, set **Hardware acceleration** to **NVIDIA NVENC**

## Initial Setup

Access `http://<host>:8096` and complete the setup wizard:

1. Create admin account
2. Set preferred display language
3. Add media libraries (point to `/movies`, `/tvshows`, `/music`)
4. Perform initial media scan

## Jellyfin Libraries

Add libraries in **Dashboard > Libraries > Add Media Library**:

| Type | Path | 
|------|------|
| Movies | `/movies` |
| Shows | `/tvshows` |
| Music | `/music` |

## Transcoding Settings

Navigate to **Dashboard > Playback**:

1. Leave **Transcoding thread count** on auto unless you need to limit CPU usage
2. Enable hardware acceleration
3. Set max simultaneous transcodes based on your hardware capacity

## Jellyfin Plugins

Install plugins via **Dashboard > Plugins > Catalog**. Some third-party plugins may require adding their repository first:

- **Intro Skipper** - Automatically skip TV intros
- **Open Subtitles** - Auto-download subtitles
- **Last.FM** - Music scrobbling
- **Merge Versions** - Combine multiple versions of the same film

## Conclusion

Jellyfin deployed via Portainer provides a completely free, open-source media server without subscriptions, accounts, or usage restrictions. Hardware transcoding support makes it capable of serving multiple simultaneous streams, and the active plugin ecosystem extends its functionality. Unlike Plex, there are no features gated behind a paid tier.
