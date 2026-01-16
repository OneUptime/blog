# How to Install Jellyfin Media Server on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Jellyfin, Media Server, Ubuntu, Linux, Self-Hosted, Streaming, Docker, VAAPI, NVENC

Description: A complete guide to installing, configuring, and optimizing Jellyfin Media Server on Ubuntu for personal media streaming.

---

Jellyfin is a free, open-source media server that lets you organize, stream, and share your personal media collection across all your devices. Unlike Plex or Emby, Jellyfin has no premium tiers, no account requirements, and no telemetry. You own your data, your server, and your experience. This guide walks you through everything from installation to production-ready configuration.

## What is Jellyfin?

Jellyfin is a community-driven fork of Emby that emerged when Emby moved to a closed-source model. It provides:

- **Complete media management** for movies, TV shows, music, books, and photos
- **Live TV and DVR** support with EPG data
- **Hardware transcoding** for smooth playback on any device
- **Multi-user support** with parental controls
- **Plugin ecosystem** for extended functionality
- **No premium features** - everything is free, forever

Jellyfin supports virtually every media format and can transcode on-the-fly when clients cannot direct play content.

## Prerequisites

Before installing Jellyfin, ensure your Ubuntu system meets these requirements:

- Ubuntu 20.04 LTS, 22.04 LTS, or 24.04 LTS
- Minimum 2GB RAM (4GB+ recommended for transcoding)
- Sufficient storage for your media library
- Root or sudo access
- Network connectivity

Check your Ubuntu version and update your system before proceeding.

```bash
# Display current Ubuntu version to verify compatibility
lsb_release -a

# Update package lists and upgrade existing packages
sudo apt update && sudo apt upgrade -y
```

## Installation Method 1: Official Repository (Recommended)

The official Jellyfin repository provides the latest stable releases with automatic updates.

First, install the required dependencies for adding the repository.

```bash
# Install prerequisites for HTTPS repositories and GPG key handling
sudo apt install -y apt-transport-https ca-certificates curl gnupg
```

Add the Jellyfin GPG signing key to verify package authenticity.

```bash
# Download and install Jellyfin's official GPG key
curl -fsSL https://repo.jellyfin.org/ubuntu/jellyfin_team.gpg.key | sudo gpg --dearmor -o /usr/share/keyrings/jellyfin.gpg
```

Add the official Jellyfin repository to your system sources.

```bash
# Add Jellyfin repository with signed-by option for security
# Replace $(lsb_release -cs) with your Ubuntu codename if needed
echo "deb [signed-by=/usr/share/keyrings/jellyfin.gpg] https://repo.jellyfin.org/ubuntu $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/jellyfin.list
```

Install Jellyfin server and web interface packages.

```bash
# Update package lists to include new repository
sudo apt update

# Install Jellyfin server and web components
sudo apt install -y jellyfin
```

Enable and start the Jellyfin service.

```bash
# Enable Jellyfin to start automatically on boot
sudo systemctl enable jellyfin

# Start Jellyfin service immediately
sudo systemctl start jellyfin

# Verify Jellyfin is running properly
sudo systemctl status jellyfin
```

## Installation Method 2: Docker (Containerized)

Docker provides isolation and easy updates. This method is ideal for users running multiple services.

Install Docker if not already present on your system.

```bash
# Install Docker using the official convenience script
curl -fsSL https://get.docker.com | sudo sh

# Add your user to docker group to run without sudo
sudo usermod -aG docker $USER

# Apply group changes (or log out and back in)
newgrp docker
```

Create directories for Jellyfin configuration and cache.

```bash
# Create persistent directories for Jellyfin data
mkdir -p ~/jellyfin/config ~/jellyfin/cache

# Set appropriate permissions
chmod 755 ~/jellyfin ~/jellyfin/config ~/jellyfin/cache
```

Create a Docker Compose file for easy management and reproducibility.

```yaml
# docker-compose.yml - Jellyfin Media Server configuration
version: "3.8"

services:
  jellyfin:
    image: jellyfin/jellyfin:latest      # Official Jellyfin image
    container_name: jellyfin
    user: 1000:1000                        # Run as your user (replace with your UID:GID)
    network_mode: host                     # Use host networking for DLNA discovery
    volumes:
      - ./config:/config                   # Persistent configuration storage
      - ./cache:/cache                     # Transcoding cache (use fast storage)
      - /path/to/media:/media:ro           # Media library (read-only for safety)
    restart: unless-stopped                # Auto-restart on failure or reboot
    environment:
      - JELLYFIN_PublishedServerUrl=http://your-server-ip:8096  # External URL for clients
```

Launch Jellyfin using Docker Compose.

```bash
# Navigate to the directory containing docker-compose.yml
cd ~/jellyfin

# Pull the latest image and start Jellyfin in detached mode
docker compose up -d

# View container logs to verify successful startup
docker compose logs -f jellyfin
```

## Initial Setup Wizard

Access the Jellyfin web interface to complete initial configuration.

1. Open your browser and navigate to `http://your-server-ip:8096`
2. Select your preferred display language
3. Create an administrator account with a strong password
4. Skip library setup for now (we will configure it properly next)
5. Configure metadata language and country
6. Allow or block remote access based on your needs
7. Complete the wizard

The setup wizard creates essential configuration but libraries deserve careful planning.

## Library Configuration

Proper library organization ensures accurate metadata matching and a clean interface.

Create a logical folder structure for your media.

```bash
# Create organized media directories following naming conventions
sudo mkdir -p /media/jellyfin/{movies,tvshows,music,books,photos}

# Set ownership to jellyfin user for native install
sudo chown -R jellyfin:jellyfin /media/jellyfin

# For Docker, use your user's UID:GID instead
# sudo chown -R 1000:1000 /media/jellyfin
```

Follow these naming conventions for automatic metadata matching:

**Movies:** `/media/jellyfin/movies/Movie Name (Year)/Movie Name (Year).mkv`

**TV Shows:** `/media/jellyfin/tvshows/Show Name/Season 01/Show Name - S01E01 - Episode Title.mkv`

**Music:** `/media/jellyfin/music/Artist/Album/01 - Track Name.flac`

Add libraries through the Jellyfin dashboard:

1. Navigate to Dashboard > Libraries > Add Media Library
2. Select content type (Movies, Shows, Music, etc.)
3. Add your media folder path
4. Configure metadata providers (prefer TMDb for movies, TVDb for shows)
5. Enable real-time monitoring to detect new files automatically
6. Run a library scan after adding media

## Hardware Acceleration Setup

Hardware transcoding dramatically reduces CPU usage and enables smooth 4K streaming.

### Intel VAAPI (Recommended for Intel CPUs with integrated graphics)

Install VAAPI drivers for Intel Quick Sync Video support.

```bash
# Install Intel media driver for modern CPUs (Broadwell and newer)
sudo apt install -y intel-media-va-driver vainfo

# For older Intel CPUs (Haswell and earlier), use i965 driver
# sudo apt install -y i965-va-driver vainfo

# Verify VAAPI is working by listing available profiles
vainfo
```

Grant Jellyfin access to the GPU render device.

```bash
# Add jellyfin user to render group for GPU access (native install)
sudo usermod -aG render jellyfin

# Restart Jellyfin to apply group membership
sudo systemctl restart jellyfin
```

For Docker installations, add device mappings to your compose file.

```yaml
services:
  jellyfin:
    # ... existing configuration ...
    devices:
      - /dev/dri/renderD128:/dev/dri/renderD128  # Intel/AMD GPU render device
    group_add:
      - "109"  # Render group GID (verify with: getent group render)
```

### NVIDIA NVENC (For NVIDIA GPUs)

Install NVIDIA drivers and container toolkit for GPU transcoding.

```bash
# Install NVIDIA driver (version 525+ recommended)
sudo apt install -y nvidia-driver-535

# Install NVIDIA Container Toolkit for Docker GPU support
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg

echo "deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://nvidia.github.io/libnvidia-container/stable/deb/amd64 /" | sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

sudo apt update && sudo apt install -y nvidia-container-toolkit

# Configure Docker to use NVIDIA runtime
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

Update Docker Compose for NVIDIA GPU support.

```yaml
services:
  jellyfin:
    # ... existing configuration ...
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1                    # Number of GPUs to use
              capabilities: [gpu, video]  # Enable GPU compute and video encoding
```

Enable hardware acceleration in Jellyfin dashboard:

1. Navigate to Dashboard > Playback > Transcoding
2. Select your hardware acceleration type (VAAPI, NVENC, or QSV)
3. Enable hardware decoding for supported codecs (H.264, HEVC, VP9)
4. Enable hardware encoding
5. Set the VAAPI device to `/dev/dri/renderD128` if using Intel
6. Save changes and test with a video requiring transcoding

## User Management and Permissions

Jellyfin supports multiple users with granular access controls.

Create users through the dashboard or API.

```bash
# Example: Create a user via Jellyfin API (requires admin token)
curl -X POST "http://localhost:8096/Users/New" \
  -H "Authorization: MediaBrowser Token=YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"Name": "familymember", "Password": "securepassword"}'
```

Configure user permissions in Dashboard > Users > Select User:

- **Allow media playback** - Enable/disable streaming capability
- **Allow media downloads** - Let users download files directly
- **Allow remote connections** - Restrict to local network only
- **Allow live TV access** - Control DVR and live streaming
- **Parental controls** - Set maximum rating and block specific content
- **Library access** - Limit which libraries each user can see
- **Transcoding policy** - Allow or force direct play only

For families, create separate profiles with appropriate content ratings.

```
Admin Account     -> Full access, all libraries, no restrictions
Adult User        -> Movies/TV rated R and below, no admin
Teen User         -> Movies/TV rated PG-13 and below
Child User        -> Movies/TV rated G/PG only, kids library only
```

## Plugin Installation

Plugins extend Jellyfin functionality for metadata, subtitles, and integrations.

Access the plugin catalog in Dashboard > Plugins > Catalog.

Essential plugins to consider:

| Plugin | Purpose |
|--------|---------|
| Open Subtitles | Automatic subtitle downloading |
| Fanart | Enhanced artwork and backgrounds |
| TMDb Box Sets | Automatic movie collection grouping |
| Playback Reporting | Watch history and statistics |
| Trakt | Sync watch status with Trakt.tv |
| Kodi Sync Queue | Sync with Kodi media centers |
| LDAP Authentication | Enterprise directory integration |

Install a plugin from the catalog.

```
1. Dashboard > Plugins > Catalog
2. Find desired plugin and click Install
3. Restart Jellyfin when prompted
4. Configure plugin in Dashboard > Plugins > My Plugins
```

For custom plugins not in the catalog, add third-party repositories.

```bash
# Plugin repositories are configured in Dashboard > Plugins > Repositories
# Add repository URL and Jellyfin will fetch available plugins

# Example repository format (add via dashboard):
# Name: Custom Plugins
# URL: https://example.com/jellyfin/manifest.json
```

## HTTPS with Reverse Proxy

Secure external access with TLS using Nginx as a reverse proxy.

Install Nginx and Certbot for free Let's Encrypt certificates.

```bash
# Install Nginx web server and Certbot
sudo apt install -y nginx certbot python3-certbot-nginx
```

Create an Nginx configuration for Jellyfin with WebSocket support.

```nginx
# /etc/nginx/sites-available/jellyfin
# Jellyfin reverse proxy configuration with SSL

server {
    listen 80;
    server_name jellyfin.yourdomain.com;

    # Redirect all HTTP traffic to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name jellyfin.yourdomain.com;

    # SSL certificates (Certbot will configure these)
    ssl_certificate /etc/letsencrypt/live/jellyfin.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/jellyfin.yourdomain.com/privkey.pem;

    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # Proxy headers for proper client identification
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # WebSocket support for real-time features
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";

    # Disable buffering for streaming performance
    proxy_buffering off;

    location / {
        proxy_pass http://127.0.0.1:8096;  # Jellyfin backend
    }
}
```

Enable the site and obtain SSL certificate.

```bash
# Enable the Jellyfin site configuration
sudo ln -s /etc/nginx/sites-available/jellyfin /etc/nginx/sites-enabled/

# Test Nginx configuration for syntax errors
sudo nginx -t

# Obtain Let's Encrypt certificate (follow prompts)
sudo certbot --nginx -d jellyfin.yourdomain.com

# Reload Nginx to apply changes
sudo systemctl reload nginx
```

Update Jellyfin network settings to work with the reverse proxy.

```
Dashboard > Networking:
- Base URL: (leave empty or set to /jellyfin if using subpath)
- Secure connection mode: Handled by reverse proxy
- Enable HTTPS: No (Nginx handles TLS termination)
- Public HTTPS port: 443
- Known proxies: 127.0.0.1
```

## Client Apps Setup

Jellyfin has native apps for virtually every platform.

**Official Apps:**
- Web browser (built-in)
- Android (Play Store / F-Droid)
- iOS / iPadOS (App Store)
- Android TV / Fire TV
- Roku
- Desktop (Windows, macOS, Linux via Jellyfin Media Player)

**Third-Party Compatible Apps:**
- Infuse (iOS/tvOS - premium quality)
- Swiftfin (iOS - native Swift app)
- Findroid (Android - Material Design)
- Jellycli (Terminal-based player)
- Kodi (via Jellyfin for Kodi addon)

Configure clients for optimal playback.

```
In each client app:
1. Add server: https://jellyfin.yourdomain.com (or local IP:8096)
2. Login with your credentials
3. Settings > Playback:
   - Video quality: Set maximum bitrate based on connection
   - Audio: Enable passthrough for surround sound if supported
   - Subtitles: Set preferred language and burn-in preference
```

For Kodi integration, install the Jellyfin addon.

```
1. Download repository from repo.jellyfin.org
2. Kodi > Settings > Add-ons > Install from zip file
3. Install Jellyfin for Kodi from the repository
4. Configure server connection and sync libraries
5. Enable native playback for direct play support
```

## Backup and Restore

Regular backups protect your configuration, metadata, and watch history.

Identify critical data locations for your installation type.

```bash
# Native installation - configuration directory
/var/lib/jellyfin/

# Docker installation - mounted volumes
~/jellyfin/config/

# Key subdirectories to backup:
# - data/           Database files, user data, watch history
# - config/         Server configuration
# - metadata/       Downloaded artwork and NFO files
# - plugins/        Installed plugin data
```

Create a backup script for automated protection.

```bash
#!/bin/bash
# jellyfin-backup.sh - Automated Jellyfin backup script

# Configuration variables
JELLYFIN_DATA="/var/lib/jellyfin"        # Adjust for Docker: ~/jellyfin/config
BACKUP_DIR="/backup/jellyfin"
DATE=$(date +%Y-%m-%d_%H-%M)
RETENTION_DAYS=30

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Stop Jellyfin for consistent backup (optional but recommended)
echo "Stopping Jellyfin service..."
sudo systemctl stop jellyfin

# Create compressed archive of Jellyfin data
echo "Creating backup archive..."
tar -czf "$BACKUP_DIR/jellyfin-backup-$DATE.tar.gz" \
    -C "$(dirname $JELLYFIN_DATA)" \
    "$(basename $JELLYFIN_DATA)"

# Restart Jellyfin service
echo "Starting Jellyfin service..."
sudo systemctl start jellyfin

# Remove backups older than retention period
echo "Cleaning old backups..."
find "$BACKUP_DIR" -name "jellyfin-backup-*.tar.gz" -mtime +$RETENTION_DAYS -delete

# Verify backup was created
if [ -f "$BACKUP_DIR/jellyfin-backup-$DATE.tar.gz" ]; then
    SIZE=$(du -h "$BACKUP_DIR/jellyfin-backup-$DATE.tar.gz" | cut -f1)
    echo "Backup completed successfully: $SIZE"
else
    echo "ERROR: Backup failed!"
    exit 1
fi
```

Schedule automated backups with cron.

```bash
# Make backup script executable
chmod +x /usr/local/bin/jellyfin-backup.sh

# Add cron job for daily backups at 3 AM
(crontab -l 2>/dev/null; echo "0 3 * * * /usr/local/bin/jellyfin-backup.sh >> /var/log/jellyfin-backup.log 2>&1") | crontab -
```

Restore from backup when needed.

```bash
# Stop Jellyfin before restoring
sudo systemctl stop jellyfin

# Remove current data directory (backup first if needed!)
sudo rm -rf /var/lib/jellyfin

# Extract backup archive to original location
sudo tar -xzf /backup/jellyfin/jellyfin-backup-2026-01-15.tar.gz -C /var/lib/

# Restore ownership
sudo chown -R jellyfin:jellyfin /var/lib/jellyfin

# Start Jellyfin with restored data
sudo systemctl start jellyfin
```

## Troubleshooting

Common issues and their solutions.

### Jellyfin Service Fails to Start

Check service status and logs for error details.

```bash
# View detailed service status
sudo systemctl status jellyfin -l

# Check Jellyfin logs for errors
sudo journalctl -u jellyfin -n 100 --no-pager

# Common fix: Reset permissions on data directory
sudo chown -R jellyfin:jellyfin /var/lib/jellyfin
sudo chmod -R 755 /var/lib/jellyfin
```

### Hardware Transcoding Not Working

Verify GPU access and driver installation.

```bash
# Check if render device exists
ls -la /dev/dri/

# Verify user has GPU access
groups jellyfin  # Should include 'render' group

# Test VAAPI availability
vainfo 2>&1 | grep -E "(vainfo|error)"

# For NVIDIA, verify driver status
nvidia-smi

# Check Jellyfin FFmpeg logs during transcoding
# Dashboard > Logs > FFmpeg Logs
```

### Media Not Being Detected

Verify file permissions and naming conventions.

```bash
# Check if Jellyfin can read media directory
sudo -u jellyfin ls /media/jellyfin/movies/

# Verify file permissions (should be readable by jellyfin user)
ls -la /media/jellyfin/movies/

# Fix permissions if needed
sudo chmod -R 755 /media/jellyfin
sudo chown -R jellyfin:jellyfin /media/jellyfin

# Trigger manual library scan from dashboard
# Dashboard > Libraries > Select Library > Scan Library Files
```

### Remote Access Issues

Ensure proper network configuration and firewall rules.

```bash
# Check if Jellyfin is listening on expected port
sudo ss -tlnp | grep 8096

# Open firewall port if using UFW
sudo ufw allow 8096/tcp comment "Jellyfin"

# For reverse proxy, verify Nginx is running
sudo systemctl status nginx

# Test SSL certificate validity
curl -vI https://jellyfin.yourdomain.com 2>&1 | grep -E "(SSL|certificate)"
```

### Database Corruption

Reset the database while preserving media organization.

```bash
# Stop Jellyfin
sudo systemctl stop jellyfin

# Backup current database (in case recovery is needed)
sudo cp /var/lib/jellyfin/data/jellyfin.db /var/lib/jellyfin/data/jellyfin.db.bak

# Remove corrupted database (metadata will need to be rescanned)
sudo rm /var/lib/jellyfin/data/jellyfin.db

# Start Jellyfin - it will create a fresh database
sudo systemctl start jellyfin

# Re-run setup wizard and rescan libraries
```

### Performance Optimization

Tune Jellyfin for better streaming performance.

```bash
# Use SSD/NVMe for transcoding directory
# Dashboard > Playback > Transcoding > Transcode path
# Set to fast storage: /tmp/jellyfin-transcodes

# Increase file descriptor limits for large libraries
echo "jellyfin soft nofile 65536" | sudo tee -a /etc/security/limits.d/jellyfin.conf
echo "jellyfin hard nofile 65536" | sudo tee -a /etc/security/limits.d/jellyfin.conf

# For Docker, set ulimits in compose file
# ulimits:
#   nofile:
#     soft: 65536
#     hard: 65536
```

---

Jellyfin is a powerful, privacy-respecting media server that rivals commercial alternatives without the subscription fees or data harvesting. With proper configuration, hardware acceleration, and regular maintenance, it provides a seamless streaming experience across all your devices.

For production deployments, consider using [OneUptime](https://oneuptime.com) to monitor your Jellyfin server. Set up HTTP monitors to track web interface availability, configure alerts for service disruptions, and use synthetic monitoring to verify streaming functionality. OneUptime helps ensure your media server stays online and performing well for all your users.
