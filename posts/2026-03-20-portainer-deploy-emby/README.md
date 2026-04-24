# How to Deploy Emby via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Emby, Media Server, Self-Hosted, Streaming

Description: Deploy Emby Media Server via Portainer for a polished media streaming experience with a clean interface, live TV support, and optional Emby Premiere features.

## Introduction

Emby is a media server that sits between Plex and Jellyfin in terms of open-source-ness. The server is source-available and free to use, with an optional Emby Premiere subscription for advanced features. Deploying via Portainer provides easy management and updates.

## Deploy as a Stack

```yaml
services:
  emby:
    image: emby/embyserver:latest
    container_name: emby
    network_mode: host   # Easiest way to enable DLNA and network discovery
    environment:
      UID: "<your_uid>"
      GID: "<your_gid>"
      GIDLIST: "<gid1>,<gid2>"    # Replace with any additional host group IDs Emby needs
    volumes:
      # Emby configuration and database
      - emby_config:/config
      # Media directories
      - /mnt/media/movies:/movies:ro
      - /mnt/media/tvshows:/tvshows:ro
      - /mnt/media/music:/music:ro
    # Uncomment for Intel hardware transcoding
    # devices:
    #   - /dev/dri:/dev/dri
    restart: unless-stopped

volumes:
  emby_config:
```

Replace `UID`, `GID`, and `GIDLIST` with the IDs from your host system.

## Access and Setup

Navigate to `http://<host>:8096` and complete the setup wizard.

## Hardware Transcoding

### Intel iGPU

```yaml
services:
  emby:
    devices:
      - /dev/dri:/dev/dri
    environment:
      GIDLIST: "<video_gid>,<render_gid>"   # Replace with your actual host group IDs
```

Enable in Emby from the server dashboard under **Transcoding**, then select **Intel QuickSync Video**.

### NVIDIA

```yaml
services:
  emby:
    runtime: nvidia
    environment:
      NVIDIA_VISIBLE_DEVICES: all
      NVIDIA_DRIVER_CAPABILITIES: compute,video,utility
```

This requires the NVIDIA Container Toolkit (or the legacy NVIDIA Docker runtime) on the host.

## Emby Premiere Features

With Emby Premiere subscription:
- Hardware accelerated transcoding
- Offline media (downloads & sync)
- Cover Art plugin
- Themes for supported clients

Configure at **Emby Premiere** in the server dashboard.

## Live TV with HDHomeRun

```yaml
services:
  emby:
    # HDHomeRun is usually discovered automatically on the local network
    network_mode: host
```

In Emby (with an Emby Premiere subscription): **Live TV > Add TV Source > HDHomeRun**

## Emby with Traefik

```yaml
services:
  emby:
    network_mode: bridge  # Simpler if Traefik is discovering Docker containers by labels
    ports:
      - "8096:8096"
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.emby.rule=Host(`media.example.com`)"
      - "traefik.http.routers.emby.entrypoints=websecure"
      - "traefik.http.routers.emby.tls.certresolver=letsencrypt"
      - "traefik.http.services.emby.loadbalancer.server.port=8096"
```

Make sure Emby is attached to a Docker network that Traefik can reach.

Note: Bridge mode can require extra configuration for DLNA discovery. Host mode remains the easiest option for DLNA and Wake-on-LAN.

## Conclusion

Emby deployed via Portainer provides a polished media streaming experience with a user-friendly interface. Its Live TV integration and Premiere features appeal to users who want a more managed experience than Jellyfin provides. The official Emby image offers UID, GID, and GIDLIST controls for file permissions and device access.
