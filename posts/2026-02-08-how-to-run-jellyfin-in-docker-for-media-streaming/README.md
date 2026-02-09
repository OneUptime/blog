# How to Run Jellyfin in Docker for Media Streaming

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, jellyfin, media-server, streaming, self-hosted, docker-compose

Description: Deploy Jellyfin in Docker to build your own media streaming server for movies, TV shows, and music collections.

---

Jellyfin is a free, open-source media server that organizes your video and audio collections and streams them to any device. Unlike Plex or Emby, Jellyfin has no premium tier or account requirements. Everything works out of the box, and you own the entire stack. Docker is the cleanest way to run Jellyfin because it isolates the application from your host system and simplifies hardware transcoding setup.

## Why Jellyfin?

Plex has moved toward a cloud-connected model where your server needs to phone home. Emby went closed-source. Jellyfin forked from Emby and stayed fully open-source with community-driven development. It supports all major client platforms including web browsers, Android, iOS, Roku, Fire TV, and Kodi. There is no account creation required, no telemetry, and no features locked behind a paywall.

## Prerequisites

Make sure you have these ready:

- A Linux server with Docker and Docker Compose installed
- Media files organized in directories (movies, shows, music)
- At least 2 GB of RAM for basic use, 4 GB or more if you need transcoding
- Optional: a GPU (Intel, NVIDIA, or AMD) for hardware-accelerated transcoding

## Directory Structure

Organize your project and media directories:

```bash
# Create the Jellyfin project directory and config folder
mkdir -p ~/jellyfin/config

# Your media should be organized in a structure like this:
# /mnt/media/movies/
# /mnt/media/shows/
# /mnt/media/music/
```

## Docker Compose Configuration

This Compose file sets up Jellyfin with volume mounts for configuration and media:

```yaml
# docker-compose.yml - Jellyfin media server
version: "3.8"

services:
  jellyfin:
    image: jellyfin/jellyfin:latest
    container_name: jellyfin
    restart: unless-stopped
    ports:
      # Web UI port
      - "8096:8096"
      # HTTPS port (optional, for direct SSL)
      - "8920:8920"
      # Service discovery ports
      - "7359:7359/udp"
      - "1900:1900/udp"
    volumes:
      # Jellyfin configuration and metadata
      - ./config:/config
      # Transcoding temporary directory - use fast storage
      - /tmp/jellyfin-cache:/cache
      # Mount your media directories as read-only
      - /mnt/media/movies:/media/movies:ro
      - /mnt/media/shows:/media/shows:ro
      - /mnt/media/music:/media/music:ro
    environment:
      # Run as your user to avoid permission issues
      - PUID=1000
      - PGID=1000
      # Set your timezone
      - TZ=America/New_York
```

## Hardware Transcoding with Intel Quick Sync

If your server has an Intel CPU with integrated graphics (6th generation or newer), you can enable hardware transcoding. This dramatically reduces CPU usage when streaming to devices that need different formats.

Add the device mapping to your Compose file:

```yaml
# Add this section under the jellyfin service for Intel Quick Sync
services:
  jellyfin:
    # ... other settings from above ...
    devices:
      # Pass through the Intel GPU render device
      - /dev/dri/renderD128:/dev/dri/renderD128
    group_add:
      # Add the render group for GPU access
      - "109"
```

For NVIDIA GPUs, you need the NVIDIA Container Toolkit installed, then add:

```yaml
# NVIDIA GPU configuration for hardware transcoding
services:
  jellyfin:
    # ... other settings from above ...
    runtime: nvidia
    environment:
      - NVIDIA_VISIBLE_DEVICES=all
      - NVIDIA_DRIVER_CAPABILITIES=all
```

Check that your GPU device is accessible:

```bash
# Verify the render device exists on the host
ls -la /dev/dri/
```

## Starting Jellyfin

Launch the container:

```bash
# Start Jellyfin in detached mode
docker compose up -d
```

Monitor the logs to confirm a clean startup:

```bash
# Watch Jellyfin startup logs
docker compose logs -f jellyfin
```

Open `http://<your-server-ip>:8096` in your browser. The initial setup wizard will guide you through creating an admin account and adding media libraries.

## Initial Setup Wizard

The wizard walks through these steps:

1. **Language selection** - Pick your preferred language.
2. **Admin account** - Create a username and password for the admin user.
3. **Media libraries** - Add your media folders. For each library, set the content type (Movies, Shows, Music) and point it to the corresponding mount path inside the container (`/media/movies`, `/media/shows`, `/media/music`).
4. **Metadata settings** - Choose your preferred metadata providers. TheMovieDB and TheTVDB are good defaults.
5. **Remote access** - Enable remote access if you plan to stream outside your local network.

After completing the wizard, Jellyfin begins scanning your media and downloading metadata. This takes a while depending on your library size.

## Organizing Your Media

Jellyfin works best when media files follow a consistent naming convention:

```
# Recommended directory structure for movies
/mnt/media/movies/
  Movie Name (2024)/
    Movie Name (2024).mkv

# Recommended directory structure for TV shows
/mnt/media/shows/
  Show Name (2020)/
    Season 01/
      Show Name - S01E01 - Episode Title.mkv
      Show Name - S01E02 - Episode Title.mkv
    Season 02/
      Show Name - S02E01 - Episode Title.mkv
```

Consistent naming lets Jellyfin match files to metadata accurately. Misnamed files often end up unmatched or matched to the wrong title.

## Enabling Hardware Transcoding in the UI

After adding the GPU device to Docker, you still need to enable transcoding in Jellyfin's settings:

1. Go to Dashboard > Playback > Transcoding
2. Select your hardware acceleration method (VAAPI for Intel, NVENC for NVIDIA)
3. Set the hardware device path to `/dev/dri/renderD128` for Intel
4. Enable the codecs you want to accelerate (H.264 and HEVC are the most common)
5. Save and test by playing a file that requires transcoding

## Setting Up Remote Access

To access Jellyfin outside your local network, you have two options. The simplest is port forwarding on your router - forward port 8096 to your server's local IP. The better approach uses a reverse proxy with SSL.

Here is an Nginx configuration for Jellyfin:

```nginx
# /etc/nginx/sites-available/jellyfin
server {
    listen 443 ssl http2;
    server_name media.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/media.your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/media.your-domain.com/privkey.pem;

    # WebSocket support is required for Jellyfin
    location / {
        proxy_pass http://127.0.0.1:8096;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket headers
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## User Management

Create separate user accounts for family members or friends. Each user gets their own watch history, favorites, and can have restricted access to specific libraries.

```bash
# You can also manage users via the Jellyfin API
curl -X POST "http://localhost:8096/Users/New" \
  -H "Content-Type: application/json" \
  -H "X-Emby-Token: YOUR_API_KEY" \
  -d '{"Name": "familymember"}'
```

## Backup Strategy

The critical data to back up is the config directory, which contains your database, metadata cache, and user settings:

```bash
# Back up Jellyfin configuration
tar czf ~/jellyfin-backup-$(date +%Y%m%d).tar.gz ~/jellyfin/config/
```

## Updating Jellyfin

```bash
# Pull the latest image and restart
docker compose pull
docker compose up -d
```

Jellyfin handles database migrations automatically on startup after an update.

## Monitoring with OneUptime

Set up an HTTP monitor in OneUptime pointing to your Jellyfin web interface. You can also monitor the health endpoint at `/health` for a quick status check. Get alerted the moment your media server goes offline so you can fix it before movie night.

## Wrapping Up

Jellyfin in Docker delivers a polished media streaming experience without any subscription fees or vendor lock-in. Hardware transcoding support means even modest hardware can serve multiple streams simultaneously. Combined with Docker's simple update and backup workflow, you get a media server that is both powerful and easy to maintain.
