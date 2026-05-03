# How to Deploy Jellyfin via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Jellyfin, Media Server, Docker, Self-Hosting, Streaming, Open Source

Description: Learn how to deploy Jellyfin, the free and open-source media server, via Portainer with hardware transcoding support and media library configuration.

---

Jellyfin is a fully open-source alternative to Plex and Emby with no subscription required for any features. It supports hardware transcoding, live TV, and a wide range of client apps. Portainer simplifies container management.

## Prerequisites

- Portainer running
- Media files on the host
- At least 1GB RAM (more for transcoding)

## Compose Stack

```yaml
version: "3.8"

services:
  jellyfin:
    image: jellyfin/jellyfin:latest
    restart: unless-stopped
    ports:
      - "8096:8096"      # HTTP web interface
      - "8920:8920"      # HTTPS (optional)
    environment:
      JELLYFIN_PublishedServerUrl: http://jellyfin.example.com
    volumes:
      - jellyfin_config:/config
      - jellyfin_cache:/cache             # Metadata and image cache
      - /mnt/media/movies:/media/movies:ro
      - /mnt/media/tv:/media/tv:ro
      - /mnt/media/music:/media/music:ro
    # Optional: Intel GPU for hardware transcoding
    # devices:
    #   - /dev/dri:/dev/dri

volumes:
  jellyfin_config:
  jellyfin_cache:
```

## Deploying

1. In Portainer go to **Stacks > Add Stack**.
2. Name it `jellyfin`.
3. Update media paths to match your host directory layout.
4. Click **Deploy the stack**.

Open `http://<host>:8096` and complete the setup wizard. Add your media libraries pointing to `/media/movies`, `/media/tv`, and `/media/music`.

## Hardware Transcoding

For Intel GPU hardware transcoding (VAAPI), uncomment the `devices` section and:

1. In Jellyfin go to **Dashboard > Playback**.
2. Set **Hardware acceleration** to **VAAPI**.
3. Set **VA-API Device** to `/dev/dri/renderD128`.

For Nvidia GPUs, use the `nvidia` runtime tag and pass in the GPU device.

## User Management

Jellyfin has no mandatory account link. Create local users under **Dashboard > Users**. Set up libraries per-user for parental controls or multi-user households.

## Monitoring

Use OneUptime to monitor `http://<host>:8096/health`. Jellyfin returns the plain text `Healthy` with HTTP 200 when operating normally. Alert on any unhealthy status to catch database corruption or storage issues early.
