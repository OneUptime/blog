# How to Install Paperless-ngx for Document Management on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Paperless-ngx, Self-Hosted, Document Management, Docker

Description: Install Paperless-ngx on Ubuntu using Docker Compose to create a searchable document archive with automatic OCR, tagging, and metadata extraction for going paperless at home or in a small office.

---

Paperless-ngx is an open-source document management system that scans, OCRs, and indexes your documents so you can find any piece of paper by searching its content. You scan or import documents, Paperless runs OCR on them, extracts text, automatically assigns tags based on content rules you define, and makes everything searchable. It replaces physical file cabinets with a searchable web interface and handles PDFs, images, and almost any document format.

## What Paperless-ngx Does

When you add a document (by scanning, uploading via the web UI, or dropping into a watched folder):
1. The document is stored in a secure archive
2. OCR extracts text from scanned PDFs and images
3. Metadata (title, date, correspondent) is auto-detected where possible
4. Tags are applied based on matching rules you configure
5. The full text becomes searchable

The result is a web interface where you can find a receipt from 2019 by typing "Home Depot fence posts" and get immediate results.

## Prerequisites

```bash
# Install Docker and Docker Compose
sudo apt update
sudo apt install -y docker.io docker-compose-plugin

sudo systemctl enable --now docker
sudo usermod -aG docker $USER
# Log out and back in for group change
```

## Docker Compose Setup

Paperless-ngx Docker Compose requires three services: the web server, a worker for background tasks, and a broker (Redis) for task queuing.

```bash
# Create Paperless directory
sudo mkdir -p /opt/paperless/{data,media,export,consume,pgdata}
sudo chown -R $USER:$USER /opt/paperless
cd /opt/paperless
```

Create `docker-compose.yml`:

```yaml
# Docker Compose for Paperless-ngx
version: "3.8"

services:
  broker:
    image: docker.io/library/redis:7
    container_name: paperless-redis
    restart: unless-stopped
    volumes:
      - redisdata:/data

  db:
    image: docker.io/library/postgres:16
    container_name: paperless-db
    restart: unless-stopped
    volumes:
      - ./pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: paperless
      POSTGRES_USER: paperless
      POSTGRES_PASSWORD: paperless-db-password

  webserver:
    image: ghcr.io/paperless-ngx/paperless-ngx:latest
    container_name: paperless-web
    restart: unless-stopped
    depends_on:
      - db
      - broker
      - gotenberg
      - tika
    ports:
      - "8010:8000"  # Web UI
    volumes:
      - ./data:/usr/src/paperless/data    # Application data
      - ./media:/usr/src/paperless/media  # Stored documents
      - ./export:/usr/src/paperless/export # Exported documents
      - ./consume:/usr/src/paperless/consume # Drop folder for new docs
    environment:
      PAPERLESS_REDIS: redis://broker:6379
      PAPERLESS_DBHOST: db
      PAPERLESS_DBNAME: paperless
      PAPERLESS_DBUSER: paperless
      PAPERLESS_DBPASS: paperless-db-password

      # Admin credentials for first login
      PAPERLESS_ADMIN_USER: admin
      PAPERLESS_ADMIN_PASSWORD: your-strong-password
      PAPERLESS_ADMIN_MAIL: admin@example.com

      # OCR language(s) - use ISO 639 codes
      # Install additional Tesseract language packs if needed
      PAPERLESS_OCR_LANGUAGE: eng
      # Multiple languages: PAPERLESS_OCR_LANGUAGE: eng+deu+fra

      # OCR mode: skip (only OCR non-searchable PDFs), redo, force
      PAPERLESS_OCR_MODE: skip

      # Time zone for correct date parsing
      PAPERLESS_TIME_ZONE: America/New_York

      # URL - important for correct links in the UI
      PAPERLESS_URL: https://docs.example.com

      # Secret key for Django security
      PAPERLESS_SECRET_KEY: generate-a-random-secret-key-here

      # Worker settings
      PAPERLESS_TASK_WORKERS: 2
      PAPERLESS_THREADS_PER_WORKER: 2

      # IMAP email consumption (optional)
      # PAPERLESS_EMAIL_TASK_CRON: "*/10 * * * *"

      # Filename format for stored documents
      PAPERLESS_FILENAME_FORMAT: "{created_year}/{correspondent}/{title}"

      # Enable barcode processing for automatic document splitting
      PAPERLESS_CONSUMER_ENABLE_BARCODES: "true"

      # Tika and Gotenberg for Office document support
      PAPERLESS_TIKA_ENABLED: 1
      PAPERLESS_TIKA_GOTENBERG_ENDPOINT: http://gotenberg:3000
      PAPERLESS_TIKA_ENDPOINT: http://tika:9998

  # Gotenberg converts Office documents to PDF
  gotenberg:
    image: docker.io/gotenberg/gotenberg:8.x
    container_name: paperless-gotenberg
    restart: unless-stopped
    command:
      - "gotenberg"
      - "--chromium-disable-javascript=true"
      - "--chromium-allow-list=file:///tmp/.*"

  # Tika extracts text from Office documents
  tika:
    image: docker.io/apache/tika:latest
    container_name: paperless-tika
    restart: unless-stopped

volumes:
  redisdata:
```

```bash
# Generate a secret key
python3 -c "import secrets; print(secrets.token_hex(50))"
# Add this to PAPERLESS_SECRET_KEY in docker-compose.yml

# Start Paperless-ngx
docker compose up -d

# Check that all services started
docker compose ps

# Watch logs during startup (takes a minute or two)
docker compose logs -f webserver
```

## Nginx Reverse Proxy

```bash
sudo nano /etc/nginx/sites-available/paperless
```

```nginx
# Paperless-ngx Nginx configuration
server {
    listen 80;
    server_name docs.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name docs.example.com;

    ssl_certificate     /etc/letsencrypt/live/docs.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/docs.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    # Large uploads for multi-page documents
    client_max_body_size 100m;

    location / {
        proxy_pass http://127.0.0.1:8010;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Long timeout for large document uploads
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/paperless /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

sudo certbot --nginx -d docs.example.com
```

## Getting Documents into Paperless

### Upload via Web UI

Visit `https://docs.example.com`, log in, and drag-and-drop documents onto the upload area or use the upload button.

### Consume Folder (Drop Folder)

Any document placed in the `/opt/paperless/consume/` directory is automatically processed:

```bash
# Copy a scanned document to the consume folder
cp ~/Downloads/receipt-2024.pdf /opt/paperless/consume/

# The worker processes it within seconds to a few minutes
# depending on document size and OCR workload
```

### Network Share for the Consume Folder

For a scanner on your network that can save to a network share:

```bash
# Install Samba
sudo apt install -y samba

# Configure Samba share pointing to the consume folder
sudo nano /etc/samba/smb.conf
```

```ini
[paperless-inbox]
   comment = Paperless Document Inbox
   path = /opt/paperless/consume
   browseable = yes
   read only = no
   create mask = 0664
   directory mask = 0775
   valid users = scanner-user
```

```bash
# Create the Samba user
sudo smbpasswd -a scanner-user
sudo systemctl restart smbd

# Configure your scanner to save to \\your-server\paperless-inbox
```

### Email Consumption

Configure Paperless to check an IMAP mailbox for documents:

```yaml
# In docker-compose.yml environment section:
environment:
  # ... other settings ...
  PAPERLESS_EMAIL_TASK_CRON: "*/10 * * * *"  # Check every 10 minutes
```

Configure email rules in the Paperless web UI at: Settings > Mail > Add Mail Account

## Setting Up Tags and Correspondents

After logging in, set up your organization structure:

### Automatic Tagging Rules

In the web UI: Settings > Tag > Add Tag, then configure matching rules:

- Tag: **Tax Documents**, Match: contains `W-2`, `1099`, `Schedule`, case-insensitive
- Tag: **Utilities**, Match: contains `electric bill`, `gas bill`, `water bill`
- Tag: **Medical**, Match: contains `diagnosis`, `prescription`, `insurance claim`

### Correspondent Matching

Correspondents are the sender or subject of a document (a company, person, or institution):

In Settings > Correspondents > Add Correspondent:
- Name: **Amazon**, Match: contains `amazon.com`, or `Amazon.com Services`
- Name: **Bank of America**, Match: contains `Bank of America`

When Paperless processes a document matching these rules, it automatically assigns the tag and correspondent.

## Mobile Access

The Paperless-ngx mobile app is available for iOS and Android. Configure it with:
- Server: `https://docs.example.com`
- Username and password

The app supports uploading photos of physical documents directly from your phone's camera.

## Backup

```bash
# Paperless export - creates human-readable JSON files alongside documents
docker compose exec webserver document_exporter /usr/src/paperless/export

# After export, back up the export directory
tar -czf paperless-export-$(date +%Y%m%d).tar.gz /opt/paperless/export/

# Full data backup (includes database, media files, and settings)
docker compose down

tar -czf paperless-full-backup-$(date +%Y%m%d).tar.gz \
  /opt/paperless/data \
  /opt/paperless/media \
  /opt/paperless/pgdata

docker compose up -d
```

## Troubleshooting

**OCR not working:**
```bash
# Check worker logs for OCR errors
docker compose logs webserver | grep -i ocr

# Verify Tesseract is available inside the container
docker compose exec webserver tesseract --list-langs
```

**Documents not being consumed:**
```bash
# Check the consume folder permissions
ls -la /opt/paperless/consume/

# Files must be readable by the container user (UID 1000)
sudo chown -R 1000:1000 /opt/paperless/consume/

# Check consumer logs
docker compose logs webserver | grep -i consumer
```

**Can't connect to the web UI:**
```bash
# Check that the webserver container is healthy
docker compose ps webserver

# View startup logs
docker compose logs --tail=100 webserver
```

## Summary

Paperless-ngx transforms document management from a physical filing problem into a searchable digital archive. The Docker Compose setup handles the OCR pipeline, full-text search, and web interface in a handful of containers that start reliably and stay out of your way. Once it's running, dropping documents into the consume folder or uploading via the web interface takes seconds, and finding any document by searching its content takes less than that.
