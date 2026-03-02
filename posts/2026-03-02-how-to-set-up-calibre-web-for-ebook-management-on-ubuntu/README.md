# How to Set Up Calibre-Web for eBook Management on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Calibre-Web, Self-Hosted, eBook, Docker

Description: Install Calibre-Web on Ubuntu to create a self-hosted eBook library with a web interface, OPDS catalog support for e-reader apps, and send-to-Kindle functionality.

---

Calibre-Web is a web frontend for Calibre eBook libraries. Calibre itself manages the book database and metadata; Calibre-Web provides a polished web interface for browsing, reading, and downloading books from that library. The combination gives you a self-hosted eBook management system accessible from any browser or e-reader that supports OPDS catalogs.

This setup is common for home media servers - run Calibre on a desktop to manage your library, point Calibre-Web at the Calibre library folder on a server, and access your books from anywhere.

## How It Works

Calibre creates and maintains a `metadata.db` SQLite database alongside your eBook files. Calibre-Web reads this database and the book files directly. Important: you run either Calibre or Calibre-Web against the library at any given time; having both writing simultaneously can corrupt the database.

For a server setup where Calibre runs elsewhere (a desktop or NAS), you mount the Calibre library as a read-only network share or local directory, and Calibre-Web reads it.

## Option 1: Docker Installation (Recommended)

```bash
# Create directory for Calibre-Web
sudo mkdir -p /opt/calibre-web

# Create your books directory (or point to existing Calibre library)
sudo mkdir -p /opt/calibre-web/books

# If you have an existing Calibre library, copy or mount it here
# The directory must contain metadata.db (Calibre's database)
```

### Docker Compose Setup

```bash
cat > /opt/calibre-web/docker-compose.yml << 'EOF'
version: "3.8"

services:
  calibre-web:
    image: lscr.io/linuxserver/calibre-web:latest
    container_name: calibre-web
    restart: unless-stopped
    environment:
      # PUID/PGID: match the user/group that owns your books directory
      - PUID=1000
      - PGID=1000
      - TZ=America/New_York
      # Optional: enable Calibre CLI for book conversion (adds ~100MB to image)
      - DOCKER_MODS=linuxserver/mods:universal-calibre
    volumes:
      # Calibre-Web config directory
      - /opt/calibre-web/config:/config
      # Your Calibre library directory (must contain metadata.db)
      - /opt/calibre-web/books:/books
    ports:
      - "127.0.0.1:8083:8083"
EOF

docker compose -f /opt/calibre-web/docker-compose.yml up -d
docker compose -f /opt/calibre-web/docker-compose.yml logs -f
```

## Option 2: Direct Installation with pip

For running without Docker:

```bash
# Install system dependencies
sudo apt update
sudo apt install -y \
  python3 \
  python3-pip \
  python3-venv \
  libmagic1 \
  imagemagick \
  ghostscript

# Create a dedicated user
sudo useradd -r -m -s /bin/bash -d /opt/calibre-web calibreweb

# Create virtual environment
sudo -u calibreweb python3 -m venv /opt/calibre-web/venv

# Install Calibre-Web
sudo -u calibreweb /opt/calibre-web/venv/bin/pip install calibreweb[gdrive,metadata]

# Create config and books directories
sudo mkdir -p /opt/calibre-web/{config,books}
sudo chown -R calibreweb:calibreweb /opt/calibre-web
```

Create systemd service:

```bash
sudo nano /etc/systemd/system/calibre-web.service
```

```ini
[Unit]
Description=Calibre-Web eBook Library
After=network.target

[Service]
Type=simple
User=calibreweb
Group=calibreweb
ExecStart=/opt/calibre-web/venv/bin/cps \
    --config-file /opt/calibre-web/config/app.db \
    --port 8083
WorkingDirectory=/opt/calibre-web
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now calibre-web
```

## Nginx Reverse Proxy

```bash
sudo apt install -y nginx

sudo nano /etc/nginx/sites-available/calibre-web
```

```nginx
# Calibre-Web Nginx reverse proxy
server {
    listen 80;
    server_name books.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name books.example.com;

    ssl_certificate     /etc/letsencrypt/live/books.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/books.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    # Allow large eBook uploads
    client_max_body_size 100m;

    location / {
        proxy_pass http://127.0.0.1:8083;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Disable buffering for smooth downloads
        proxy_buffering off;
        proxy_read_timeout 300s;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/calibre-web /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d books.example.com
```

## Initial Setup

Visit `https://books.example.com` and log in with:
- Username: `admin`
- Password: `admin123`

**Change the admin password immediately** in Admin > Edit User.

### Pointing to Your Calibre Library

On first setup:
1. Go to Admin > Basic Configuration
2. Set "Location of Calibre Database" to `/books` (the path inside the container, or your actual library path for direct install)
3. Save

Calibre-Web reads `metadata.db` from this path and displays your library.

### What If You Don't Have a Calibre Library Yet?

If you're starting fresh without an existing Calibre library, you need to create one:

```bash
# Install Calibre (the desktop application that manages the library)
sudo apt install -y calibre

# Create an empty library
calibredb add --with-library /opt/calibre-web/books /dev/null 2>/dev/null || true
# This creates the metadata.db file that Calibre-Web needs

# Or simply point Calibre-Web at an empty directory and upload books via the web UI
# Calibre-Web can create the initial database when uploading the first book
```

## Adding Books

### Via the Web Interface

1. Log in as admin
2. Click the upload icon (top right)
3. Drag and drop eBook files (EPUB, PDF, MOBI, AZW, CBZ supported)

Calibre-Web imports the file and extracts metadata automatically.

### Via the Calibre Desktop Application

If Calibre desktop is running on a separate machine with the library mounted via network share, add books there. Calibre-Web picks up changes when it refreshes its view of `metadata.db`.

```bash
# Restart Calibre-Web to re-read the library database
docker compose -f /opt/calibre-web/docker-compose.yml restart calibre-web
```

## Setting Up OPDS for E-Readers

OPDS (Open Publication Distribution System) is a catalog format supported by most e-reader apps (Koreader, Moon+ Reader, Kybook, etc.) and the Kindle app.

Enable it in Calibre-Web:
1. Admin > Edit User (your user) > Allow OPDS Access
2. The OPDS catalog URL is: `https://books.example.com/opds`

Configure in your e-reader app:
- Catalog URL: `https://books.example.com/opds`
- Username and password: your Calibre-Web credentials

### Using Calibre-Web with Kobo

For Kobo e-readers, Calibre-Web includes a Kobo sync integration:

1. Admin > Basic Configuration > Feature Configuration > Kobo Sync: Enable
2. Edit your user > API Key: generate a key
3. In the Kobo settings, add a library with URL: `https://books.example.com/kobo/<api-key>/`

This syncs your Calibre library to your Kobo device over the network.

## Send-to-Kindle via Email

Configure Calibre-Web to send books to your Kindle via Amazon's Send-to-Kindle email:

1. Admin > Basic Configuration > Email Server:
   - SMTP Server: your email provider's SMTP
   - Port: 587
   - Encryption: TLS
   - User: your email address
   - Password: app password

2. Admin > Basic Configuration > Goodreads/Send-to-Kindle:
   - From: `your-from-email@example.com`

3. Edit your user > Kindle Email: `your-kindle@kindle.com`

Then from any book page, use the Send button to push directly to Kindle.

## User Management

Create accounts for family members or team members:

1. Admin > User Management > Create User
2. Set username, password, email
3. Assign permissions (download, upload, edit, admin)

For a read-only public instance:
- Enable anonymous browsing: Admin > Basic Configuration > Allow anonymous browsing

## Metadata Editing

Fix or update book metadata directly in Calibre-Web:
1. Click any book to open its detail page
2. Click the edit icon
3. Update title, author, cover, tags, publication date, etc.

Changes are written to the Calibre database (if you've enabled write access) and sync back to Calibre desktop on the next open.

## Backup

```bash
# Backup script for Calibre-Web
cat > /opt/calibre-web/backup.sh << 'SCRIPT'
#!/bin/bash
BACKUP_DIR="/backup/calibre-web"
DATE=$(date +%Y%m%d)

mkdir -p "$BACKUP_DIR"

# Backup the Calibre library (books and metadata.db)
rsync -av --delete /opt/calibre-web/books/ "$BACKUP_DIR/books/"

# Backup Calibre-Web config
tar -czf "$BACKUP_DIR/calibre-web-config-${DATE}.tar.gz" /opt/calibre-web/config/

# Remove old config backups
find "$BACKUP_DIR" -name "calibre-web-config-*.tar.gz" -mtime +30 -delete

echo "Calibre-Web backup completed: $(date)"
SCRIPT
chmod +x /opt/calibre-web/backup.sh

echo "0 4 * * * root /opt/calibre-web/backup.sh >> /var/log/calibre-backup.log 2>&1" | \
  sudo tee /etc/cron.d/calibre-backup
```

## Troubleshooting

**"Database error: Could not load library":**
Check that the `books` directory contains a `metadata.db` file and that the container/process has read access to it.

```bash
ls -la /opt/calibre-web/books/metadata.db
# If missing, you need to initialize a Calibre library first
```

**Books not showing after adding via Calibre desktop:**
```bash
# Restart Calibre-Web to force a database re-read
docker compose -f /opt/calibre-web/docker-compose.yml restart calibre-web
```

**Send-to-Kindle not working:**
Ensure the sending email address is in Amazon's approved senders list for the Kindle device.

## Summary

Calibre-Web on Ubuntu turns your Calibre library into a network-accessible eBook service. The OPDS catalog support means you can browse and download books directly from any compatible e-reader app, and the Kobo sync integration handles wireless book delivery to Kobo devices. For households with multiple readers or a large eBook collection, it removes the need to manually manage files across devices.
