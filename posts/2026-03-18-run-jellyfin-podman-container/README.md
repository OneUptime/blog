# How to Run Jellyfin in a Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Jellyfin, Podman, Container, Media Server, Streaming, Linux, Self-Hosted, Open Source

Description: Deploy Jellyfin, the free and open-source media server, inside a Podman container with hardware transcoding, persistent storage, and automatic startup.

---

> Jellyfin is a completely free, open-source media server with no premium tiers or tracking. Running it in a Podman container makes deployment simple and keeps your host system uncluttered.

Jellyfin is the community-driven fork of Emby that provides a fully featured media server without any licensing fees or telemetry. It supports movies, TV shows, music, books, and live TV, all accessible through web browsers, mobile apps, and smart TV clients. Deploying Jellyfin inside a Podman container is the easiest path to a working media server because it avoids dependency conflicts, simplifies updates, and isolates Jellyfin from other services on the host. This guide walks through the entire process.

---

## Prerequisites

- A Linux host with Podman installed (version 4.0 or later).
- At least 2 GB of free RAM.
- Media files stored locally or on a mounted network share.
- Optional: An Intel or NVIDIA GPU for hardware transcoding.

---

## Step 1: Create Host Directories

Set up directories for Jellyfin configuration, cache, and media:

```bash
# Create directories for Jellyfin data

mkdir -p ~/jellyfin/config    # Configuration and database
mkdir -p ~/jellyfin/cache     # Transcoding cache and image cache

# Your media directories (adjust paths to match your setup)
mkdir -p ~/media/movies
mkdir -p ~/media/tvshows
mkdir -p ~/media/music
```

---

## Step 2: Run the Jellyfin Container

Start Jellyfin with the official container image:

```bash
# Run Jellyfin with persistent config and media volumes
podman run -d \
  --name jellyfin \
  -p 8096:8096 \
  -p 8920:8920 \
  -v ~/jellyfin/config:/config:Z \
  -v ~/jellyfin/cache:/cache:Z \
  -v ~/media/movies:/media/movies:ro,Z \
  -v ~/media/tvshows:/media/tvshows:ro,Z \
  -v ~/media/music:/media/music:ro,Z \
  -e TZ=America/New_York \
  --restart unless-stopped \
  docker.io/jellyfin/jellyfin:latest
```

Key flags explained:

| Flag | Purpose |
|------|---------|
| `-p 8096:8096` | HTTP web interface port |
| `-p 8920:8920` | HTTPS web interface port (if you configure SSL) |
| `-v .../movies:/media/movies:ro,Z` | Mounts media as read-only to prevent accidental changes |
| `-v ~/jellyfin/config:/config:Z` | Persists the Jellyfin database, users, and settings |
| `-v ~/jellyfin/cache:/cache:Z` | Stores transcoding temp files and image cache |

---

## Step 3: Complete the Setup Wizard

Open your browser and go to:

```text
http://<your-host-ip>:8096
```

The setup wizard will guide you through:

1. Selecting your preferred language.
2. Creating an administrator account.
3. Adding media libraries - point them to `/media/movies`, `/media/tvshows`, and `/media/music`.
4. Configuring metadata language and country.
5. Optionally enabling remote access.

---

## Step 4: Enable Hardware Transcoding

Hardware transcoding dramatically reduces CPU usage when converting video formats on the fly.

### Intel GPU (VA-API)

```bash
# Verify the render device exists on the host
ls -la /dev/dri/renderD128

# Run Jellyfin with Intel GPU access for VA-API transcoding
podman run -d \
  --name jellyfin \
  -p 8096:8096 \
  --device /dev/dri/renderD128:/dev/dri/renderD128 \
  -v ~/jellyfin/config:/config:Z \
  -v ~/jellyfin/cache:/cache:Z \
  -v ~/media/movies:/media/movies:ro,Z \
  -v ~/media/tvshows:/media/tvshows:ro,Z \
  -v ~/media/music:/media/music:ro,Z \
  -e TZ=America/New_York \
  --restart unless-stopped \
  docker.io/jellyfin/jellyfin:latest
```

After starting the container with GPU access, enable hardware transcoding in the Jellyfin dashboard:

```text
Dashboard > Playback > Transcoding
  - Hardware acceleration: VA-API
  - VA-API Device: /dev/dri/renderD128
  - Enable hardware decoding for: H.264, HEVC, VP9 (check all supported codecs)
  - Enable hardware encoding
```

### NVIDIA GPU

Before using the NVIDIA CDI device name, install NVIDIA Container Toolkit support and generate the CDI specification:

```bash
sudo nvidia-ctk cdi generate --output=/etc/cdi/nvidia.yaml
```

```bash
# Run Jellyfin with NVIDIA GPU access
podman run -d \
  --name jellyfin \
  -p 8096:8096 \
  --device nvidia.com/gpu=all \
  -v ~/jellyfin/config:/config:Z \
  -v ~/jellyfin/cache:/cache:Z \
  -v ~/media/movies:/media/movies:ro,Z \
  -v ~/media/tvshows:/media/tvshows:ro,Z \
  -e TZ=America/New_York \
  --restart unless-stopped \
  docker.io/jellyfin/jellyfin:latest
```

Then set hardware acceleration to "NVIDIA NVENC" in the transcoding settings.

---

## Step 5: Configure Networking for Discovery

If you want Jellyfin to be discoverable by clients on the local network (like the Jellyfin mobile app), use host networking or publish the Jellyfin client discovery port. DLNA requires the DLNA plugin and host networking:

```bash
# Option 1: Run with host networking for full local discovery
podman run -d \
  --name jellyfin \
  --network host \
  -v ~/jellyfin/config:/config:Z \
  -v ~/jellyfin/cache:/cache:Z \
  -v ~/media/movies:/media/movies:ro,Z \
  -v ~/media/tvshows:/media/tvshows:ro,Z \
  -e TZ=America/New_York \
  --restart unless-stopped \
  docker.io/jellyfin/jellyfin:latest

# Option 2: Publish the client discovery port alongside the web ports
podman run -d \
  --name jellyfin \
  -p 8096:8096 \
  -p 8920:8920 \
  -p 7359:7359/udp \
  -v ~/jellyfin/config:/config:Z \
  -v ~/jellyfin/cache:/cache:Z \
  -v ~/media/movies:/media/movies:ro,Z \
  -v ~/media/tvshows:/media/tvshows:ro,Z \
  -e TZ=America/New_York \
  --restart unless-stopped \
  docker.io/jellyfin/jellyfin:latest
```

Port 7359/udp handles Jellyfin client discovery. Port 1900/udp is used by DLNA/SSDP when the DLNA plugin is installed; with containers, Jellyfin's DLNA documentation recommends host networking for DLNA discovery.

---

## Managing the Container

```bash
# View Jellyfin logs for troubleshooting
podman logs --tail 100 jellyfin

# Follow logs in real time
podman logs -f jellyfin

# Stop Jellyfin
podman stop jellyfin

# Start Jellyfin
podman start jellyfin

# Update to the latest version
podman pull docker.io/jellyfin/jellyfin:latest
podman stop jellyfin
podman rm jellyfin
# Re-run the podman run command with the same volumes and flags
```

---

## Running as a Systemd Service

Current Podman documentation recommends Quadlet files for running containers under systemd.

```bash
# Create a user-level Quadlet file
mkdir -p ~/.config/containers/systemd
$EDITOR ~/.config/containers/systemd/jellyfin.container
```

Use this content:

```ini
[Container]
Image=docker.io/jellyfin/jellyfin:latest
ContainerName=jellyfin
PublishPort=8096:8096/tcp
PublishPort=7359:7359/udp
Volume=%h/jellyfin/config:/config:Z
Volume=%h/jellyfin/cache:/cache:Z
Volume=%h/media/movies:/media/movies:ro,Z
Volume=%h/media/tvshows:/media/tvshows:ro,Z
Volume=%h/media/music:/media/music:ro,Z
Environment=TZ=America/New_York

[Service]
Restart=always

[Install]
WantedBy=default.target
```

```bash
# Reload and start the generated service
systemctl --user daemon-reload
systemctl --user start jellyfin.service

# Optional: allow the user service to start without an active login session
loginctl enable-linger "$USER"

# Check status
systemctl --user status jellyfin.service
```

---

## Backing Up Jellyfin

Your Jellyfin database, user accounts, and settings are all in the config directory:

```bash
# Back up configuration (stop first for consistency)
podman stop jellyfin
tar czf ~/jellyfin-backup-$(date +%Y%m%d).tar.gz ~/jellyfin/config/
podman start jellyfin
```

---

## Conclusion

Jellyfin in a Podman container provides a fully featured, open-source media server with no subscriptions or tracking. Your media stays mounted read-only for safety, configuration persists on the host filesystem, and hardware transcoding ensures smooth playback even when format conversion is needed. With systemd integration, the server starts reliably on boot and runs with minimal maintenance.
