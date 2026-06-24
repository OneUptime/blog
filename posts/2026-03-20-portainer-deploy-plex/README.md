# How to Deploy Plex Media Server via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Plex, Media Server, Self-Hosted, Streaming

Description: Deploy Plex Media Server via Portainer with access to your local media library, optional hardware transcoding, and remote access for streaming anywhere.

## Introduction

Plex Media Server organizes and streams your personal media library - movies, TV shows, music, and photos - to any device. Deploying via Portainer gives you easy updates and clear volume management for your media directories.

## Deploy as a Stack

```yaml
services:
  plex:
    image: plexinc/pms-docker:latest
    container_name: plex
    network_mode: host   # Recommended for simpler local network discovery (GDM)
    environment:
      TZ: America/New_York
      # Get claim token from https://www.plex.tv/claim
      PLEX_CLAIM: "claim-xxxxxxxxxxxxxxxxxxxx"
    volumes:
      # Plex configuration and database
      - plex_config:/config
      # Transcode temp directory
      - plex_transcode:/transcode
      # Media directories (bind mount to your actual media)
      - /mnt/media/movies:/movies:ro
      - /mnt/media/tvshows:/tvshows:ro
      - /mnt/media/music:/music:ro
      - /mnt/media/photos:/photos:ro
    restart: unless-stopped

volumes:
  plex_config:
  plex_transcode:
```

## Getting a Claim Token

1. Go to `https://www.plex.tv/claim` while logged in to your Plex account
2. Copy the claim token
3. Set it as `PLEX_CLAIM` in the environment

## Hardware Transcoding

For Intel Quick Sync or NVIDIA GPU transcoding:

### Intel (iGPU)

```yaml
services:
  plex:
    devices:
      - /dev/dri:/dev/dri   # Intel hardware transcoding
    environment:
      - PLEX_CLAIM=claim-xxxx
```

### NVIDIA GPU

```yaml
services:
  plex:
    runtime: nvidia   # Requires NVIDIA Container Toolkit on the host
    environment:
      - NVIDIA_VISIBLE_DEVICES=all
      - NVIDIA_DRIVER_CAPABILITIES=compute,video,utility
      - PLEX_CLAIM=claim-xxxx
```

## Accessing Plex

- Local: `http://<host>:32400/web`
- Enable remote access in **Settings > Remote Access**. Remote video streaming requires Plex Pass or Remote Watch Pass unless the server owner has Plex Pass.

## Optimizing Plex Performance

For better transcode performance, use a tmpfs mount for `/transcode`:

```yaml
services:
  plex:
    volumes:
      - type: tmpfs
        target: /transcode
        tmpfs:
          size: 4294967296  # 4 GiB RAM for transcoding
```

## Plex Pass Features

With Plex Pass, you can enable:
- Hardware transcoding (via **Settings > Server > Transcoder**)
- Live TV & DVR
- Downloads

## Conclusion

Plex Media Server deployed via Portainer provides a polished media streaming experience for your entire media library. Host network mode simplifies Plex discovery protocols on your local network. Persistent volumes separate configuration from media, making it safe to update Plex without risking your library metadata or settings.
