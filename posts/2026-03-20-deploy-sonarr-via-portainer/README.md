# How to Deploy Sonarr via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Sonarr, Media Management, Docker, Self-Hosting, Automation

Description: Learn how to deploy Sonarr, the automated TV show download manager, via Portainer with proper volume mapping for media and download directories.

---

Sonarr monitors RSS feeds and automatically downloads new TV episodes via your download client (qBittorrent, Transmission, etc.). It renames and organizes files into your media library automatically. Portainer simplifies management of the Sonarr container.

## Prerequisites

- Portainer running
- A download client already deployed (qBittorrent or Transmission recommended)
- A media directory for finished TV shows

## Compose Stack

The key to a working Sonarr setup is mounting a single common parent path in both Sonarr and your download client so Sonarr can perform hardlink moves without copying:

```yaml
version: "3.8"

services:
  sonarr:
    image: lscr.io/linuxserver/sonarr:latest
    restart: unless-stopped
    ports:
      - "8989:8989"
    environment:
      PUID: 1000    # Match to host user that owns media files
      PGID: 1000
      TZ: America/New_York
    volumes:
      - sonarr_config:/config
      # Mount the common parent path here and in your download client container
      - /mnt/data:/data

volumes:
  sonarr_config:
```

## Deploying

1. In Portainer go to **Stacks > Add Stack**.
2. Name it `sonarr`.
3. Update `PUID`/`PGID` and volume paths to match your setup.
4. Click **Deploy the stack**.

Open `http://<host>:8989` to access the Sonarr UI.

## Connecting a Download Client

In Sonarr go to **Settings > Download Clients > Add**:

- Select qBittorrent or Transmission
- Set **Host** to the download client's service or container name (e.g., `qbittorrent`) if both containers are attached to the same Docker network
- Make sure the download client also mounts `/mnt/data:/data` so Sonarr sees completed downloads at the same container path
- Set **Port** to the download client's API port
- Enter credentials and test the connection

## Adding Your First Series

1. Go to **Series > Add New**.
2. Search for a show name.
3. Set the root folder to `/data/media/tv`.
4. Choose a quality profile, enable **Start search for missing episodes** if desired, and click **Add Series**.

If you enable **Start search for missing episodes**, Sonarr will immediately search for missing episodes. Otherwise it will monitor future releases via RSS.

## Monitoring

Use OneUptime to monitor `http://<host>:8989/ping` for basic availability. If you also want Sonarr health warnings, monitor `http://<host>:8989/api/v3/health` and include the `X-Api-Key` header from Sonarr's settings. The `/api/v3/health` endpoint returns the current health warnings as JSON.
