# How to Set Up Linkding for Bookmark Management on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linkding, Self-Hosted, Bookmark Manager, Docker

Description: Install Linkding on Ubuntu using Docker to create a fast, minimal self-hosted bookmark manager with tagging, full-text search, browser extensions, and multi-user support.

---

Linkding is a minimal, fast self-hosted bookmark manager. It stores URLs with titles, descriptions, and tags, makes them searchable, and provides browser extensions for quick saving. It's intentionally simple - no social features, no feeds, no distractions. If you want a clean place to organize links without relying on browser sync or a cloud service, Linkding does exactly that.

## What Linkding Provides

- Web interface for browsing and searching bookmarks
- Tag-based organization
- Full-text search across titles, descriptions, URLs, and tags
- Browser extensions (Chrome and Firefox) for one-click bookmarking
- REST API for programmatic access
- Import from Netscape bookmark format (compatible with most browsers and services)
- Multi-user support with separate bookmark collections per user
- Guest sharing for publicly sharing bookmark collections

## Prerequisites

```bash
# Install Docker and Docker Compose
sudo apt update
sudo apt install -y docker.io docker-compose-plugin

sudo systemctl enable --now docker
sudo usermod -aG docker $USER
# Log out and back in for group change
```

## Installing Linkding with Docker Compose

```bash
# Create directory for Linkding
sudo mkdir -p /opt/linkding/data
sudo chown $USER:$USER /opt/linkding
cd /opt/linkding
```

Create `docker-compose.yml`:

```yaml
# Linkding Docker Compose
version: "3.8"

services:
  linkding:
    image: sissbruecker/linkding:latest
    container_name: linkding
    restart: unless-stopped
    ports:
      - "127.0.0.1:9090:9090"  # Expose locally only (Nginx proxies)
    volumes:
      # Persistent data directory (SQLite database and file uploads)
      - ./data:/etc/linkding/data
    environment:
      # Create admin user on first run
      LD_SUPERUSER_NAME: admin
      LD_SUPERUSER_PASSWORD: your-strong-password-here

      # Optional: disable public registration
      LD_DISABLE_BACKGROUND_TASKS: "False"

      # Optional: enable HTTPS redirect
      LD_ENABLE_AUTH_PROXY: "False"

      # Context path if running under a subpath (e.g., /bookmarks)
      # LD_CONTEXT_PATH: bookmarks/
```

```bash
# Start Linkding
docker compose up -d

# Check startup logs
docker compose logs -f linkding

# Verify it's listening
curl -I http://127.0.0.1:9090
```

Linkding is now running on `http://127.0.0.1:9090`.

## Nginx Reverse Proxy with HTTPS

```bash
sudo apt install -y nginx certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot certonly --nginx -d bookmarks.example.com

sudo nano /etc/nginx/sites-available/linkding
```

```nginx
# Linkding Nginx reverse proxy
server {
    listen 80;
    server_name bookmarks.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name bookmarks.example.com;

    ssl_certificate     /etc/letsencrypt/live/bookmarks.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bookmarks.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options SAMEORIGIN;

    location / {
        proxy_pass http://127.0.0.1:9090;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/linkding /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## Initial Setup and First Login

Visit `https://bookmarks.example.com` and log in with the admin credentials you set in the Docker Compose environment variables.

After logging in:
1. Change your password: Profile (top right) > Change Password
2. Explore the settings: Profile > Settings

## Adding Bookmarks

### Via the Web Interface

Click the "+" button or use the keyboard shortcut `a` to open the add bookmark form:
- URL: the link to save
- Title: auto-fetched from the page, or enter manually
- Description: optional notes about the link
- Tags: comma-separated tags for organization

```
URL: https://docs.docker.com/compose/reference/
Title: Docker Compose CLI Reference
Description: Complete reference for docker compose commands
Tags: docker, reference, docs, devops
```

### Batch Import from Browser

Export your browser bookmarks to HTML format (Netscape bookmark file) and import them:

1. In Chrome/Firefox: Bookmarks > Export Bookmarks (saves as HTML)
2. In Linkding: Settings > Import > Choose file > Import

Large imports process in the background - you can continue using Linkding while it runs.

### Import from Pinboard, Pocket, or Raindrop

These services also export in Netscape HTML format, so the same import process works.

## Browser Extensions

Install the Linkding extension for one-click bookmarking from any page:

**Firefox:**
Search "linkding" in the Firefox Add-ons site, or visit:
`https://addons.mozilla.org/en-US/firefox/addon/linkding-extension/`

**Chrome/Chromium/Brave:**
Search "linkding" in the Chrome Web Store.

Configure the extension:
1. Open extension settings
2. Linkding URL: `https://bookmarks.example.com`
3. API Token: (get from Linkding > Settings > Integrations > Generate token)

After configuration, click the extension icon on any page to save it to Linkding, pre-filled with the page title and URL.

## Organizing with Tags

Tags are the primary organization mechanism. Some useful patterns:

**Topic tags:** `devops`, `python`, `databases`, `security`
**Status tags:** `to-read`, `read`, `reference`, `archived`
**Project tags:** `project-alpha`, `homelab`, `work`
**Type tags:** `tutorial`, `documentation`, `article`, `tool`

### Searching by Tags

In the search bar:
- `#docker` - show all bookmarks tagged "docker"
- `#docker #devops` - show bookmarks tagged both "docker" and "devops"
- `nginx` - full-text search for "nginx" in all fields

The search is fast even with thousands of bookmarks because Linkding uses SQLite's FTS5 full-text search extension.

## REST API

Linkding has a full REST API useful for automation, bulk operations, and integrations.

```bash
# Get your API token from Settings > Integrations
API_TOKEN="your-api-token"
BASE_URL="https://bookmarks.example.com"

# List all bookmarks
curl -H "Authorization: Token $API_TOKEN" \
  "$BASE_URL/api/bookmarks/" | python3 -m json.tool

# Add a bookmark programmatically
curl -X POST \
  -H "Authorization: Token $API_TOKEN" \
  -H "Content-Type: application/json" \
  "$BASE_URL/api/bookmarks/" \
  -d '{
    "url": "https://example.com/article",
    "title": "Example Article",
    "description": "An interesting article about examples",
    "tag_names": ["example", "interesting"],
    "is_archived": false
  }'

# Search bookmarks
curl -H "Authorization: Token $API_TOKEN" \
  "$BASE_URL/api/bookmarks/?q=docker" | python3 -m json.tool

# Get all bookmarks with a specific tag
curl -H "Authorization: Token $API_TOKEN" \
  "$BASE_URL/api/bookmarks/?q=%23devops" | python3 -m json.tool
```

### Automating Bookmark Saving with Scripts

```bash
#!/bin/bash
# Script to save a URL to Linkding from the command line
# Usage: ./save-bookmark.sh "https://url.com" "Optional title" "tag1,tag2"

API_TOKEN="your-api-token"
BASE_URL="https://bookmarks.example.com"

URL="$1"
TITLE="${2:-}"
TAGS="${3:-}"

# Convert comma-separated tags to JSON array
TAGS_JSON=$(echo "$TAGS" | python3 -c "
import sys, json
tags = [t.strip() for t in sys.stdin.read().strip().split(',') if t.strip()]
print(json.dumps(tags))
")

curl -s -X POST \
  -H "Authorization: Token $API_TOKEN" \
  -H "Content-Type: application/json" \
  "$BASE_URL/api/bookmarks/" \
  -d "{\"url\": \"$URL\", \"title\": \"$TITLE\", \"tag_names\": $TAGS_JSON}"

echo "Saved: $URL"
```

## Setting Up Additional Users

```bash
# Create additional users via Docker exec
docker compose exec linkding python manage.py createsuperuser
# Follow prompts for username, email, password

# Or create a regular (non-admin) user via the admin interface:
# Visit https://bookmarks.example.com/settings/users/add
# Fill in username and password
```

Each user has a completely separate bookmark collection. Users can optionally share a public bookmark list (useful for sharing curated link collections).

## Guest Access for Public Sharing

Enable a public view of bookmarks:

1. Settings > General > Enable Public Sharing
2. Mark specific bookmarks as "Shared"
3. Public URL: `https://bookmarks.example.com/public/<username>/`

This lets you share a curated reading list or resource collection without requiring the visitor to log in.

## Export and Backup

```bash
# Export bookmarks to Netscape HTML format via API
curl -H "Authorization: Token $API_TOKEN" \
  "https://bookmarks.example.com/api/bookmarks/?format=html&limit=10000" \
  -o bookmarks-export-$(date +%Y%m%d).html

# Or export all bookmarks as JSON
curl -H "Authorization: Token $API_TOKEN" \
  "https://bookmarks.example.com/api/bookmarks/?limit=10000" \
  -o bookmarks-$(date +%Y%m%d).json

# Backup the entire data directory (includes SQLite database)
tar -czf linkding-backup-$(date +%Y%m%d).tar.gz /opt/linkding/data/

# Schedule daily backup
echo "0 4 * * * $USER tar -czf /backup/linkding-\$(date +\%Y\%m\%d).tar.gz /opt/linkding/data/ >> /var/log/linkding-backup.log 2>&1" | \
  crontab -
```

## Updating Linkding

```bash
cd /opt/linkding

# Pull the latest image
docker compose pull

# Recreate the container with the new image
# Linkding applies any database migrations automatically on startup
docker compose up -d

# Check logs to confirm successful startup
docker compose logs linkding | tail -20

# Verify the version in Settings > General
```

## Troubleshooting

**Can't log in after first install:**
```bash
# Reset admin password
docker compose exec linkding python manage.py changepassword admin
```

**Browser extension not connecting:**
Verify the API token in Settings > Integrations. The extension needs both the correct server URL (with https://) and a valid token.

**Import processing slowly:**
```bash
# Check import progress in the background task queue
docker compose logs linkding | grep -i import
# Large imports (10,000+ bookmarks) can take several minutes
```

**Database size growing large:**
```bash
# Run SQLite vacuum to reclaim space after deleting many bookmarks
docker compose exec linkding python manage.py dbshell
# In SQLite prompt:
# VACUUM;
# .quit
```

## Summary

Linkding is a well-designed minimal bookmark manager that stays out of your way. The browser extension handles day-to-day saving, the tag system handles organization, and the full-text search makes retrieval fast. Running it on Ubuntu in Docker takes about 10 minutes to set up, and the SQLite backend means there's no database service to maintain. For anyone who's been using browser sync or a cloud service to manage bookmarks and wants self-hosted control, Linkding is one of the easiest services to move to.
