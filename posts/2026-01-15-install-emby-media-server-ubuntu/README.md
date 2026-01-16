# How to Install Emby Media Server on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Emby, Media Server, Ubuntu, Linux, Streaming, Self-Hosted, Home Server, Transcoding, DLNA

Description: A complete guide to installing, configuring, and optimizing Emby Media Server on Ubuntu for streaming your personal media collection across all devices.

---

Emby turns your Ubuntu server into a powerful media streaming platform, letting you access your movies, TV shows, music, and photos from anywhere. This guide walks you through every step from installation to advanced configuration.

## What is Emby Media Server?

Emby is a self-hosted media server that organizes your personal video, music, and photo collections and streams them to any device. It automatically fetches metadata, artwork, and subtitles while providing a polished interface across web browsers, smart TVs, mobile apps, and streaming devices.

### Emby vs. Alternatives

| Feature | Emby | Plex | Jellyfin |
|---------|------|------|----------|
| Open Source | Partial (server closed) | No | Yes (fully open) |
| Free Tier | Yes | Yes | Yes (all free) |
| Live TV/DVR | Premium | Premium | Free |
| Hardware Transcoding | Premium | Premium | Free |
| Offline Sync | Premium | Premium | Limited |
| Mobile Apps | Free (basic) | Free (basic) | Free |
| Plugin Ecosystem | Extensive | Limited | Growing |
| Active Development | Yes | Yes | Yes |

Choose Emby if you want a polished experience with excellent device support and are willing to pay for premium features. Choose Jellyfin for a fully open-source alternative. Choose Plex for the largest ecosystem and remote streaming features.

## Prerequisites

Before installing Emby, ensure your Ubuntu system meets these requirements:

- Ubuntu 20.04 LTS, 22.04 LTS, or 24.04 LTS
- Minimum 2GB RAM (4GB+ recommended for transcoding)
- Sufficient storage for your media library
- Root or sudo access
- Network connectivity

Verify your Ubuntu version and update the system before proceeding.

```bash
# Check your Ubuntu version to ensure compatibility
lsb_release -a

# Update package lists and upgrade existing packages
sudo apt update && sudo apt upgrade -y

# Install required dependencies for adding repositories
sudo apt install -y apt-transport-https ca-certificates curl gnupg
```

## Installing Emby from the Official Repository

Emby provides official packages for Ubuntu. Using the official repository ensures you receive updates automatically.

### Step 1: Add the Emby Repository

First, download and add the Emby GPG key to verify package authenticity, then add the official repository.

```bash
# Download the Emby GPG signing key and add it to apt keyring
# This ensures packages are verified as authentic
wget -qO - https://download.emby.media/linux/gpg/keys/emby.gpg | sudo gpg --dearmor -o /usr/share/keyrings/emby-archive-keyring.gpg

# Add the Emby repository to your apt sources
# Uses the keyring we just added for verification
echo "deb [signed-by=/usr/share/keyrings/emby-archive-keyring.gpg] https://download.emby.media/linux/repos/apt/ubuntu $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/emby-server.list
```

### Step 2: Install Emby Server

Now install the Emby server package and start the service.

```bash
# Update apt to recognize the new repository
sudo apt update

# Install the Emby server package
sudo apt install -y emby-server

# Enable Emby to start automatically on boot
sudo systemctl enable emby-server

# Start the Emby service immediately
sudo systemctl start emby-server

# Verify Emby is running correctly
sudo systemctl status emby-server
```

### Step 3: Configure the Firewall

Open the necessary ports if you have UFW (Uncomplicated Firewall) enabled.

```bash
# Allow Emby web interface port (HTTP)
sudo ufw allow 8096/tcp

# Allow Emby HTTPS port (if using SSL)
sudo ufw allow 8920/tcp

# Allow DLNA discovery for local network devices
sudo ufw allow 1900/udp
sudo ufw allow 7359/udp

# Reload firewall rules to apply changes
sudo ufw reload

# Check firewall status to confirm rules are active
sudo ufw status
```

## Initial Setup Wizard

After installation, access the Emby setup wizard through your web browser.

### Step 1: Access the Web Interface

Open your browser and navigate to the Emby web interface. Replace `your-server-ip` with your actual server IP address or use `localhost` if accessing locally.

```
http://your-server-ip:8096
```

### Step 2: Create Administrator Account

The setup wizard walks you through initial configuration:

1. **Select Language**: Choose your preferred language for the interface
2. **Create Admin Account**: Enter a username and strong password for the administrator account
3. **Configure Libraries**: Add your media folders (can be done later)
4. **Metadata Settings**: Choose your preferred metadata language and country
5. **Remote Access**: Configure whether to allow remote connections

### Step 3: Complete Setup

After completing the wizard, you can access the full Emby dashboard to configure additional settings.

## Library Configuration

Properly organizing and configuring your media libraries ensures Emby correctly identifies and fetches metadata for your content.

### Directory Structure Best Practices

Organize your media files in a consistent structure for best results.

```
/media/
├── movies/
│   ├── Movie Name (2024)/
│   │   ├── Movie Name (2024).mkv
│   │   └── Movie Name (2024).srt
│   └── Another Movie (2023)/
│       └── Another Movie (2023).mp4
├── tv/
│   └── Show Name/
│       ├── Season 01/
│       │   ├── Show Name - S01E01 - Episode Title.mkv
│       │   └── Show Name - S01E02 - Episode Title.mkv
│       └── Season 02/
│           └── Show Name - S02E01 - Episode Title.mkv
├── music/
│   └── Artist Name/
│       └── Album Name/
│           ├── 01 - Track Title.flac
│           └── 02 - Track Title.flac
└── photos/
    └── 2024/
        └── Vacation/
            └── IMG_001.jpg
```

### Setting Directory Permissions

Emby runs as the `emby` user by default. Ensure it has read access to your media directories.

```bash
# Add the emby user to your user group for shared access
# Replace 'yourusername' with your actual username
sudo usermod -aG yourusername emby

# Set ownership on media directories (option 1: make emby owner)
sudo chown -R emby:emby /media/movies /media/tv /media/music

# Alternative: Set group permissions (option 2: shared group access)
# This allows both your user and emby to access files
sudo chgrp -R emby /media/movies /media/tv /media/music
sudo chmod -R g+rx /media/movies /media/tv /media/music

# Restart Emby to pick up permission changes
sudo systemctl restart emby-server
```

### Adding Libraries via Web Interface

1. Navigate to **Settings** > **Library**
2. Click **Add Media Library**
3. Select the content type (Movies, TV Shows, Music, etc.)
4. Enter a display name for the library
5. Add one or more folders containing your media
6. Configure library-specific settings:
   - **Metadata downloaders**: Choose sources (TheMovieDb, TheTVDB, etc.)
   - **Metadata language**: Set your preferred language
   - **Real-time monitoring**: Enable to detect new files automatically

## Transcoding Settings

Transcoding converts media files to formats compatible with your playback device. Proper configuration balances quality with server resources.

### Understanding Transcoding

Transcoding occurs when:
- The client device does not support the file codec
- Network bandwidth is insufficient for direct play
- Subtitles need to be burned into the video stream
- The user manually selects a lower quality

### Configuring Transcoding Options

Navigate to **Settings** > **Transcoding** to configure these options.

```bash
# Check available CPU information for transcoding decisions
# More cores = better software transcoding performance
cat /proc/cpuinfo | grep "model name" | head -1
nproc

# Check available memory (transcoding uses significant RAM)
free -h

# Monitor CPU usage during transcoding to identify bottlenecks
htop
```

Key transcoding settings:

| Setting | Recommended Value | Description |
|---------|-------------------|-------------|
| Hardware acceleration | Auto/VAAPI/NVENC | Use GPU when available |
| Thread count | Match CPU cores | Number of encoding threads |
| Transcoding temp path | Fast SSD path | Location for temporary files |
| H.264 encoding preset | veryfast | Balance speed vs quality |
| Throttle transcoding | Enabled | Prevents excessive buffering |

### Setting Up Transcoding Temporary Directory

Use a fast SSD for transcoding temporary files to improve performance.

```bash
# Create a dedicated transcoding directory on a fast drive
sudo mkdir -p /var/lib/emby/transcoding-temp

# Set ownership to emby user
sudo chown emby:emby /var/lib/emby/transcoding-temp

# Optionally mount a tmpfs (RAM disk) for fastest transcoding
# Only use if you have sufficient RAM (8GB+)
# Add to /etc/fstab for persistence:
# tmpfs /var/lib/emby/transcoding-temp tmpfs defaults,noatime,size=4G 0 0

# Mount immediately without reboot
sudo mount -a
```

## Hardware Acceleration

Hardware acceleration offloads video encoding/decoding to your GPU, dramatically reducing CPU usage and enabling multiple simultaneous transcodes.

### Intel Quick Sync (VAAPI)

For Intel processors with integrated graphics (most desktop and laptop CPUs).

```bash
# Install VAAPI drivers for Intel hardware acceleration
sudo apt install -y vainfo intel-media-va-driver-non-free

# Verify VAAPI is working correctly
# You should see a list of supported profiles
vainfo

# Add emby user to video and render groups for GPU access
sudo usermod -aG video emby
sudo usermod -aG render emby

# Restart Emby to apply group membership changes
sudo systemctl restart emby-server
```

### NVIDIA GPU (NVENC)

For systems with NVIDIA graphics cards.

```bash
# Install NVIDIA drivers (if not already installed)
# Check recommended driver version first
ubuntu-drivers devices

# Install the recommended driver
sudo apt install -y nvidia-driver-535

# Install NVIDIA container toolkit for Docker deployments (optional)
# Required if running Emby in Docker with GPU passthrough
sudo apt install -y nvidia-cuda-toolkit

# Verify NVIDIA driver is loaded and GPU is detected
nvidia-smi

# Add emby user to video group
sudo usermod -aG video emby

# Restart Emby to enable NVENC
sudo systemctl restart emby-server
```

### AMD GPU (VAAPI)

For systems with AMD graphics cards.

```bash
# Install Mesa VAAPI drivers for AMD hardware acceleration
sudo apt install -y mesa-va-drivers vainfo

# Verify VAAPI is working with AMD GPU
vainfo

# Add emby user to video and render groups
sudo usermod -aG video emby
sudo usermod -aG render emby

# Restart Emby to apply changes
sudo systemctl restart emby-server
```

### Enabling Hardware Acceleration in Emby

1. Navigate to **Settings** > **Transcoding**
2. Set **Hardware acceleration** to:
   - **VAAPI** for Intel/AMD
   - **NVENC** for NVIDIA
3. Enable **Hardware decoding** for supported codecs:
   - H.264
   - HEVC (H.265)
   - VP9
   - AV1 (newer GPUs only)
4. Enable **Hardware encoding** for H.264/HEVC
5. Save and restart Emby if prompted

## User Management and Parental Controls

Emby supports multiple users with individual preferences and access restrictions.

### Creating User Accounts

1. Navigate to **Settings** > **Users**
2. Click **Add User**
3. Configure user settings:
   - **Username and password**
   - **Library access**: Select which libraries the user can see
   - **Parental controls**: Set content ratings and blocked tags
   - **Remote access**: Allow or deny remote connections
   - **Media playback**: Restrict transcoding, bitrate limits

### Configuring Parental Controls

Emby provides granular parental controls for family-friendly access.

| Setting | Description |
|---------|-------------|
| Max parental rating | Block content above specified rating (PG, PG-13, R, etc.) |
| Block unrated content | Hide items without ratings |
| Block tags | Hide content with specific tags (violence, adult, etc.) |
| Access schedule | Restrict access to specific times |
| Disable user preferences | Prevent children from changing their settings |

### Setting Up User Profiles

```bash
# Users are stored in the Emby database
# Backup user data before making changes
sudo cp -r /var/lib/emby/data /var/lib/emby/data.backup

# View Emby logs for user activity monitoring
sudo tail -f /var/log/emby-server.log | grep -i user
```

## Live TV and DVR Setup

Emby supports live TV streaming and DVR recording with compatible tuners.

### Supported Tuners

- **HDHomeRun** network tuners (recommended)
- USB TV tuners with Linux drivers
- IPTV/M3U playlists (for IPTV services)
- SAT>IP tuners

### Configuring HDHomeRun

HDHomeRun tuners are automatically discovered on your network.

```bash
# Install HDHomeRun configuration utility (optional)
sudo apt install -y hdhomerun-config

# Discover HDHomeRun devices on your network
hdhomerun_config discover

# Check tuner status and signal strength
hdhomerun_config <device-id> get /tuner0/status
```

### Setting Up Live TV in Emby

1. Navigate to **Settings** > **Live TV**
2. Click **Add TV Source**
3. Select your tuner type:
   - **HDHomeRun**: Automatically detected
   - **M3U Playlist**: Enter URL for IPTV services
4. Configure guide data:
   - **Schedules Direct** (paid, comprehensive)
   - **XMLTV** (free, manual setup)
5. Map channels to guide data
6. Set up recording storage path

### DVR Configuration

Configure DVR settings for recording live TV.

```bash
# Create dedicated directory for TV recordings
sudo mkdir -p /media/recordings

# Set permissions for Emby to write recordings
sudo chown emby:emby /media/recordings

# Ensure sufficient disk space for recordings
# 1 hour of HD content = approximately 4-8 GB
df -h /media/recordings
```

DVR settings in Emby:
- **Recording path**: Set to your recordings directory
- **Pre-padding**: Start recording early (1-5 minutes)
- **Post-padding**: Continue recording after scheduled end
- **Series recording rules**: Automatically record new episodes

## Plugin Management

Emby's plugin system extends functionality with additional features.

### Installing Plugins

1. Navigate to **Settings** > **Plugins** > **Catalog**
2. Browse available plugins by category
3. Click **Install** on desired plugins
4. Restart Emby when prompted

### Popular Plugins

| Plugin | Description |
|--------|-------------|
| **Trakt** | Sync watch history with Trakt.tv |
| **Open Subtitles** | Automatically download subtitles |
| **Fanart** | Enhanced artwork and backgrounds |
| **Kodi Sync Queue** | Sync with Kodi media center |
| **Anime** | Enhanced anime metadata from AniDB |
| **Cover Art Archive** | High-quality music artwork |
| **GameBrowser** | Video game library management |

### Managing Plugins via Command Line

```bash
# Plugins are stored in the Emby data directory
ls -la /var/lib/emby/plugins/

# Check Emby logs for plugin-related issues
sudo grep -i plugin /var/log/emby-server.log

# Restart Emby after plugin changes
sudo systemctl restart emby-server
```

## Remote Access Configuration

Enable secure remote access to stream your media from anywhere.

### Option 1: Emby Connect

Emby Connect provides easy remote access without manual port forwarding.

1. Create an account at [emby.media](https://emby.media)
2. Navigate to **Settings** > **Emby Connect**
3. Sign in with your Emby account
4. Link your server to your account

### Option 2: Manual Port Forwarding

For direct remote access without Emby Connect.

```bash
# Emby uses these ports for remote access:
# - 8096: HTTP (unencrypted)
# - 8920: HTTPS (encrypted, recommended)

# Configure your router to forward these ports to your server
# The exact steps vary by router manufacturer

# Test if ports are accessible from outside your network
# Use an external port checking tool or:
curl -I http://your-public-ip:8096
```

### Option 3: Reverse Proxy with NGINX

Set up a secure reverse proxy with SSL certificates for production deployments.

```bash
# Install NGINX and Certbot for SSL certificates
sudo apt install -y nginx certbot python3-certbot-nginx

# Create NGINX configuration for Emby
sudo tee /etc/nginx/sites-available/emby << 'EOF'
server {
    listen 80;
    server_name emby.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name emby.yourdomain.com;

    # SSL certificates (managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/emby.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/emby.yourdomain.com/privkey.pem;

    # Proxy settings for Emby
    location / {
        proxy_pass http://127.0.0.1:8096;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support for real-time updates
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Timeout settings for long-running streams
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
EOF

# Enable the site configuration
sudo ln -s /etc/nginx/sites-available/emby /etc/nginx/sites-enabled/

# Test NGINX configuration for syntax errors
sudo nginx -t

# Obtain SSL certificate from Let's Encrypt
sudo certbot --nginx -d emby.yourdomain.com

# Reload NGINX to apply changes
sudo systemctl reload nginx
```

## Backup and Restore

Regular backups protect your Emby configuration, user data, and watch history.

### What to Backup

| Location | Contents |
|----------|----------|
| `/var/lib/emby/config/` | Server configuration |
| `/var/lib/emby/data/` | Database, users, watch history |
| `/var/lib/emby/plugins/` | Installed plugins |
| `/var/lib/emby/metadata/` | Downloaded metadata and images |

### Automated Backup Script

Create a script to backup Emby data regularly.

```bash
#!/bin/bash
# emby-backup.sh - Automated Emby backup script
# Run via cron: 0 3 * * * /usr/local/bin/emby-backup.sh

# Configuration variables
BACKUP_DIR="/backup/emby"
EMBY_DATA="/var/lib/emby"
DATE=$(date +%Y-%m-%d)
RETENTION_DAYS=7

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Stop Emby to ensure consistent backup (optional but recommended)
echo "Stopping Emby server..."
sudo systemctl stop emby-server

# Create compressed backup archive
echo "Creating backup archive..."
sudo tar -czf "$BACKUP_DIR/emby-backup-$DATE.tar.gz" \
    -C /var/lib emby/config emby/data emby/plugins

# Restart Emby server
echo "Starting Emby server..."
sudo systemctl start emby-server

# Remove backups older than retention period
echo "Cleaning old backups..."
find "$BACKUP_DIR" -name "emby-backup-*.tar.gz" -mtime +$RETENTION_DAYS -delete

# Verify backup was created successfully
if [ -f "$BACKUP_DIR/emby-backup-$DATE.tar.gz" ]; then
    echo "Backup completed successfully: $BACKUP_DIR/emby-backup-$DATE.tar.gz"
    ls -lh "$BACKUP_DIR/emby-backup-$DATE.tar.gz"
else
    echo "ERROR: Backup failed!"
    exit 1
fi
```

Save the script and set up automatic execution.

```bash
# Save the backup script
sudo tee /usr/local/bin/emby-backup.sh << 'SCRIPT'
# (paste script content here)
SCRIPT

# Make the script executable
sudo chmod +x /usr/local/bin/emby-backup.sh

# Create cron job to run backup daily at 3 AM
(crontab -l 2>/dev/null; echo "0 3 * * * /usr/local/bin/emby-backup.sh >> /var/log/emby-backup.log 2>&1") | crontab -

# Run backup manually to test
sudo /usr/local/bin/emby-backup.sh
```

### Restoring from Backup

Restore your Emby server from a backup archive.

```bash
# Stop Emby server before restoring
sudo systemctl stop emby-server

# Backup current data (in case restore fails)
sudo mv /var/lib/emby /var/lib/emby.old

# Extract backup to Emby data directory
sudo tar -xzf /backup/emby/emby-backup-2024-01-15.tar.gz -C /var/lib

# Verify files were extracted correctly
ls -la /var/lib/emby/

# Fix ownership after extraction
sudo chown -R emby:emby /var/lib/emby

# Start Emby server
sudo systemctl start emby-server

# Verify Emby is running
sudo systemctl status emby-server

# Remove old data after successful restore
# sudo rm -rf /var/lib/emby.old
```

## Troubleshooting

Common issues and their solutions when running Emby on Ubuntu.

### Emby Service Won't Start

Check the service status and logs for error messages.

```bash
# Check detailed service status
sudo systemctl status emby-server -l

# View recent Emby logs for errors
sudo journalctl -u emby-server -n 100 --no-pager

# Check Emby's own log file for detailed errors
sudo tail -100 /var/log/emby-server.log

# Verify Emby data directory exists and has correct permissions
ls -la /var/lib/emby/
sudo chown -R emby:emby /var/lib/emby
```

### Port Already in Use

If port 8096 is already in use by another application.

```bash
# Find what process is using port 8096
sudo lsof -i :8096
sudo netstat -tlnp | grep 8096

# Kill the conflicting process (use with caution)
# sudo kill -9 <PID>

# Alternatively, change Emby's port in the configuration
sudo nano /var/lib/emby/config/system.xml
# Look for: <HttpServerPortNumber>8096</HttpServerPortNumber>
# Change to a different port

# Restart Emby after changing the port
sudo systemctl restart emby-server
```

### Library Not Scanning

If Emby fails to detect or scan media files.

```bash
# Verify media directory permissions
ls -la /media/movies/
namei -l /media/movies/

# Check if emby user can read the directory
sudo -u emby ls /media/movies/

# Fix permissions if needed
sudo chown -R emby:emby /media/movies
# Or add emby to your user's group
sudo usermod -aG $(whoami) emby

# Restart Emby after permission changes
sudo systemctl restart emby-server

# Force library rescan from web interface:
# Settings > Library > Select Library > Refresh
```

### Hardware Transcoding Not Working

Troubleshoot hardware acceleration issues.

```bash
# Verify GPU is detected by the system
lspci | grep -i vga

# Check if VAAPI is working (Intel/AMD)
vainfo

# Check NVIDIA driver status
nvidia-smi

# Verify emby user is in required groups
groups emby
# Should include: video, render

# Check Emby transcoding logs for errors
sudo grep -i "transcode\|hardware\|vaapi\|nvenc" /var/log/emby-server.log

# Test hardware encoding manually
ffmpeg -vaapi_device /dev/dri/renderD128 -i input.mp4 -c:v h264_vaapi output.mp4
```

### Database Corruption

If Emby's database becomes corrupted.

```bash
# Stop Emby server
sudo systemctl stop emby-server

# Backup the corrupted database (just in case)
sudo cp /var/lib/emby/data/library.db /var/lib/emby/data/library.db.corrupt

# Delete the corrupted database (Emby will recreate it)
sudo rm /var/lib/emby/data/library.db

# Start Emby - it will create a fresh database
sudo systemctl start emby-server

# Note: You will need to rescan all libraries after database reset
# User accounts and watch history may be lost
```

### High CPU Usage During Playback

If CPU usage spikes during playback, verify if transcoding is occurring unnecessarily.

```bash
# Monitor Emby process resource usage
htop -p $(pgrep -f emby)

# Check active transcoding sessions in web interface:
# Dashboard > Activity > Now Playing
# Look for "Transcoding" indicator

# To reduce transcoding:
# 1. Use Direct Play compatible clients
# 2. Enable hardware acceleration
# 3. Convert media to widely-supported formats (H.264, AAC)
# 4. Store subtitles as external .srt files instead of embedded

# Convert embedded subtitles to external SRT using ffmpeg
ffmpeg -i video.mkv -map 0:s:0 subtitles.srt
```

### Checking System Resources

Monitor overall system health when running Emby.

```bash
# Check disk space (Emby metadata can grow large)
df -h /var/lib/emby

# Monitor real-time disk I/O
iotop -o

# Check memory usage
free -h

# View all Emby-related processes
ps aux | grep emby

# Monitor network connections to Emby
ss -tlnp | grep 8096
```

## Performance Optimization Tips

Optimize Emby for the best streaming experience.

```bash
# Use SSDs for Emby data and transcoding directories
# Check if your storage is SSD or HDD
cat /sys/block/sda/queue/rotational
# Returns 0 for SSD, 1 for HDD

# Increase file descriptor limits for many simultaneous streams
# Add to /etc/security/limits.conf:
echo "emby soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "emby hard nofile 65536" | sudo tee -a /etc/security/limits.conf

# Enable memory caching for better performance
# Add to Emby's system.xml:
# <CachePath>/dev/shm/emby-cache</CachePath>

# Create ramdisk cache directory
sudo mkdir -p /dev/shm/emby-cache
sudo chown emby:emby /dev/shm/emby-cache
```

---

With Emby Media Server running on Ubuntu, you have a powerful platform for streaming your entire media collection to any device. The combination of automatic metadata fetching, hardware transcoding, and multi-user support makes it an excellent choice for home media servers.

For monitoring your Emby server's availability and performance, consider using [OneUptime](https://oneuptime.com). OneUptime provides comprehensive uptime monitoring, alerting, and status pages that help you ensure your media server stays online and responsive. Set up HTTP monitors for your Emby web interface, configure alerts for downtime, and create a status page to keep your family informed about server availability.
