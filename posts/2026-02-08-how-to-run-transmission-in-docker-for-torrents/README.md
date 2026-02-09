# How to Run Transmission in Docker for Torrents

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, transmission, torrent, bittorrent, self-hosted, download-manager

Description: Deploy the Transmission BitTorrent client in Docker with a web interface for managing torrent downloads on a headless server.

---

Transmission is a lightweight, open-source BitTorrent client known for its simplicity and low resource usage. It includes a clean web interface that makes it perfect for running on a headless server. Docker deployment isolates the torrent client from your host system and makes it easy to manage networking, storage, and configuration.

## Why Transmission?

There are many torrent clients available, but Transmission stands out for headless server use. It uses very little CPU and memory compared to alternatives like qBittorrent or Deluge. The web UI is responsive and covers all essential functions without bloat. The RPC API enables automation through scripts and third-party tools. For a server that runs 24/7, these efficiency gains matter.

## Prerequisites

- A Linux server with Docker and Docker Compose installed
- At least 512 MB of RAM
- Storage space for downloaded files
- Network connectivity with the BitTorrent port accessible (or configurable)

## Project Setup

```bash
# Create the Transmission project directory
mkdir -p ~/transmission/{config,downloads,watch}
cd ~/transmission
```

The directories serve different purposes:

- `config` - Stores Transmission settings and session data
- `downloads` - Where completed and in-progress downloads are stored
- `watch` - Drop .torrent files here and Transmission picks them up automatically

## Docker Compose Configuration

```yaml
# docker-compose.yml - Transmission BitTorrent Client
version: "3.8"

services:
  transmission:
    image: lscr.io/linuxserver/transmission:latest
    container_name: transmission
    restart: unless-stopped
    ports:
      # Web UI
      - "9091:9091"
      # BitTorrent peer port (TCP and UDP)
      - "51413:51413"
      - "51413:51413/udp"
    environment:
      # User and group IDs for file permissions
      - PUID=1000
      - PGID=1000
      - TZ=America/New_York
      # Web UI credentials
      - USER=admin
      - PASS=change_this_password
      # Optional: customize the web UI theme
      # - TRANSMISSION_WEB_HOME=/config/flood-for-transmission/
    volumes:
      # Transmission configuration
      - ./config:/config
      # Download directory
      - ./downloads:/downloads
      # Watch directory for auto-adding .torrent files
      - ./watch:/watch
```

## Starting Transmission

```bash
# Start Transmission in detached mode
docker compose up -d
```

Check the logs:

```bash
# Verify Transmission started without errors
docker compose logs -f transmission
```

Open `http://<your-server-ip>:9091` in your browser. Enter the username and password you set in the environment variables.

## Web Interface Overview

The Transmission web UI shows:

- Active, paused, and completed torrents
- Download and upload speeds
- Individual torrent details including peers, trackers, and file lists
- Global speed limits and ratio settings

Add torrents by clicking the folder icon (upload .torrent file) or the chain icon (paste a magnet link).

## Configuring Settings

Transmission stores its settings in `settings.json` inside the config directory. Stop the container before editing this file, because Transmission overwrites it on shutdown:

```bash
# Stop the container before editing settings
docker compose stop transmission
```

Key settings to adjust:

```json
{
    "alt-speed-down": 2000,
    "alt-speed-enabled": false,
    "alt-speed-time-begin": 540,
    "alt-speed-time-day": 127,
    "alt-speed-time-enabled": true,
    "alt-speed-time-end": 1020,
    "alt-speed-up": 500,
    "download-dir": "/downloads/complete",
    "incomplete-dir": "/downloads/incomplete",
    "incomplete-dir-enabled": true,
    "peer-port": 51413,
    "ratio-limit": 2.0,
    "ratio-limit-enabled": true,
    "speed-limit-down": 10000,
    "speed-limit-down-enabled": false,
    "speed-limit-up": 5000,
    "speed-limit-up-enabled": true,
    "watch-dir": "/watch",
    "watch-dir-enabled": true
}
```

The alt-speed settings enable a "turtle mode" that reduces speeds during specific hours. The example above throttles speeds between 9 AM (540 minutes) and 5 PM (1020 minutes) on all days.

Start the container again after editing:

```bash
# Start Transmission with updated settings
docker compose up -d transmission
```

## Download Organization

Separate incomplete and complete downloads to keep things tidy:

```bash
# Create subdirectories for organization
mkdir -p ~/transmission/downloads/{complete,incomplete}
mkdir -p ~/transmission/downloads/complete/{movies,tv,music,other}
```

Configure category-based download paths through the Transmission settings or use automation tools like Sonarr and Radarr to manage file organization.

## Port Forwarding

For optimal performance, the BitTorrent peer port (51413 by default) should be accessible from the internet. Configure port forwarding on your router:

1. Log into your router's admin panel
2. Forward TCP and UDP port 51413 to your Docker host's local IP
3. Verify the port is open using an online port checker

Without port forwarding, Transmission still works but may connect to fewer peers and download slower.

Test if the port is accessible:

```bash
# Check if the peer port is open (run from an external network)
nc -zv your-public-ip 51413
```

## Using the RPC API

Transmission's RPC API enables programmatic control. Here are common operations:

```bash
# Add a torrent via magnet link
curl -u admin:your_password \
  http://localhost:9091/transmission/rpc \
  -H "X-Transmission-Session-Id: $(curl -s -u admin:your_password http://localhost:9091/transmission/rpc | grep -oP 'X-Transmission-Session-Id: \K[^<]+')" \
  -d '{"method":"torrent-add","arguments":{"filename":"magnet:?xt=urn:btih:HASH"}}'

# List all torrents
transmission-remote localhost:9091 -n admin:your_password -l

# Set global download speed limit to 5 MB/s
transmission-remote localhost:9091 -n admin:your_password -d 5000

# Remove a completed torrent (keep files)
transmission-remote localhost:9091 -n admin:your_password -t 1 -r
```

Install the `transmission-remote` CLI tool for easier API interaction:

```bash
# Install the Transmission CLI tools
sudo apt install transmission-cli
```

## Alternative Web UIs

Transmission supports alternative web interfaces. Flood for Transmission is a popular modern UI:

```bash
# Download and install the Flood UI
mkdir -p ~/transmission/config/flood-for-transmission
wget -qO- https://github.com/johman10/flood-for-transmission/releases/latest/download/flood-for-transmission.tar.gz | \
  tar xz -C ~/transmission/config/flood-for-transmission/
```

Then uncomment the `TRANSMISSION_WEB_HOME` line in your docker-compose.yml and restart.

## Automation with Watch Directory

The watch directory automatically adds any .torrent file placed in it. This enables automation workflows:

```bash
# Example: download a torrent file to the watch directory
wget -O ~/transmission/watch/example.torrent "https://example.com/file.torrent"
```

Scripts, RSS readers, or other tools can drop .torrent files into this directory, and Transmission will start downloading them automatically.

## Speed Scheduling

Configure speed limits that change throughout the day. This is useful if you share bandwidth with other users:

```json
{
    "alt-speed-enabled": false,
    "alt-speed-down": 1000,
    "alt-speed-up": 200,
    "alt-speed-time-enabled": true,
    "alt-speed-time-begin": 480,
    "alt-speed-time-end": 1380,
    "alt-speed-time-day": 62
}
```

The `alt-speed-time-day` value is a bitmask: 62 = Monday through Friday (2+4+8+16+32). Full speed runs on weekends and nights.

## Security Considerations

- Always set a strong web UI password
- Do not expose port 9091 to the internet without additional protection
- Use a VPN if your ISP throttles BitTorrent traffic
- Enable the IP blocklist for additional peer filtering

Configure an IP blocklist in Transmission:

```json
{
    "blocklist-enabled": true,
    "blocklist-url": "https://github.com/Naunter/BT_BlockLists/raw/master/bt_blocklists.gz"
}
```

Update the blocklist periodically:

```bash
# Update the blocklist
transmission-remote localhost:9091 -n admin:your_password --blocklist-update
```

## Monitoring with OneUptime

Monitor your Transmission instance with OneUptime by setting up an HTTP monitor on port 9091. If the torrent client goes down, active downloads stop and seeding pauses. Monitoring helps you detect issues and restore service promptly.

## Wrapping Up

Transmission in Docker gives you a lightweight, efficient torrent client with a clean web interface and powerful API. The low resource footprint makes it ideal for always-on servers, and Docker's isolation keeps the torrent client neatly separated from other services. With watch directories for automation and RPC API for integration, Transmission fits well into larger media management workflows.
