# How to Install Sonarr and Radarr on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Sonarr, Radarr, Prowlarr, Media Server, Automation, Linux, Self-Hosted

Description: A complete guide to installing and configuring Sonarr, Radarr, and Prowlarr on Ubuntu for automated TV show and movie management.

---

Managing a media library manually is tedious. Sonarr and Radarr automate the process of searching, downloading, and organizing your TV shows and movies. This guide walks you through installing and configuring these tools on Ubuntu, along with Prowlarr for unified indexer management.

## What Are Sonarr and Radarr?

**Sonarr** is a PVR (Personal Video Recorder) for Usenet and BitTorrent users. It monitors multiple RSS feeds for new TV show episodes, grabs them, sorts them, and renames them automatically. Think of it as a DVR for the internet age.

**Radarr** is the movie equivalent of Sonarr. It monitors for new movie releases, downloads them when available, and organizes your movie collection with consistent naming and folder structures.

Both applications:
- Monitor indexers for releases matching your quality preferences
- Send download requests to your preferred download client (SABnzbd, NZBGet, qBittorrent, Transmission, etc.)
- Automatically import and rename completed downloads
- Upgrade existing files when better quality versions become available
- Provide a clean web interface for managing your library

## Prerequisites

Before installing, ensure your system meets these requirements:

- Ubuntu 20.04, 22.04, or 24.04 LTS
- Sudo privileges
- At least 2GB RAM (4GB recommended)
- Sufficient storage for your media library
- A working download client (we will cover integration later)

Update your system packages first.

```bash
# Update package lists and upgrade existing packages
# This ensures you have the latest security patches and dependencies
sudo apt update && sudo apt upgrade -y
```

Install common dependencies needed by all applications.

```bash
# Install essential packages:
# - curl: For downloading files and scripts
# - gnupg: For GPG key management (repository signing)
# - software-properties-common: For managing PPAs and repositories
# - apt-transport-https: For HTTPS repository access
sudo apt install -y curl gnupg software-properties-common apt-transport-https
```

## Installing Sonarr

Sonarr requires Mono runtime on Ubuntu. The Sonarr team provides official packages through their repository.

### Step 1: Add the Sonarr Repository

Add the GPG key and repository for Sonarr.

```bash
# Add the Sonarr GPG signing key to verify package authenticity
# The key is stored in the shared keyrings directory for apt
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/sonarr-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys 2009837CBFFD68F45BC180471F4F90DE2A9B4BF8

# Add the Sonarr repository to your sources list
# Uses the signed-by option to reference the GPG key we just added
echo "deb [signed-by=/usr/share/keyrings/sonarr-keyring.gpg] https://apt.sonarr.tv/ubuntu $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/sonarr.list
```

### Step 2: Install Sonarr

Install Sonarr from the official repository.

```bash
# Update package lists to include the new Sonarr repository
sudo apt update

# Install Sonarr - this includes all required dependencies
# During installation, you will be prompted to select a user/group
# Choose an existing media user or let it create the 'sonarr' user
sudo apt install -y sonarr
```

### Step 3: Configure the Sonarr Service

Sonarr runs as a systemd service. Verify and enable it.

```bash
# Enable Sonarr to start automatically on system boot
sudo systemctl enable sonarr

# Start the Sonarr service immediately
sudo systemctl start sonarr

# Check the service status to confirm it is running
# Look for "Active: active (running)" in the output
sudo systemctl status sonarr
```

Sonarr runs on port 8989 by default. Access the web interface at `http://your-server-ip:8989`.

## Installing Radarr

Radarr installation follows a similar pattern to Sonarr.

### Step 1: Add the Radarr Repository

Add the GPG key and repository for Radarr.

```bash
# Add the Radarr GPG signing key for package verification
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/radarr-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys 56B6D6F206EB0BE7D4E1FB5F5EBC09EDB8AEB2A9

# Add the Radarr repository to your sources list
# The repository URL structure follows the same pattern as Sonarr
echo "deb [signed-by=/usr/share/keyrings/radarr-keyring.gpg] https://apt.radarr.video/ubuntu $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/radarr.list
```

### Step 2: Install Radarr

Install Radarr from the official repository.

```bash
# Update package lists to include the new Radarr repository
sudo apt update

# Install Radarr with all dependencies
# Use the same user/group as Sonarr for consistent permissions
sudo apt install -y radarr
```

### Step 3: Configure the Radarr Service

Enable and start the Radarr systemd service.

```bash
# Enable Radarr to start on boot
sudo systemctl enable radarr

# Start the Radarr service
sudo systemctl start radarr

# Verify the service is running correctly
sudo systemctl status radarr
```

Radarr runs on port 7878 by default. Access it at `http://your-server-ip:7878`.

## Installing Prowlarr (Indexer Manager)

Prowlarr is an indexer manager that syncs your indexers across Sonarr, Radarr, and other applications. Instead of adding indexers to each application individually, configure them once in Prowlarr.

### Step 1: Add the Prowlarr Repository

Add the GPG key and repository for Prowlarr.

```bash
# Add the Prowlarr GPG signing key
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/prowlarr-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys 1B506F11B1E02F912F53A82E5F88F4D7E28CE38F

# Add the Prowlarr repository
echo "deb [signed-by=/usr/share/keyrings/prowlarr-keyring.gpg] https://apt.prowlarr.com/ubuntu $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/prowlarr.list
```

### Step 2: Install Prowlarr

Install Prowlarr from the repository.

```bash
# Update package lists
sudo apt update

# Install Prowlarr
sudo apt install -y prowlarr
```

### Step 3: Configure the Prowlarr Service

Enable and start Prowlarr.

```bash
# Enable Prowlarr to start on boot
sudo systemctl enable prowlarr

# Start the Prowlarr service
sudo systemctl start prowlarr

# Check service status
sudo systemctl status prowlarr
```

Prowlarr runs on port 9696 by default. Access it at `http://your-server-ip:9696`.

## Connecting Prowlarr to Sonarr and Radarr

Once all three applications are running, connect them so Prowlarr can sync indexers.

### Step 1: Get API Keys

Each application has a unique API key. Find them in Settings > General > Security.

```bash
# View Sonarr's config file to find the API key
# The ApiKey is stored in the config.xml file
grep -i apikey /var/lib/sonarr/config.xml

# View Radarr's API key
grep -i apikey /var/lib/radarr/config.xml

# View Prowlarr's API key
grep -i apikey /var/lib/prowlarr/config.xml
```

### Step 2: Add Applications in Prowlarr

In Prowlarr's web interface:

1. Go to Settings > Apps
2. Click the + button to add a new application
3. Select "Sonarr" from the list
4. Configure the connection:

```yaml
# Prowlarr App Configuration for Sonarr
Name: Sonarr
Sync Level: Full Sync           # Syncs all indexers and their settings
Prowlarr Server: http://localhost:9696
Sonarr Server: http://localhost:8989
API Key: [paste-sonarr-api-key]
```

Repeat the process for Radarr using its API key and port 7878.

## Download Client Integration

Sonarr and Radarr need a download client to fetch content. Common choices include SABnzbd for Usenet and qBittorrent for torrents.

### Adding SABnzbd (Usenet)

In Sonarr or Radarr, go to Settings > Download Clients and add SABnzbd.

```yaml
# SABnzbd Download Client Configuration
Name: SABnzbd
Host: localhost                  # Or your SABnzbd server IP
Port: 8080                       # Default SABnzbd port
API Key: [your-sabnzbd-api-key]  # Found in SABnzbd Config > General
Category: tv                     # Use 'movies' for Radarr
Recent Priority: Normal
Older Priority: Normal
```

### Adding qBittorrent (Torrents)

For torrent downloads, add qBittorrent as a download client.

```yaml
# qBittorrent Download Client Configuration
Name: qBittorrent
Host: localhost                  # Or your qBittorrent server IP
Port: 8080                       # qBittorrent Web UI port
Username: admin                  # qBittorrent Web UI username
Password: [your-password]        # qBittorrent Web UI password
Category: tv                     # Separate categories for organization
Initial State: Start             # Start download immediately
```

### Post-Processing Settings

Configure how completed downloads are handled.

```yaml
# Completed Download Handling (Settings > Download Clients)
Enable: Yes
Remove Completed: Yes            # Remove from client after import
Check For Finished Downloads: 1  # Check every minute
```

## Quality Profiles Setup

Quality profiles determine which releases Sonarr and Radarr will accept. Configure these based on your storage capacity and quality preferences.

### Creating a Custom Quality Profile

In Settings > Profiles, create profiles that match your needs.

```yaml
# Example Quality Profile: HD-1080p
Name: HD-1080p
Upgrades Allowed: Yes
Upgrade Until: Bluray-1080p Remux

# Quality Rankings (highest to lowest priority):
# 1. Bluray-1080p Remux (best quality, largest files)
# 2. Bluray-1080p (excellent quality)
# 3. WEB-DL 1080p (good quality, smaller files)
# 4. HDTV-1080p (broadcast quality)
# 5. WEB-720p (minimum acceptable)
```

### Language Profiles

Configure language preferences for multi-language setups.

```yaml
# Language Profile Configuration
Name: English Only
Languages:
  - English (Required)

# For multi-language libraries:
Name: English + Original
Languages:
  - English
  - Original Language
```

## Root Folders and Naming Conventions

Proper folder structure and naming keeps your library organized and compatible with media servers like Plex or Jellyfin.

### Setting Up Root Folders

Root folders are the base directories where your media is stored. Configure these in Settings > Media Management.

```bash
# Create directory structure for your media library
# Use consistent ownership for all media directories
sudo mkdir -p /media/tv /media/movies

# Set ownership to the media group (adjust user/group as needed)
# The sonarr/radarr users need read/write access
sudo chown -R sonarr:media /media/tv
sudo chown -R radarr:media /media/movies

# Set permissions: owner and group can read/write, others can read
sudo chmod -R 775 /media/tv /media/movies
```

### Naming Conventions

Configure standard naming for compatibility with media servers.

```yaml
# Sonarr Episode Naming (Settings > Media Management)
Standard Episode Format:
  {Series Title} - S{season:00}E{episode:00} - {Episode Title} {Quality Title}
  # Example: Breaking Bad - S01E01 - Pilot HDTV-1080p

Daily Episode Format:
  {Series Title} - {Air-Date} - {Episode Title} {Quality Title}
  # Example: The Daily Show - 2024-01-15 - Guest Name HDTV-1080p

Series Folder Format:
  {Series Title} ({Series Year})
  # Example: Breaking Bad (2008)

Season Folder Format:
  Season {season:00}
  # Example: Season 01
```

```yaml
# Radarr Movie Naming (Settings > Media Management)
Movie Folder Format:
  {Movie Title} ({Release Year})
  # Example: Inception (2010)

Movie File Format:
  {Movie Title} ({Release Year}) {Quality Title}
  # Example: Inception (2010) Bluray-1080p.mkv
```

## Import Existing Media

If you have existing media files, import them into Sonarr and Radarr to track them properly.

### Importing TV Shows into Sonarr

Use the Library Import feature to add existing shows.

1. Go to Series > Library Import
2. Select your TV show root folder
3. Sonarr scans and matches shows automatically
4. Review matches and fix any incorrect identifications
5. Click Import to add shows to your library

```bash
# Ensure correct permissions before importing
# Sonarr needs read access to scan and write access to rename
sudo chown -R sonarr:media /media/tv
sudo chmod -R 775 /media/tv

# Check for permission issues in the logs
sudo journalctl -u sonarr -f
```

### Importing Movies into Radarr

Radarr's import process works similarly.

1. Go to Movies > Library Import
2. Select your movies root folder
3. Radarr identifies movies by folder name and file metadata
4. Review and correct any mismatches
5. Import the collection

```bash
# Fix common import issues by standardizing folder names
# Radarr expects: Movie Name (Year)/Movie Name (Year).ext
# Rename folders to match before importing for best results
```

## Reverse Proxy Configuration

Running multiple services on different ports is cumbersome. A reverse proxy provides a single entry point with clean URLs and SSL termination.

### Nginx Reverse Proxy Setup

Install and configure Nginx as a reverse proxy.

```bash
# Install Nginx web server
sudo apt install -y nginx

# Create a new site configuration for your media apps
sudo nano /etc/nginx/sites-available/media
```

Create the Nginx configuration file.

```nginx
# Nginx reverse proxy configuration for Sonarr, Radarr, and Prowlarr
# Provides clean URLs and centralized SSL termination

server {
    listen 80;
    server_name media.yourdomain.com;

    # Sonarr - TV show management
    # Accessible at http://media.yourdomain.com/sonarr
    location /sonarr {
        proxy_pass http://127.0.0.1:8989/sonarr;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Radarr - Movie management
    # Accessible at http://media.yourdomain.com/radarr
    location /radarr {
        proxy_pass http://127.0.0.1:7878/radarr;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Prowlarr - Indexer management
    # Accessible at http://media.yourdomain.com/prowlarr
    location /prowlarr {
        proxy_pass http://127.0.0.1:9696/prowlarr;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Enable the configuration and configure base URLs.

```bash
# Enable the site configuration by creating a symlink
sudo ln -s /etc/nginx/sites-available/media /etc/nginx/sites-enabled/

# Test Nginx configuration for syntax errors
sudo nginx -t

# Reload Nginx to apply changes
sudo systemctl reload nginx
```

### Configure Application Base URLs

Each application needs to know its base URL when behind a reverse proxy.

```bash
# Set Sonarr's base URL in the config file
# This tells Sonarr it's accessible at /sonarr instead of root
sudo sed -i 's|<UrlBase></UrlBase>|<UrlBase>/sonarr</UrlBase>|' /var/lib/sonarr/config.xml
sudo systemctl restart sonarr

# Set Radarr's base URL
sudo sed -i 's|<UrlBase></UrlBase>|<UrlBase>/radarr</UrlBase>|' /var/lib/radarr/config.xml
sudo systemctl restart radarr

# Set Prowlarr's base URL
sudo sed -i 's|<UrlBase></UrlBase>|<UrlBase>/prowlarr</UrlBase>|' /var/lib/prowlarr/config.xml
sudo systemctl restart prowlarr
```

### Adding SSL with Certbot

Secure your reverse proxy with a free Let's Encrypt certificate.

```bash
# Install Certbot and the Nginx plugin
sudo apt install -y certbot python3-certbot-nginx

# Obtain and install SSL certificate automatically
# Certbot modifies your Nginx config to enable HTTPS
sudo certbot --nginx -d media.yourdomain.com

# Certbot sets up automatic renewal, verify with:
sudo certbot renew --dry-run
```

## Backup and Restore

Regular backups protect your configuration and database from data loss.

### Manual Backup

Back up the application data directories.

```bash
# Create a backup directory with timestamp
BACKUP_DIR="/backups/media-$(date +%Y%m%d)"
sudo mkdir -p "$BACKUP_DIR"

# Stop services before backup to ensure data consistency
sudo systemctl stop sonarr radarr prowlarr

# Backup Sonarr data (database, config, and logs)
sudo tar -czf "$BACKUP_DIR/sonarr-backup.tar.gz" -C /var/lib sonarr

# Backup Radarr data
sudo tar -czf "$BACKUP_DIR/radarr-backup.tar.gz" -C /var/lib radarr

# Backup Prowlarr data
sudo tar -czf "$BACKUP_DIR/prowlarr-backup.tar.gz" -C /var/lib prowlarr

# Restart services after backup
sudo systemctl start sonarr radarr prowlarr

# Verify backup files were created
ls -lh "$BACKUP_DIR"
```

### Automated Backup Script

Create a cron job for regular automated backups.

```bash
#!/bin/bash
# /usr/local/bin/backup-media-apps.sh
# Automated backup script for Sonarr, Radarr, and Prowlarr
# Run via cron: 0 3 * * * /usr/local/bin/backup-media-apps.sh

set -e  # Exit on any error

BACKUP_BASE="/backups/media-apps"
BACKUP_DIR="$BACKUP_BASE/$(date +%Y%m%d-%H%M%S)"
RETENTION_DAYS=7

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Function to backup an application
backup_app() {
    local app_name="$1"
    local app_dir="/var/lib/$app_name"

    echo "Backing up $app_name..."
    systemctl stop "$app_name"
    tar -czf "$BACKUP_DIR/$app_name.tar.gz" -C /var/lib "$app_name"
    systemctl start "$app_name"
}

# Backup each application
backup_app sonarr
backup_app radarr
backup_app prowlarr

# Remove backups older than retention period
find "$BACKUP_BASE" -type d -mtime +$RETENTION_DAYS -exec rm -rf {} \; 2>/dev/null || true

echo "Backup completed: $BACKUP_DIR"
```

### Restoring from Backup

Restore your applications from a backup archive.

```bash
# Stop the service before restoring
sudo systemctl stop sonarr

# Remove the current data directory
sudo rm -rf /var/lib/sonarr

# Extract the backup to restore data
sudo tar -xzf /backups/media-20240115/sonarr-backup.tar.gz -C /var/lib

# Fix ownership after extraction
sudo chown -R sonarr:sonarr /var/lib/sonarr

# Start the service
sudo systemctl start sonarr

# Verify the service is running correctly
sudo systemctl status sonarr
```

## Troubleshooting

Common issues and their solutions.

### Service Will Not Start

Check logs for error messages.

```bash
# View recent logs for Sonarr
# The -e flag jumps to the end, -f follows new entries
sudo journalctl -u sonarr -e -f

# Check for port conflicts (another service using the same port)
sudo ss -tlnp | grep -E '8989|7878|9696'

# Verify configuration file syntax
sudo cat /var/lib/sonarr/config.xml | head -20
```

### Permission Denied Errors

Fix file ownership and permissions.

```bash
# Check current ownership of media directories
ls -la /media/tv /media/movies

# Find which user Sonarr is running as
ps aux | grep [s]onarr

# Fix ownership recursively
sudo chown -R sonarr:media /media/tv
sudo chown -R radarr:media /media/movies

# Ensure the service user is in the media group
sudo usermod -aG media sonarr
sudo usermod -aG media radarr

# Restart services to apply group changes
sudo systemctl restart sonarr radarr
```

### Downloads Not Importing

Troubleshoot failed imports.

```bash
# Check the Activity > Queue in the web interface for specific errors

# Common issues:
# 1. Permission denied - fix with chown/chmod
# 2. Path not found - verify root folder exists
# 3. File locked - download client still seeding

# Enable trace logging for detailed diagnostics
# Settings > General > Logging > Log Level: Trace
# Then reproduce the issue and check System > Logs

# Verify the download client category matches
# SABnzbd category should match what's configured in Sonarr/Radarr
```

### Database Locked or Corrupted

Recover from database issues.

```bash
# Stop the service
sudo systemctl stop sonarr

# Backup the current database before attempting repair
sudo cp /var/lib/sonarr/sonarr.db /var/lib/sonarr/sonarr.db.backup

# Check database integrity
sqlite3 /var/lib/sonarr/sonarr.db "PRAGMA integrity_check;"

# If corrupted, attempt recovery
sqlite3 /var/lib/sonarr/sonarr.db ".recover" | sqlite3 /var/lib/sonarr/sonarr-recovered.db

# Replace with recovered database
sudo mv /var/lib/sonarr/sonarr-recovered.db /var/lib/sonarr/sonarr.db
sudo chown sonarr:sonarr /var/lib/sonarr/sonarr.db

# Start the service
sudo systemctl start sonarr
```

### Memory Issues

Optimize for systems with limited RAM.

```bash
# Check current memory usage
free -h

# Reduce Sonarr/Radarr memory footprint by:
# 1. Disabling RSS sync for inactive series
# 2. Reducing refresh interval (Settings > Indexers)
# 3. Limiting concurrent downloads

# Monitor per-process memory usage
ps aux --sort=-%mem | head -10

# If using swap heavily, consider adding more
# Create a 2GB swap file
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

## Security Hardening

Protect your media server from unauthorized access.

### Enable Authentication

Configure authentication in each application's Settings > General > Security section.

```yaml
# Authentication Settings
Authentication: Forms (Login Page)
Authentication Required: Enabled
Username: [your-username]
Password: [strong-password]

# API Key Security
# Regenerate the API key if you suspect it's been compromised
# Settings > General > Security > API Key > Regenerate
```

### Firewall Configuration

Restrict access to your media applications.

```bash
# Install UFW if not present
sudo apt install -y ufw

# Allow SSH (important: do this first to avoid lockout)
sudo ufw allow ssh

# Allow HTTP/HTTPS for reverse proxy
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Block direct access to application ports from external networks
# Only allow localhost access to the actual services
sudo ufw deny 8989/tcp  # Sonarr
sudo ufw deny 7878/tcp  # Radarr
sudo ufw deny 9696/tcp  # Prowlarr

# Enable the firewall
sudo ufw enable

# Verify rules
sudo ufw status verbose
```

---

Building a home media server with Sonarr, Radarr, and Prowlarr transforms media management from a manual chore into an automated pipeline. Once configured, new episodes appear in your library automatically, movies download when they become available, and everything stays organized with consistent naming.

The key to a reliable setup is proper permissions, regular backups, and monitoring. Speaking of monitoring, consider using [OneUptime](https://oneuptime.com) to track the health of your media server infrastructure. OneUptime can alert you when services go down, monitor disk space, and track application response times - ensuring your media automation runs smoothly around the clock.
