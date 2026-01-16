# How to Install Plex Media Server on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Plex, Media Server, Self-Hosted, Linux, Streaming, Home Server

Description: A complete guide to installing, configuring, and optimizing Plex Media Server on Ubuntu for streaming your personal media collection.

---

Plex Media Server transforms your Ubuntu machine into a powerful streaming platform, letting you organize and stream your movies, TV shows, music, and photos to any device. This guide walks you through installation from the official repository, configuration, library setup, hardware transcoding, and production-ready features like reverse proxy and backup strategies.

## What is Plex Media Server?

Plex is a client-server media player system that organizes your personal media library and streams it to devices anywhere. Unlike cloud streaming services, you own your content and control your server.

### Key Features

- **Media Organization**: Automatically fetches metadata, artwork, and descriptions for movies, TV shows, and music
- **Universal Streaming**: Stream to web browsers, smart TVs, mobile apps, gaming consoles, and streaming devices
- **Transcoding**: Converts media on-the-fly to match device capabilities and bandwidth
- **Remote Access**: Watch your library from anywhere with an internet connection
- **Multi-User Support**: Create accounts for family members with parental controls
- **DVR & Live TV**: Record over-the-air broadcasts with a compatible tuner (Plex Pass required)
- **Offline Sync**: Download media to mobile devices for offline viewing (Plex Pass required)

## Prerequisites

Before installing Plex, ensure your Ubuntu system meets these requirements.

### System Requirements

- Ubuntu 20.04 LTS, 22.04 LTS, or 24.04 LTS (64-bit)
- Minimum 2GB RAM (4GB+ recommended for transcoding)
- Dual-core processor (quad-core+ recommended for multiple streams)
- Sufficient storage for your media library
- Network connectivity

### Verify Your Ubuntu Version

Check your Ubuntu version to ensure compatibility with Plex.

```bash
# Display Ubuntu version and release information
lsb_release -a

# Check system architecture (must be amd64/x86_64)
uname -m
```

### Create a Plex Account

You need a free Plex account to claim your server. Sign up at [plex.tv](https://www.plex.tv) before proceeding. A Plex Pass subscription unlocks additional features but is not required for basic functionality.

## Installing Plex Media Server from Official Repository

The recommended method is installing from the official Plex repository, which ensures you receive automatic updates.

### Add the Plex Repository

First, add the official Plex APT repository to your system.

```bash
# Download and add the Plex GPG signing key
curl https://downloads.plex.tv/plex-keys/PlexSign.key | sudo gpg --dearmor -o /usr/share/keyrings/plex-archive-keyring.gpg

# Add the Plex repository to your sources list
echo "deb [signed-by=/usr/share/keyrings/plex-archive-keyring.gpg] https://downloads.plex.tv/repo/deb public main" | sudo tee /etc/apt/sources.list.d/plexmediaserver.list

# Update package lists to include the new repository
sudo apt update
```

### Install Plex Media Server

Install Plex using the standard apt package manager.

```bash
# Install Plex Media Server
sudo apt install plexmediaserver -y

# Verify the installation and check the service status
sudo systemctl status plexmediaserver
```

### Enable Automatic Startup

Ensure Plex starts automatically when your system boots.

```bash
# Enable Plex to start on boot
sudo systemctl enable plexmediaserver

# Start the service if not already running
sudo systemctl start plexmediaserver
```

### Verify Installation

Confirm Plex is running and listening on the correct port.

```bash
# Check if Plex is listening on port 32400
sudo ss -tlnp | grep 32400

# View Plex service logs for any issues
sudo journalctl -u plexmediaserver -f --no-pager -n 50
```

## Initial Configuration

Access the Plex web interface to complete initial setup. For local access, open your browser and navigate to `http://localhost:32400/web` or `http://YOUR_SERVER_IP:32400/web`.

### First-Time Setup Wizard

1. Sign in with your Plex account
2. Name your server (e.g., "Home Media Server")
3. Optionally enable remote access (can configure later)
4. Skip library setup for now (we will configure this properly)

### Configure Server Settings

Access Settings > Server to configure essential options.

```bash
# Plex configuration file location for reference
# Main config: /var/lib/plexmediaserver/Library/Application Support/Plex Media Server/Preferences.xml
# You typically configure via web interface, but can verify settings here

# View current Plex preferences (read-only inspection)
sudo cat "/var/lib/plexmediaserver/Library/Application Support/Plex Media Server/Preferences.xml"
```

## Library Setup

Organize your media into separate libraries for optimal metadata matching and browsing experience.

### Prepare Media Directories

Create a structured directory layout for your media files.

```bash
# Create media directory structure
sudo mkdir -p /media/plex/{movies,tvshows,music,photos}

# Set ownership to the plex user so the service can read files
sudo chown -R plex:plex /media/plex

# Set appropriate permissions
sudo chmod -R 755 /media/plex
```

### Directory Structure Best Practices

Plex performs best when media is organized following these naming conventions.

```
/media/plex/
├── movies/
│   ├── The Matrix (1999)/
│   │   └── The Matrix (1999).mkv
│   ├── Inception (2010)/
│   │   └── Inception (2010).mp4
│   └── Interstellar (2014)/
│       └── Interstellar (2014).mkv
├── tvshows/
│   ├── Breaking Bad/
│   │   ├── Season 01/
│   │   │   ├── Breaking Bad - S01E01 - Pilot.mkv
│   │   │   └── Breaking Bad - S01E02 - Cat's in the Bag.mkv
│   │   └── Season 02/
│   │       └── ...
│   └── The Office/
│       └── Season 01/
│           └── ...
├── music/
│   ├── Pink Floyd/
│   │   └── The Dark Side of the Moon/
│   │       ├── 01 - Speak to Me.flac
│   │       └── 02 - Breathe.flac
│   └── Led Zeppelin/
│       └── ...
└── photos/
    ├── 2024/
    │   ├── Vacation/
    │   └── Family Events/
    └── 2025/
        └── ...
```

### Add Libraries via Web Interface

1. Navigate to Settings > Manage > Libraries
2. Click "Add Library"
3. Select library type (Movies, TV Shows, Music, or Photos)
4. Add your media folder path
5. Configure scanner and agent options (defaults work well for most cases)

### Grant Plex Access to External Drives

If your media is on external or network drives, ensure Plex can access them.

```bash
# Example: Mount an external drive
sudo mkdir -p /mnt/external-media
sudo mount /dev/sdb1 /mnt/external-media

# Add to fstab for automatic mounting on boot
# First, get the UUID of the drive
sudo blkid /dev/sdb1

# Add entry to fstab (replace UUID with your actual UUID)
echo "UUID=your-uuid-here /mnt/external-media ext4 defaults,nofail 0 2" | sudo tee -a /etc/fstab

# Set permissions for Plex access
sudo chown -R plex:plex /mnt/external-media
```

### Permissions for Existing Media

If you have media in other locations, add the plex user to the appropriate group.

```bash
# Add plex user to your user group to access files in your home directory
sudo usermod -aG $USER plex

# Or add plex to a shared media group
sudo groupadd media
sudo usermod -aG media plex
sudo usermod -aG media $USER

# Apply group ownership to media directories
sudo chgrp -R media /path/to/your/media
sudo chmod -R g+rx /path/to/your/media

# Restart Plex to apply group membership changes
sudo systemctl restart plexmediaserver
```

## Transcoding Configuration

Transcoding converts media files on-the-fly when the client device does not support the original format or when bandwidth is limited.

### Understanding Transcoding

- **Direct Play**: Client plays the original file without server processing (best quality, lowest CPU)
- **Direct Stream**: Server remuxes the container without re-encoding video/audio
- **Transcode**: Server re-encodes video/audio to match client capabilities

### Configure Transcoding Settings

Access Settings > Server > Transcoder in the web interface.

Key settings to configure:

- **Transcoder quality**: Automatic (recommended) or Manual
- **Transcoder temporary directory**: Should be on fast storage (SSD preferred)
- **Maximum simultaneous video transcode**: Based on your CPU capability
- **Enable HDR tone mapping**: Convert HDR content for SDR displays

### Set Up Transcoding Temporary Directory

Place the transcode cache on fast storage for better performance.

```bash
# Create a dedicated transcoding directory on SSD
sudo mkdir -p /var/lib/plexmediaserver/transcode

# Set ownership
sudo chown plex:plex /var/lib/plexmediaserver/transcode

# If you have a separate SSD, create a bind mount
# First create the directory on your SSD
sudo mkdir -p /mnt/ssd/plex-transcode
sudo chown plex:plex /mnt/ssd/plex-transcode

# Add bind mount to fstab
echo "/mnt/ssd/plex-transcode /var/lib/plexmediaserver/transcode none bind 0 0" | sudo tee -a /etc/fstab
sudo mount -a
```

### RAM Disk for Transcoding (Optional)

For systems with plenty of RAM, a RAM disk eliminates disk I/O bottlenecks.

```bash
# Create a RAM disk mount point
sudo mkdir -p /tmp/plex-transcode

# Add RAM disk to fstab (8GB example - adjust based on your RAM)
echo "tmpfs /tmp/plex-transcode tmpfs defaults,noatime,nosuid,nodev,noexec,mode=1777,size=8G 0 0" | sudo tee -a /etc/fstab

# Mount the RAM disk
sudo mount /tmp/plex-transcode

# Set permissions for Plex
sudo chown plex:plex /tmp/plex-transcode
```

Then configure Plex to use `/tmp/plex-transcode` as the transcoder temporary directory in Settings > Server > Transcoder.

## Remote Access Setup

Enable remote access to stream your media from anywhere with an internet connection.

### Enable Remote Access in Plex

1. Navigate to Settings > Server > Remote Access
2. Check "Manually specify public port" if needed
3. Click "Enable Remote Access"

### Configure Firewall

Allow Plex traffic through your firewall.

```bash
# Allow Plex port through UFW firewall
sudo ufw allow 32400/tcp comment "Plex Media Server"

# If using additional Plex features, allow these ports too
sudo ufw allow 1900/udp comment "Plex DLNA"
sudo ufw allow 3005/tcp comment "Plex Companion"
sudo ufw allow 5353/udp comment "Plex Bonjour/Avahi"
sudo ufw allow 8324/tcp comment "Plex for Roku"
sudo ufw allow 32410:32414/udp comment "Plex GDM network discovery"
sudo ufw allow 32469/tcp comment "Plex DLNA server"

# Reload firewall rules
sudo ufw reload

# Verify rules
sudo ufw status numbered
```

### Router Port Forwarding

Configure your router to forward port 32400 to your Plex server. The exact steps vary by router, but generally:

1. Access your router admin panel (usually 192.168.1.1 or 192.168.0.1)
2. Find Port Forwarding settings
3. Create a new rule:
   - External port: 32400
   - Internal IP: Your Plex server local IP
   - Internal port: 32400
   - Protocol: TCP

### Verify Remote Access

Test your remote access configuration.

```bash
# Check if port 32400 is accessible externally
# Run this from a different network or use an online port checker
curl -I http://YOUR_PUBLIC_IP:32400/web

# Plex also shows remote access status in the web interface
# Green checkmark = working, yellow warning = issues
```

## Hardware Transcoding

Hardware transcoding offloads video encoding/decoding to your GPU, dramatically reducing CPU usage and enabling more simultaneous streams.

### Intel Quick Sync (Integrated Graphics)

Intel Quick Sync is available on most Intel processors with integrated graphics and is highly efficient.

```bash
# Check if your Intel CPU supports Quick Sync
# Look for "VGA compatible controller" with Intel in the output
lspci | grep -i vga

# Verify VA-API (Video Acceleration API) support
sudo apt install vainfo -y
vainfo

# Install Intel media driver for newer CPUs (Broadwell and later)
sudo apt install intel-media-va-driver-non-free -y

# For older Intel CPUs, use i965 driver
sudo apt install i965-va-driver -y

# Verify the driver is working
vainfo 2>&1 | head -20
```

### Grant Plex Access to GPU

The plex user needs access to the render device for hardware transcoding.

```bash
# Find the render device group
ls -la /dev/dri/

# Add plex user to the render group
sudo usermod -aG render plex

# On some systems, also add to video group
sudo usermod -aG video plex

# Restart Plex to apply changes
sudo systemctl restart plexmediaserver

# Verify plex user groups
groups plex
```

### NVIDIA GPU Transcoding

NVIDIA GPUs provide excellent transcoding performance using NVENC/NVDEC.

```bash
# Install NVIDIA drivers if not already installed
sudo apt install nvidia-driver-535 -y

# Install NVIDIA CUDA toolkit for hardware encoding support
sudo apt install nvidia-cuda-toolkit -y

# Verify NVIDIA driver installation
nvidia-smi

# Check for NVENC/NVDEC support
nvidia-smi -q | grep -i encoder
nvidia-smi -q | grep -i decoder
```

### Configure NVIDIA Container Support

For systems using containers or to ensure proper NVIDIA access.

```bash
# Install NVIDIA container toolkit
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list
sudo apt update
sudo apt install nvidia-container-toolkit -y

# Add plex user to video group for GPU access
sudo usermod -aG video plex

# Create udev rule for persistent GPU permissions
echo 'KERNEL=="nvidia*", MODE="0666"' | sudo tee /etc/udev/rules.d/99-nvidia.rules
sudo udevadm control --reload-rules
sudo udevadm trigger

# Restart Plex
sudo systemctl restart plexmediaserver
```

### Enable Hardware Transcoding in Plex

Hardware transcoding requires a Plex Pass subscription.

1. Navigate to Settings > Server > Transcoder
2. Check "Use hardware acceleration when available"
3. Check "Use hardware-accelerated video encoding"

### Verify Hardware Transcoding

Monitor transcoding to confirm hardware acceleration is working.

```bash
# For Intel Quick Sync, watch GPU usage during transcoding
sudo intel_gpu_top

# For NVIDIA, monitor with nvidia-smi
watch -n 1 nvidia-smi

# Check Plex transcoding logs for hardware encoder references
sudo tail -f "/var/lib/plexmediaserver/Library/Application Support/Plex Media Server/Logs/Plex Transcoder Statistics.log"
```

## User Management

Plex supports multiple users with individual watch histories, ratings, and parental controls.

### Plex Home vs Managed Users

- **Plex Home**: Free feature allowing multiple profiles on your server
- **Managed Users**: Users without their own Plex account (great for kids)
- **Friends**: Users with their own Plex accounts who you share your library with

### Create Managed Users

1. Navigate to Settings > Users & Sharing
2. Click "Add Managed User"
3. Set a name and optional PIN
4. Configure restrictions (ratings, library access)

### Share with Friends

1. Navigate to Settings > Users & Sharing
2. Click "Add Friend"
3. Enter their Plex username or email
4. Select which libraries to share
5. Configure download and stream restrictions

### Parental Controls

Configure content restrictions for managed users.

1. Edit the managed user
2. Under "Restrictions", set maximum allowed ratings
3. Filter specific content labels (violence, language, etc.)
4. Restrict access to specific libraries

### User Activity Monitoring

Monitor what users are watching and their activity.

```bash
# Plex Dashboard shows current streams in the web interface

# View detailed activity in logs
sudo tail -f "/var/lib/plexmediaserver/Library/Application Support/Plex Media Server/Logs/Plex Media Server.log" | grep -i "playback"
```

For more detailed analytics, consider third-party tools like Tautulli.

```bash
# Install Tautulli for advanced Plex monitoring
sudo apt install python3 python3-pip git -y
cd /opt
sudo git clone https://github.com/Tautulli/Tautulli.git
sudo chown -R $USER:$USER /opt/Tautulli

# Create systemd service for Tautulli
sudo tee /etc/systemd/system/tautulli.service > /dev/null <<EOF
[Unit]
Description=Tautulli - Plex Monitoring
After=network.target plexmediaserver.service

[Service]
Type=simple
User=$USER
ExecStart=/usr/bin/python3 /opt/Tautulli/Tautulli.py --nolaunch
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Enable and start Tautulli
sudo systemctl daemon-reload
sudo systemctl enable tautulli
sudo systemctl start tautulli

# Access Tautulli at http://YOUR_SERVER_IP:8181
```

## Backup Configuration

Protect your Plex configuration, metadata, and watch history with regular backups.

### What to Back Up

The critical Plex data is stored in the Library folder:

```bash
# Plex data directory location
/var/lib/plexmediaserver/Library/Application Support/Plex Media Server/

# Key subdirectories:
# - Preferences.xml: Server settings
# - Plug-in Support/Databases/: Metadata and watch history
# - Media/: Artwork and thumbnails
# - Metadata/: Downloaded metadata
```

### Create Backup Script

Automate Plex backups with a simple backup script.

```bash
# Create backup script
sudo tee /usr/local/bin/plex-backup.sh > /dev/null <<'EOF'
#!/bin/bash
# Plex Media Server Backup Script

# Configuration
BACKUP_DIR="/backup/plex"
PLEX_DATA="/var/lib/plexmediaserver/Library/Application Support/Plex Media Server"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="plex_backup_${DATE}.tar.gz"
KEEP_DAYS=7

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Stop Plex for consistent backup (optional - can skip for running backup)
echo "Stopping Plex Media Server..."
sudo systemctl stop plexmediaserver

# Create compressed backup excluding cache directories
echo "Creating backup..."
tar -czf "${BACKUP_DIR}/${BACKUP_NAME}" \
    --exclude="Cache" \
    --exclude="Crash Reports" \
    --exclude="Logs" \
    -C "/var/lib/plexmediaserver/Library/Application Support" \
    "Plex Media Server"

# Restart Plex
echo "Starting Plex Media Server..."
sudo systemctl start plexmediaserver

# Remove old backups
echo "Cleaning up old backups..."
find "$BACKUP_DIR" -name "plex_backup_*.tar.gz" -mtime +$KEEP_DAYS -delete

# Report backup size
BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_NAME}" | cut -f1)
echo "Backup completed: ${BACKUP_NAME} (${BACKUP_SIZE})"
EOF

# Make script executable
sudo chmod +x /usr/local/bin/plex-backup.sh
```

### Schedule Automatic Backups

Use cron to run backups automatically.

```bash
# Edit root crontab
sudo crontab -e

# Add daily backup at 3 AM
0 3 * * * /usr/local/bin/plex-backup.sh >> /var/log/plex-backup.log 2>&1
```

### Restore from Backup

Restore Plex configuration from a backup.

```bash
# Stop Plex
sudo systemctl stop plexmediaserver

# Remove current data (make sure you have a working backup first!)
sudo rm -rf "/var/lib/plexmediaserver/Library/Application Support/Plex Media Server"

# Extract backup
sudo tar -xzf /backup/plex/plex_backup_YYYYMMDD_HHMMSS.tar.gz \
    -C "/var/lib/plexmediaserver/Library/Application Support/"

# Fix permissions
sudo chown -R plex:plex "/var/lib/plexmediaserver/Library"

# Start Plex
sudo systemctl start plexmediaserver
```

## Reverse Proxy with Nginx

A reverse proxy enables HTTPS access to Plex, custom domain names, and integration with other services behind a single entry point.

### Install Nginx and Certbot

Install the required packages for reverse proxy and SSL certificates.

```bash
# Install Nginx
sudo apt install nginx -y

# Install Certbot for Let's Encrypt SSL certificates
sudo apt install certbot python3-certbot-nginx -y

# Enable and start Nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### Configure Nginx for Plex

Create an Nginx configuration for proxying to Plex.

```bash
# Create Nginx configuration for Plex
sudo tee /etc/nginx/sites-available/plex > /dev/null <<'EOF'
# Plex Media Server Reverse Proxy Configuration

# Upstream definition for Plex backend
upstream plex_backend {
    server 127.0.0.1:32400;
    keepalive 32;
}

server {
    listen 80;
    server_name plex.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name plex.yourdomain.com;

    # SSL certificates (will be managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/plex.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/plex.yourdomain.com/privkey.pem;

    # SSL security settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    # Large buffer sizes for Plex streaming
    proxy_buffering off;
    proxy_buffer_size 4k;

    # WebSocket support for Plex Companion
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";

    # Standard proxy headers
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # Plex-specific headers
    proxy_set_header X-Plex-Client-Identifier $http_x_plex_client_identifier;
    proxy_set_header X-Plex-Device $http_x_plex_device;
    proxy_set_header X-Plex-Device-Name $http_x_plex_device_name;
    proxy_set_header X-Plex-Platform $http_x_plex_platform;
    proxy_set_header X-Plex-Platform-Version $http_x_plex_platform_version;
    proxy_set_header X-Plex-Product $http_x_plex_product;
    proxy_set_header X-Plex-Token $http_x_plex_token;
    proxy_set_header X-Plex-Version $http_x_plex_version;
    proxy_set_header X-Plex-Nocache $http_x_plex_nocache;
    proxy_set_header X-Plex-Provides $http_x_plex_provides;
    proxy_set_header X-Plex-Device-Vendor $http_x_plex_device_vendor;
    proxy_set_header X-Plex-Model $http_x_plex_model;

    # Disable request size limits for large uploads
    client_max_body_size 100M;

    # Extended timeouts for long-running streams
    proxy_read_timeout 86400s;
    proxy_send_timeout 86400s;

    # Main location block
    location / {
        proxy_pass http://plex_backend;
    }
}
EOF
```

### Enable the Configuration

Activate the Nginx site configuration.

```bash
# Enable the site by creating a symbolic link
sudo ln -s /etc/nginx/sites-available/plex /etc/nginx/sites-enabled/

# Test Nginx configuration for syntax errors
sudo nginx -t

# If the test passes, reload Nginx
sudo systemctl reload nginx
```

### Obtain SSL Certificate

Generate a free SSL certificate from Let's Encrypt.

```bash
# Obtain SSL certificate (replace with your actual domain)
sudo certbot --nginx -d plex.yourdomain.com

# Certbot will automatically:
# - Verify domain ownership
# - Obtain the certificate
# - Configure Nginx to use it
# - Set up automatic renewal

# Verify auto-renewal is working
sudo certbot renew --dry-run
```

### Configure Plex Custom Server Access URL

Tell Plex about your custom domain.

1. Navigate to Settings > Server > Network
2. Under "Custom server access URLs", add: `https://plex.yourdomain.com:443`
3. Save changes

### Firewall Configuration for Reverse Proxy

Update firewall rules for the reverse proxy setup.

```bash
# Allow HTTP and HTTPS traffic
sudo ufw allow 80/tcp comment "HTTP"
sudo ufw allow 443/tcp comment "HTTPS"

# Optionally remove direct Plex port access if only using reverse proxy
# sudo ufw delete allow 32400/tcp

# Reload firewall
sudo ufw reload
```

## Troubleshooting

Common issues and solutions for Plex Media Server on Ubuntu.

### Plex Service Not Starting

Check service status and logs for errors.

```bash
# Check detailed service status
sudo systemctl status plexmediaserver -l

# View recent logs
sudo journalctl -u plexmediaserver -n 100 --no-pager

# Check for port conflicts
sudo ss -tlnp | grep 32400

# Verify Plex data directory permissions
ls -la /var/lib/plexmediaserver/
```

### Permission Denied Errors

Fix common permission issues with media files.

```bash
# Check plex user and groups
id plex

# Verify media directory permissions
ls -la /path/to/media/

# Recursively fix ownership
sudo chown -R plex:plex /path/to/media/

# Or add plex to the owning group
sudo usermod -aG $(stat -c '%G' /path/to/media/) plex
sudo systemctl restart plexmediaserver
```

### Media Not Appearing in Library

Troubleshoot library scanning issues.

```bash
# Check if Plex can access the media directory
sudo -u plex ls -la /path/to/media/

# Force a library scan from command line
# Using Plex API (requires X-Plex-Token from browser developer tools)
curl "http://localhost:32400/library/sections/1/refresh?X-Plex-Token=YOUR_TOKEN"

# Check Plex scanner logs
sudo tail -f "/var/lib/plexmediaserver/Library/Application Support/Plex Media Server/Logs/Plex Media Scanner.log"
```

### Transcoding Failures

Debug transcoding issues.

```bash
# Check transcoder logs
sudo tail -f "/var/lib/plexmediaserver/Library/Application Support/Plex Media Server/Logs/Plex Transcoder Statistics.log"

# Verify transcoding directory exists and is writable
ls -la /var/lib/plexmediaserver/transcode/

# Check disk space (transcoding needs temporary space)
df -h

# For hardware transcoding, verify GPU access
# Intel:
vainfo
# NVIDIA:
nvidia-smi
```

### Remote Access Not Working

Diagnose remote access connectivity issues.

```bash
# Check if Plex is binding to all interfaces
sudo ss -tlnp | grep 32400

# Test local connectivity first
curl -I http://localhost:32400/web

# Verify firewall allows traffic
sudo ufw status | grep 32400

# Check NAT/port forwarding from external
# Use online port checker or test from mobile data

# View Plex remote access diagnostic
# Settings > Server > Remote Access shows detailed status
```

### Database Corruption

Repair corrupted Plex database.

```bash
# Stop Plex first
sudo systemctl stop plexmediaserver

# Navigate to database directory
cd "/var/lib/plexmediaserver/Library/Application Support/Plex Media Server/Plug-in Support/Databases"

# Backup current database
sudo cp com.plexapp.plugins.library.db com.plexapp.plugins.library.db.backup

# Repair database using SQLite
sudo sqlite3 com.plexapp.plugins.library.db "PRAGMA integrity_check"
sudo sqlite3 com.plexapp.plugins.library.db "REINDEX"
sudo sqlite3 com.plexapp.plugins.library.db "VACUUM"

# If repair fails, export and recreate
sudo sqlite3 com.plexapp.plugins.library.db ".dump" > dump.sql
sudo rm com.plexapp.plugins.library.db
sudo sqlite3 com.plexapp.plugins.library.db < dump.sql

# Fix permissions
sudo chown plex:plex com.plexapp.plugins.library.db

# Restart Plex
sudo systemctl start plexmediaserver
```

### High CPU Usage

Investigate and reduce excessive CPU consumption.

```bash
# Monitor Plex processes
top -p $(pgrep -d, -f "Plex")

# Check what's transcoding (high CPU usually means transcoding)
# View Dashboard in Plex web interface for active streams

# Reduce transcoding load:
# 1. Enable hardware transcoding (requires Plex Pass)
# 2. Lower transcoding quality in Settings > Server > Transcoder
# 3. Encourage Direct Play by converting media to compatible formats

# Check for runaway library scans
sudo tail -f "/var/lib/plexmediaserver/Library/Application Support/Plex Media Server/Logs/Plex Media Scanner.log"
```

### Update Plex

Keep Plex updated to the latest version.

```bash
# Update via apt (if using official repository)
sudo apt update
sudo apt upgrade plexmediaserver

# Check installed version
dpkg -l plexmediaserver

# View changelog for new features
# https://forums.plex.tv/c/plex-media-server/release-notes/
```

---

With Plex Media Server properly configured on Ubuntu, you have a powerful home media streaming solution that rivals commercial services. Regular maintenance, including updates, backups, and monitoring, ensures reliable operation. Consider hardware transcoding if you need to support multiple simultaneous streams or have a large library with diverse clients.

For monitoring your Plex Media Server alongside your other infrastructure, consider [OneUptime](https://oneuptime.com). OneUptime provides comprehensive monitoring with uptime checks, alerting, status pages, and incident management. You can set up HTTP monitors to track Plex availability, monitor the underlying server resources, and receive instant notifications when issues arise - ensuring your media server stays online for you and your users.
