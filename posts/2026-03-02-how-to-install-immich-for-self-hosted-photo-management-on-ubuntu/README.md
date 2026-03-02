# How to Install Immich for Self-Hosted Photo Management on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Immich, Self-Hosted, Photo Management, Docker

Description: Install Immich on Ubuntu using Docker Compose to create a self-hosted Google Photos alternative with automatic photo backup, facial recognition, and mobile app support.

---

Immich is a self-hosted photo and video backup solution that provides an experience close to Google Photos: automatic mobile backup, facial recognition, location-based albums, and a fast, searchable web interface. It's one of the most actively developed self-hosted projects and has matured significantly. If you're moving photos off cloud storage to your own hardware, Immich is the current best option.

## Prerequisites

- Ubuntu 22.04 or 24.04
- Docker and Docker Compose
- At least 4GB RAM (8GB recommended for machine learning features)
- Sufficient storage for your photo library (photos are stored on disk, not in the database)

```bash
# Install Docker and Docker Compose
sudo apt update
sudo apt install -y docker.io docker-compose-plugin

sudo systemctl enable --now docker
sudo usermod -aG docker $USER
# Log out and back in for group change to apply
```

## Setting Up Immich

Immich provides an official Docker Compose setup that includes all required services.

```bash
# Create directory for Immich
sudo mkdir -p /opt/immich
cd /opt/immich

# Download the official docker-compose.yml and .env file
wget -O docker-compose.yml https://github.com/immich-app/immich/releases/latest/download/docker-compose.yml
wget -O .env https://github.com/immich-app/immich/releases/latest/download/example.env
```

Edit the `.env` file to configure your installation:

```bash
nano /opt/immich/.env
```

```env
# Immich environment configuration

# PostgreSQL database credentials
DB_PASSWORD=strong-postgres-password-here
DB_USERNAME=postgres
DB_DATABASE_NAME=immich

# JWT secret for session tokens (generate with: openssl rand -base64 48)
JWT_SECRET=generate-a-random-jwt-secret-here

# Storage location for photo uploads
# This is the most important setting - point it to your photo storage
UPLOAD_LOCATION=/var/lib/immich/upload

# Thumbnails and transcoded videos
THUMBS_LOCATION=/var/lib/immich/thumbs
ENCODED_VIDEO_LOCATION=/var/lib/immich/encoded-video
PROFILE_LOCATION=/var/lib/immich/profile

# Immich version - pin to specific version for stability
# Or leave as "release" to always use the latest
IMMICH_VERSION=release
```

Create storage directories:

```bash
# Create storage directories
sudo mkdir -p /var/lib/immich/{upload,thumbs,encoded-video,profile}

# Set ownership (Immich runs as UID 1000 by default)
sudo chown -R 1000:1000 /var/lib/immich

# If you have an existing photo library to import, you can also add it as a read-only volume
# We'll configure that in the next section
```

## Reviewing the Docker Compose File

The downloaded `docker-compose.yml` includes:
- `immich-server` - the main API server and web interface
- `immich-microservices` - handles background tasks (thumbnail generation, ML processing)
- `immich-machine-learning` - facial recognition, CLIP image search
- `redis` - caching and job queue
- `database` - PostgreSQL for metadata

```bash
# Start Immich
docker compose up -d

# Watch the startup logs
docker compose logs -f immich-server

# Once started, the web UI is on port 2283
# Check all services are healthy
docker compose ps
```

## Adding an Existing Photo Library (External Library)

If you have existing photos stored elsewhere, Immich can index them without moving them - this is called an External Library.

First, mount the existing photo directory into the containers. Edit `docker-compose.yml`:

```yaml
# Add this volume to immich-server and immich-microservices services:
services:
  immich-server:
    # ... existing config ...
    volumes:
      - /var/lib/immich/upload:/usr/src/app/upload
      # Mount existing photo library as read-only
      - /home/user/Photos:/mnt/external-photos:ro

  immich-microservices:
    # ... existing config ...
    volumes:
      - /var/lib/immich/upload:/usr/src/app/upload
      - /home/user/Photos:/mnt/external-photos:ro
```

```bash
docker compose up -d
```

Then in the Immich web UI:
1. Go to Administration > External Libraries
2. Click "Create Library"
3. Set the path to `/mnt/external-photos`
4. Click "Scan Library"

Immich indexes the existing photos without duplicating them.

## Nginx Reverse Proxy with HTTPS

```bash
sudo apt install -y nginx certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot certonly --nginx -d photos.example.com

sudo nano /etc/nginx/sites-available/immich
```

```nginx
# Immich Nginx reverse proxy
server {
    listen 80;
    server_name photos.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name photos.example.com;

    ssl_certificate     /etc/letsencrypt/live/photos.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/photos.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    # Large uploads for high-resolution photos and videos
    client_max_body_size 50000m;
    client_body_buffer_size 512k;
    client_body_timeout 600s;

    # Proxy settings
    proxy_read_timeout 600s;
    proxy_send_timeout 600s;
    proxy_buffer_size 128k;
    proxy_buffers 4 256k;

    location / {
        proxy_pass http://127.0.0.1:2283;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support for real-time updates
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/immich /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## Mobile App Setup

Download the Immich app for iOS or Android from the official app stores.

Configuration:
1. Open the app
2. Enter Server URL: `https://photos.example.com`
3. Create an account or log in
4. Enable Auto Backup in the app settings

The app backs up new photos automatically over WiFi (configurable to include mobile data). Videos can be excluded or included per your preference.

## Managing Storage

Immich stores original photos unchanged in the upload directory, plus thumbnails and transcoded versions. Plan for roughly 2-3x your original library size in storage requirements.

```bash
# Check current storage usage by Immich
du -sh /var/lib/immich/upload/
du -sh /var/lib/immich/thumbs/
du -sh /var/lib/immich/encoded-video/

# Check database size
docker compose exec database psql -U postgres -c "\l+" immich
```

### Storage Cleanup

```bash
# Remove orphaned files (photos without database entries and vice versa)
# Run this through the Immich CLI (bundled in the immich-server container)
docker compose exec immich-server immich-admin library cleanup

# The web UI also has a "Storage Template Migration" job under Administration > Jobs
```

## Using Machine Learning Features

Immich's machine learning container handles:
- **Facial recognition** - groups photos by people
- **CLIP search** - semantic search (find photos by describing what's in them)
- **Smart albums** - auto-generated albums for events

These features require the `immich-machine-learning` container to be running and have sufficient CPU/RAM. The first run downloads model files (~1-2GB).

```bash
# Check machine learning container status
docker compose ps immich-machine-learning
docker compose logs immich-machine-learning | tail -20

# Force a re-sync of machine learning jobs
# In the web UI: Administration > Jobs > Smart Search > Run all
```

For GPU acceleration (significantly speeds up ML processing):

```bash
# For NVIDIA GPU, use the CUDA version of the ML container
# Edit docker-compose.yml to add GPU support:
services:
  immich-machine-learning:
    # ... existing config ...
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    environment:
      - MACHINE_LEARNING_DEVICE=cuda
```

## Backup Strategy

```bash
# Create a backup script for Immich
cat > /opt/immich/backup.sh << 'SCRIPT'
#!/bin/bash
BACKUP_DIR="/backup/immich"
DATE=$(date +%Y%m%d-%H%M)

mkdir -p "$BACKUP_DIR"

# Backup PostgreSQL database (most critical - contains all metadata)
docker compose -f /opt/immich/docker-compose.yml exec -T database \
  pg_dumpall -U postgres | gzip > "$BACKUP_DIR/immich-db-${DATE}.sql.gz"

echo "Database backup: $BACKUP_DIR/immich-db-${DATE}.sql.gz"

# Photo originals are in /var/lib/immich/upload/
# Sync to backup location using rsync (preserves changed files only)
rsync -av --delete /var/lib/immich/upload/ /backup/immich/photos/

# Remove DB backups older than 30 days
find "$BACKUP_DIR" -name "immich-db-*.sql.gz" -mtime +30 -delete

echo "Backup completed at $(date)"
SCRIPT

chmod +x /opt/immich/backup.sh

# Schedule daily backups
echo "0 3 * * * root /opt/immich/backup.sh >> /var/log/immich-backup.log 2>&1" | \
  sudo tee /etc/cron.d/immich-backup
```

## Updating Immich

Immich updates frequently. Check the GitHub releases page for breaking changes before updating.

```bash
cd /opt/immich

# Pull latest images
docker compose pull

# Restart with new images (Immich applies database migrations automatically)
docker compose up -d

# Verify the update
docker compose ps
docker compose logs immich-server | tail -20

# Check the Immich version in the web UI: Administration > System Info
```

## Troubleshooting

**Thumbnails not generating:**
```bash
# Check microservices logs
docker compose logs immich-microservices | grep -i error

# Manually trigger thumbnail regeneration
# Administration > Jobs > Thumbnail Generation > Run all
```

**Machine learning container crashing:**
```bash
# Usually an out-of-memory issue
docker stats immich-machine-learning

# Reduce ML model size in Administration > Machine Learning settings
# Or increase Docker memory limits
```

**Photos not appearing after upload:**
```bash
# Check if the upload completed successfully in the server logs
docker compose logs immich-server | grep -i "upload\|error"

# Verify storage permissions
ls -la /var/lib/immich/upload/
sudo chown -R 1000:1000 /var/lib/immich/
```

## Summary

Immich is the most complete self-hosted photo management solution available today. The Docker Compose setup handles all the moving parts cleanly, and the mobile apps provide a backup experience comparable to Google Photos. The machine learning features - smart search and facial recognition - work surprisingly well without requiring a GPU, though performance improves significantly with one. Planning your storage layout upfront and running regular database backups are the most important operational considerations.
