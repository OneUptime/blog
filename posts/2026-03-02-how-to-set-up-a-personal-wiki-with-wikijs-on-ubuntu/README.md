# How to Set Up a Personal Wiki with Wiki.js on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Wiki.js, Self-Hosted, Knowledge Management, Documentation

Description: Install Wiki.js on Ubuntu with PostgreSQL, configure Nginx as a reverse proxy, set up Git-based content sync, and customize the wiki for personal or team knowledge management.

---

Wiki.js is a modern, open-source wiki platform that stores content in a PostgreSQL database while optionally syncing pages to a Git repository. It supports Markdown, HTML, AsciiDoc, and a visual editor, making it accessible to both technical and non-technical contributors. For self-hosted knowledge management - whether personal notes, team documentation, or a project wiki - Wiki.js hits a good balance between features and ease of setup.

## System Requirements

- Ubuntu 22.04 or 24.04
- Node.js 18 or 20 (for direct installation) or Docker
- PostgreSQL 13+
- 1GB RAM minimum (2GB recommended for comfortable operation)

This guide covers both direct installation and Docker Compose installation.

## Method 1: Direct Installation

### Installing PostgreSQL

```bash
# Install PostgreSQL
sudo apt update && sudo apt install -y postgresql postgresql-contrib

sudo systemctl enable --now postgresql

# Create database and user
sudo -u postgres psql << 'EOF'
CREATE USER wikijs WITH PASSWORD 'strong-db-password';
CREATE DATABASE wiki OWNER wikijs;
GRANT ALL PRIVILEGES ON DATABASE wiki TO wikijs;
\q
EOF
```

### Installing Node.js

```bash
# Install Node.js 20 from NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash
sudo apt install -y nodejs

# Verify
node --version
npm --version
```

### Installing Wiki.js

```bash
# Create a dedicated user
sudo useradd -r -m -s /bin/bash -d /opt/wikijs wikijs

# Download Wiki.js
sudo mkdir -p /opt/wikijs
cd /opt/wikijs
sudo -u wikijs wget "https://github.com/requarks/wiki/releases/latest/download/wiki-js.tar.gz"
sudo -u wikijs tar xzf wiki-js.tar.gz
sudo -u wikijs rm wiki-js.tar.gz

# Create configuration file
sudo -u wikijs cp config.sample.yml config.yml
sudo -u wikijs nano config.yml
```

Edit `config.yml`:

```yaml
# Wiki.js configuration
db:
  type: postgres
  host: localhost
  port: 5432
  user: wikijs
  pass: strong-db-password
  db: wiki
  ssl: false

bindIP: 127.0.0.1  # Listen locally only (Nginx proxies)
port: 3000
name: 'My Wiki'

logLevel: info
logFormat: default
```

### Create systemd Service

```bash
sudo nano /etc/systemd/system/wikijs.service
```

```ini
[Unit]
Description=Wiki.js
After=network.target postgresql.service

[Service]
Type=simple
User=wikijs
WorkingDirectory=/opt/wikijs
ExecStart=/usr/bin/node server
Restart=always
RestartSec=10
Environment=NODE_ENV=production

StandardOutput=journal
StandardError=journal
SyslogIdentifier=wikijs

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now wikijs
sudo systemctl status wikijs

# View logs
sudo journalctl -u wikijs -f
```

## Method 2: Docker Compose Installation

```bash
# Create directory
sudo mkdir -p /opt/wikijs
cd /opt/wikijs

# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: "3.8"
services:
  db:
    image: postgres:16-alpine
    container_name: wikijs-db
    restart: unless-stopped
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: wiki
      POSTGRES_USER: wikijs
      POSTGRES_PASSWORD: strong-db-password

  wiki:
    image: ghcr.io/requarks/wiki:2
    container_name: wikijs
    restart: unless-stopped
    depends_on:
      - db
    ports:
      - "127.0.0.1:3000:3000"
    environment:
      DB_TYPE: postgres
      DB_HOST: db
      DB_PORT: 5432
      DB_USER: wikijs
      DB_PASS: strong-db-password
      DB_NAME: wiki

volumes:
  pgdata:
EOF

docker compose up -d
docker compose logs -f wiki
```

## Configuring Nginx with HTTPS

```bash
sudo apt install -y nginx certbot python3-certbot-nginx

sudo nano /etc/nginx/sites-available/wikijs
```

```nginx
# Wiki.js Nginx reverse proxy
server {
    listen 80;
    server_name wiki.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name wiki.example.com;

    ssl_certificate     /etc/letsencrypt/live/wiki.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/wiki.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;

    # Larger uploads for images and attachments
    client_max_body_size 25m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support for real-time editor features
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_read_timeout 300s;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/wikijs /etc/nginx/sites-enabled/
sudo certbot --nginx -d wiki.example.com
sudo nginx -t && sudo systemctl reload nginx
```

## Initial Setup

Visit `https://wiki.example.com` - Wiki.js shows the setup wizard on first run:

1. Create the admin account (email and password)
2. Choose the site name
3. Complete setup

After setup, log into the admin panel at `https://wiki.example.com/_admin`.

## Key Administration Areas

### Content Editors

Wiki.js supports multiple editing modes per page:
- **Markdown** - standard Markdown syntax
- **Visual Editor** - WYSIWYG TipTap-based editor
- **Raw HTML** - direct HTML editing
- **AsciiDoc** - for technical documentation

Configure available editors in: Admin > Editors

### Storage Sync with Git

One of Wiki.js's best features is syncing page content to a Git repository. This gives you version history, ability to edit in external tools, and a backup.

In Admin > Storage > Git:

```yaml
# Git storage configuration (set in Wiki.js admin UI)
# Repository URL: git@github.com:youruser/wiki-content.git
# Authentication Type: SSH
# Private Key: (paste your SSH private key)
# Branch: main
# Pull Direction: Two-Way (push local changes, pull remote changes)
# Sync Interval: 5m
```

Generate an SSH key for Wiki.js:

```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "wikijs@your-server" -f /tmp/wikijs_ssh_key -N ""

# Add the public key to your Git repository as a deploy key (with write access)
cat /tmp/wikijs_ssh_key.pub

# Paste the private key into the Wiki.js Git storage configuration
cat /tmp/wikijs_ssh_key
```

### User Authentication

Wiki.js supports multiple authentication strategies:

**Local authentication** (default) - username/password stored in the database

**LDAP/Active Directory** - useful for corporate environments:
In Admin > Authentication > Add Strategy > LDAP

**GitHub/Google/Slack OAuth** - enable social login:
In Admin > Authentication > Add Strategy > choose provider

### Access Control

Set page and group permissions in Admin > Groups:
- Create groups (e.g., "Staff", "External Contributors", "Read-Only")
- Assign users to groups
- Set read/write permissions per path (e.g., `/public/*` is readable by guests, `/internal/*` requires authentication)

## Writing and Organizing Content

### Page Structure

Wiki.js organizes pages by path. Suggested structure for a team wiki:

```
/
├── getting-started
│   ├── onboarding
│   └── tools-setup
├── projects
│   ├── project-alpha
│   │   ├── overview
│   │   ├── architecture
│   │   └── runbook
│   └── project-beta
├── operations
│   ├── deployments
│   ├── incident-response
│   └── on-call
└── engineering
    ├── coding-standards
    ├── code-review
    └── technical-decisions
```

### Creating Pages via Markdown

Click the pencil icon to create a new page, select Markdown editor, and write:

```markdown
# API Rate Limiting Architecture

**Last updated:** 2026-03-02
**Owner:** Platform Team

## Overview

This document describes how rate limiting is implemented across our API services.

## Architecture

Rate limits are enforced at the API gateway level using Redis as the backing store.
Each API key has a configurable limit defined in the service configuration.

## Configuration

Add rate limit configuration to `config/api-gateway.yml`:

​```yaml
rate_limits:
  default:
    requests_per_minute: 100
    burst: 150
  premium:
    requests_per_minute: 1000
    burst: 1200
​```

## Monitoring

Rate limit violations are logged to the `api-gateway` namespace.
Query in your log aggregator: `namespace:api-gateway level:warn "rate limit exceeded"`
```

## Search Configuration

Wiki.js uses a built-in search engine. For larger wikis, configure Elasticsearch or OpenSearch for better search performance:

In Admin > Search Engine:
- Built-in (Lunr.js) - works well for smaller wikis (< 1000 pages)
- Elasticsearch - recommended for larger wikis

## Backup

```bash
# For direct installation, backup the database
sudo -u postgres pg_dump wiki > /backup/wiki-$(date +%Y%m%d).sql

# For Docker installation
docker compose exec db pg_dump -U wikijs wiki > /backup/wiki-$(date +%Y%m%d).sql

# If using Git storage, the content is also backed up in your Git repository

# Schedule automated backups
cat > /etc/cron.d/wikijs-backup << 'EOF'
0 3 * * * root docker compose -f /opt/wikijs/docker-compose.yml exec -T db pg_dump -U wikijs wiki > /backup/wiki-$(date +\%Y\%m\%d).sql
30 3 * * * root find /backup -name "wiki-*.sql" -mtime +30 -delete
EOF
```

## Updating Wiki.js

```bash
# For Docker installation - pull latest image
cd /opt/wikijs
docker compose pull
docker compose up -d

# For direct installation
sudo systemctl stop wikijs
cd /opt/wikijs
sudo -u wikijs wget "https://github.com/requarks/wiki/releases/latest/download/wiki-js.tar.gz"
sudo -u wikijs tar xzf wiki-js.tar.gz
sudo -u wikijs rm wiki-js.tar.gz
sudo systemctl start wikijs
```

## Summary

Wiki.js on Ubuntu provides a polished wiki platform with good performance and a clean writing experience. The combination of a visual editor and Markdown support makes it accessible to team members who aren't comfortable with raw markup. The Git storage sync is particularly useful - it keeps a plain-text backup of all your wiki content in a Git repository, gives you full revision history, and lets you bulk-edit content outside the wiki UI when needed.
