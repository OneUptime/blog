# How to Deploy qBittorrent via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, qBittorrent, Docker, Self-Hosting, Download Client, BitTorrent

Description: Learn how to deploy qBittorrent via Portainer using the linuxserver image with a web UI, proper download volume mapping, and VPN-through-container support.

---

qBittorrent is a popular open-source BitTorrent client with a built-in web UI, making it ideal for server deployments. Portainer makes it easy to deploy, configure, and restart qBittorrent without SSH access.

## Prerequisites

- Portainer running
- A download directory on the host

## Compose Stack

```yaml
services:
  qbittorrent:
    image: lscr.io/linuxserver/qbittorrent:latest
    restart: unless-stopped
    ports:
      - "8080:8080"       # Web UI
      - "6881:6881"       # Torrent port (TCP)
      - "6881:6881/udp"   # Torrent port (UDP)
    environment:
      PUID: 1000
      PGID: 1000
      TZ: America/New_York
      WEBUI_PORT: 8080
    volumes:
      - qbittorrent_config:/config
      - /mnt/data/downloads:/downloads  # Map to your downloads directory

volumes:
  qbittorrent_config:
```

## Deploying

1. In Portainer go to **Stacks > Add Stack**.
2. Name it `qbittorrent`.
3. Update volume paths and click **Deploy the stack**.

On first boot, qBittorrent generates a temporary admin password visible in the container logs:

```text
# In Portainer, go to Containers > qbittorrent > Logs and look for:

# The WebUI administrator username is: admin
# The WebUI administrator password is: <temporary-password>
```

Log in at `http://<host>:8080` and immediately change the password under **Tools > Options > Web UI**.

## Configuring Download Categories

Set up categories that match your Sonarr/Radarr folder layout:

1. Right-click in the torrent list and choose **Set Category > New Category**.
2. Create `tv-sonarr` pointing to `/downloads/tv`.
3. Create `movies-radarr` pointing to `/downloads/movies`.

Sonarr and Radarr will automatically assign these categories when adding downloads.

## Connecting to Sonarr/Radarr

In Sonarr or Radarr go to **Settings > Download Clients > Add**:

- **Type**: qBittorrent
- **Host**: `qbittorrent` (service name if on the same Docker network) or host IP
- **Port**: `8080`
- **Category**: `tv-sonarr` or `movies-radarr`

## Monitoring

Use OneUptime to monitor `http://<host>:8080` for HTTP 200. A down qBittorrent instance stops all automated downloads, so alert immediately on any failure.
