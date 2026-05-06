# How to Self-Host a Bookmark Manager with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Self-Hosted, Bookmarks, Linkwarden, Shiori, Productivity

Description: Deploy a self-hosted bookmark manager using Linkwarden or Shiori with Portainer to organize and archive your web bookmarks.

## Introduction

Self-hosted bookmark managers let you save, organize, and archive web pages permanently - without relying on browser sync or commercial services that may shut down. This guide covers Linkwarden (collaborative, with page archiving) and Shiori (lightweight, CLI-friendly) deployed through Portainer.

## Prerequisites

- Portainer installed and running
- Basic understanding of Docker Compose
- A reverse proxy for external access (optional)

## Option 1: Deploy Linkwarden

Linkwarden preserves full page archives (PDF + screenshots) alongside your bookmarks.

```yaml
# docker-compose.yml - Linkwarden with PostgreSQL

networks:
  bookmarks_network:
    driver: bridge

volumes:
  linkwarden_db:
  linkwarden_data:

services:
  # PostgreSQL database
  linkwarden_db:
    image: postgres:16-alpine
    container_name: linkwarden_db
    restart: unless-stopped
    environment:
      - POSTGRES_DB=linkwarden
      - POSTGRES_USER=linkwarden
      - POSTGRES_PASSWORD=secure_db_password
    volumes:
      - linkwarden_db:/var/lib/postgresql/data
    networks:
      - bookmarks_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U linkwarden"]
      interval: 10s
      retries: 5

  # Linkwarden application
  linkwarden:
    image: ghcr.io/linkwarden/linkwarden:latest
    container_name: linkwarden
    restart: unless-stopped
    depends_on:
      linkwarden_db:
        condition: service_healthy
    ports:
      - "3000:3000"
    environment:
      # Database connection string
      - DATABASE_URL=postgresql://linkwarden:secure_db_password@linkwarden_db:5432/linkwarden

      # NextAuth secret (generate with: openssl rand -base64 32)
      - NEXTAUTH_SECRET=your_random_secret_here
      - NEXTAUTH_URL=https://bookmarks.yourdomain.com/api/v1/auth

      # Disable registration after setup
      - NEXT_PUBLIC_DISABLE_REGISTRATION=false

      # Auto-archive settings
      - AUTOSCROLL_TIMEOUT=30

      # Storage for archives
      - STORAGE_FOLDER=/data/data
    volumes:
      - linkwarden_data:/data/data
    networks:
      - bookmarks_network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.linkwarden.rule=Host(`bookmarks.yourdomain.com`)"
      - "traefik.http.routers.linkwarden.entrypoints=websecure"
      - "traefik.http.routers.linkwarden.tls.certresolver=letsencrypt"
      - "traefik.http.services.linkwarden.loadbalancer.server.port=3000"
```

### Initial Linkwarden Setup

1. Access `http://server-ip:3000`
2. Register your account
3. Set `NEXT_PUBLIC_DISABLE_REGISTRATION=true` and redeploy to prevent others from signing up

### Import Existing Bookmarks

```bash
# Export bookmarks from browser as HTML
# Chrome: Settings > Bookmarks > Bookmark Manager > Export
# Firefox: Library > Bookmarks > All Bookmarks > Export

# Import via Linkwarden UI:
# Settings > Import/Export > Import Bookmarks > Upload HTML file
```

## Option 2: Deploy Shiori

Shiori is a simple, lightweight bookmark manager with CLI and web interface.

```yaml
# docker-compose.yml - Shiori

networks:
  bookmarks_network:
    driver: bridge

volumes:
  shiori_data:

services:
  shiori:
    image: ghcr.io/go-shiori/shiori:latest
    container_name: shiori
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      - SHIORI_HTTP_SECRET_KEY=replace_with_a_long_random_string
      - SHIORI_DIR=/data
      # Optional: Use PostgreSQL instead of SQLite
      # - SHIORI_DATABASE_URL=postgres://shiori:secure_password@shiori_db/shiori?sslmode=disable
    volumes:
      - shiori_data:/data
    networks:
      - bookmarks_network
```

### Shiori CLI Commands

```bash
# Add a bookmark
docker exec shiori shiori add https://example.com \
  --title "Example Site" \
  --tags tech,reference

# Search bookmarks
docker exec shiori shiori print -s "docker tutorial"

# Update bookmark metadata
docker exec shiori shiori update 1 --title "New Title"

# Delete bookmark
docker exec shiori shiori delete 1

# Export bookmarks
docker exec shiori shiori export /data/bookmarks.html
```

## Option 3: Deploy Wallabag (Read-It-Later)

```yaml
# docker-compose.yml - Wallabag

networks:
  bookmarks_network:
    driver: bridge

volumes:
  wallabag_db:
  wallabag_data:

services:
  wallabag_db:
    image: mariadb:10.11
    restart: unless-stopped
    environment:
      - MYSQL_ROOT_PASSWORD=rootpassword
      - MYSQL_DATABASE=wallabag
      - MYSQL_USER=wallabag
      - MYSQL_PASSWORD=wallabag_password
    volumes:
      - wallabag_db:/var/lib/mysql
    networks:
      - bookmarks_network

  wallabag:
    image: wallabag/wallabag:latest
    restart: unless-stopped
    ports:
      - "8080:80"
    environment:
      - MYSQL_ROOT_PASSWORD=rootpassword
      - SYMFONY__ENV__DATABASE_DRIVER=pdo_mysql
      - SYMFONY__ENV__DATABASE_HOST=wallabag_db
      - SYMFONY__ENV__DATABASE_PORT=3306
      - SYMFONY__ENV__DATABASE_NAME=wallabag
      - SYMFONY__ENV__DATABASE_USER=wallabag
      - SYMFONY__ENV__DATABASE_PASSWORD=wallabag_password
      - SYMFONY__ENV__DATABASE_CHARSET=utf8mb4
      - SYMFONY__ENV__MAILER_DSN=smtp://smtp-user:smtp-password@smtp.gmail.com
      - SYMFONY__ENV__FROM_EMAIL=noreply@yourdomain.com
      - SYMFONY__ENV__DOMAIN_NAME=https://read.yourdomain.com
      - SYMFONY__ENV__SERVER_NAME="Wallabag"
    volumes:
      - wallabag_data:/var/www/wallabag/web/assets/images
    depends_on:
      - wallabag_db
    networks:
      - bookmarks_network
```

## Browser Extension Integration

Install browser extensions for one-click bookmarking:

### Linkwarden Extension
- Chrome/Firefox: Install the official "Linkwarden" extension from the browser store
- Configure: Extension options > Cloud instance address > `https://bookmarks.yourdomain.com`
- Sign in with your Linkwarden username/email and password

### Shiori Extension
```bash
# Install the official browser extension
# https://github.com/go-shiori/shiori-web-ext/releases

# Configure with your server URL:
# Server URL: http://server-ip:8080
# Username: your-username
# Password: your-password
```

## Backup Your Bookmarks

```bash
#!/bin/bash
# backup-bookmarks.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups/bookmarks"
mkdir -p "$BACKUP_DIR"

# Backup Linkwarden database
docker exec linkwarden_db pg_dump -U linkwarden linkwarden | \
  gzip > "$BACKUP_DIR/linkwarden_db_$DATE.sql.gz"

# Backup archived pages
tar -czf "$BACKUP_DIR/linkwarden_data_$DATE.tar.gz" \
  $(docker volume inspect linkwarden_data -f '{{ .Mountpoint }}')

# Rotate (keep 30 days)
find "$BACKUP_DIR" -mtime +30 -delete
```

## Conclusion

You now have a private, self-hosted bookmark manager that archives web pages and keeps your links organized. Linkwarden is ideal if you want full page archiving and team collaboration, Shiori is perfect for a minimal CLI-friendly solution, and Wallabag excels as a read-it-later service. All three run reliably in Docker containers managed through Portainer, giving you a permanent, searchable library of your bookmarked content.
