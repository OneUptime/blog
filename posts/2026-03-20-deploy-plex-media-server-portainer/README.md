# How to Deploy Plex Media Server via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Plex, Media Server, Docker, Self-Hosting, Streaming, DLNA

Description: Learn how to deploy Plex Media Server via Portainer with media library volume mounts, hardware transcoding support, and initial claim token setup.

---

Plex is the most popular self-hosted media streaming platform. It organizes your movies, TV shows, and music and streams them to any device. Deploying via Portainer makes it easy to manage and update the server container.

## Prerequisites

- Portainer running
- A Plex account (free) for the claim token
- Media files on the host in a known directory

## Getting a Plex Claim Token

Before deploying, get a one-time claim token to link the server to your account:

1. Log in at `https://plex.tv/claim`.
2. Copy the token and use it promptly, since claim tokens are temporary.

## Compose Stack

Mount your media directories as read-only volumes. Plex needs write access to its data directory for thumbnails and databases:

```yaml
services:
  plex:
    image: plexinc/pms-docker:latest
    restart: unless-stopped
    network_mode: host    # Simplifies client discovery (GDM uses UDP broadcast)
    environment:
      TZ: America/New_York
      PLEX_CLAIM: claim-xxxxxxxxxxxxxxxxxxxx   # Paste your claim token here
      PLEX_UID: 1000
      PLEX_GID: 1000
    volumes:
      - plex_config:/config
      - plex_transcode:/transcode              # Temp transcoding directory
      - /mnt/media/movies:/data/movies:ro      # Mount movies as read-only
      - /mnt/media/tv:/data/tv:ro             # Mount TV shows as read-only
      - /mnt/media/music:/data/music:ro       # Mount music as read-only

volumes:
  plex_config:
  plex_transcode:
```

## Hardware Transcoding (Optional)

If your host has an Intel GPU, pass it through for hardware-accelerated transcoding (requires Plex Pass):

```yaml
devices:
  - /dev/dri:/dev/dri    # Intel Quick Sync / VAAPI
```

## Accessing Plex

With host networking, Plex is at `http://<host-ip>:32400/web`. On first load, if the claim token was valid, your server will already be linked to your account.

## Monitoring

Use OneUptime to monitor `http://<host>:32400/identity`. Plex returns identity information including the machine identifier when healthy. A non-200 response indicates the server is down. Alert immediately since media streaming failures are very visible to household users.
