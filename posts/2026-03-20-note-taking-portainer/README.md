# How to Self-Host a Note-Taking App with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Self-Hosted, Joplin, Notes, Productivity

Description: Deploy a self-hosted note-taking solution using Joplin Server or Silverbullet with Portainer for full data ownership.

## Introduction

Self-hosting your note-taking app gives you complete ownership of your notes, no vendor lock-in, and the ability to sync across all your devices. This guide covers deploying Joplin Server (for Joplin clients) and Silverbullet (a powerful markdown-based notes app) using Portainer.

## Prerequisites

- Portainer installed and running
- A reverse proxy (Traefik or Nginx Proxy Manager)
- Basic familiarity with Docker

## Option 1: Deploy Joplin Server

Joplin is a popular open-source note-taking app with end-to-end encryption support. Joplin Server allows you to sync across devices.

### Step 1: Prepare PostgreSQL Database

```yaml
# docker-compose.yml - Joplin Server with PostgreSQL

version: "3.8"

networks:
  notes_network:
    driver: bridge

volumes:
  joplin_db:
  joplin_data:

services:
  # PostgreSQL database for Joplin
  joplin_db:
    image: postgres:15-alpine
    container_name: joplin_db
    restart: unless-stopped
    environment:
      - POSTGRES_DB=joplin
      - POSTGRES_USER=joplin
      - POSTGRES_PASSWORD=secure_password_here
    volumes:
      - joplin_db:/var/lib/postgresql/data
    networks:
      - notes_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U joplin"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Joplin Server
  joplin_server:
    image: joplin/server:latest
    container_name: joplin_server
    restart: unless-stopped
    depends_on:
      joplin_db:
        condition: service_healthy
    ports:
      - "22300:22300"
    environment:
      # Application URL
      - APP_BASE_URL=https://joplin.yourdomain.com
      - APP_PORT=22300

      # Database configuration
      - DB_CLIENT=pg
      - POSTGRES_HOST=joplin_db
      - POSTGRES_PORT=5432
      - POSTGRES_DATABASE=joplin
      - POSTGRES_USER=joplin
      - POSTGRES_PASSWORD=secure_password_here

      # Mailer (optional, for account verification)
      - MAILER_HOST=smtp.gmail.com
      - MAILER_PORT=587
      - MAILER_SECURITY=starttls
      - MAILER_AUTH_USER=your-email@gmail.com
      - MAILER_AUTH_PASSWORD=your-app-password
      - MAILER_NOREPLY_NAME=Joplin
      - MAILER_NOREPLY_EMAIL=noreply@yourdomain.com

      # Disable signups after creating account
      - SIGNUP_ENABLED=true
    volumes:
      - joplin_data:/home/joplin/data
    networks:
      - notes_network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.joplin.rule=Host(`joplin.yourdomain.com`)"
      - "traefik.http.routers.joplin.entrypoints=websecure"
      - "traefik.http.routers.joplin.tls.certresolver=letsencrypt"
      - "traefik.http.services.joplin.loadbalancer.server.port=22300"
```

### Connect Joplin Clients

1. Open Joplin desktop or mobile app
2. Go to **Tools** > **Options** > **Synchronisation**
3. Select **Joplin Server** as sync target
4. Enter your server URL: `https://joplin.yourdomain.com`
5. Log in with your credentials

## Option 2: Deploy Silverbullet

Silverbullet is a powerful markdown-based PKM (Personal Knowledge Management) tool with a rich plugin ecosystem.

```yaml
# docker-compose.yml - Silverbullet
version: "3.8"

networks:
  notes_network:
    driver: bridge

services:
  silverbullet:
    image: zefhemel/silverbullet:latest
    container_name: silverbullet
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      # Set username and password for authentication
      - SB_USER=admin:your_secure_password
    volumes:
      # All your notes stored here
      - /opt/silverbullet/notes:/space
    networks:
      - notes_network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.silverbullet.rule=Host(`notes.yourdomain.com`)"
      - "traefik.http.routers.silverbullet.entrypoints=websecure"
      - "traefik.http.routers.silverbullet.tls.certresolver=letsencrypt"
      - "traefik.http.services.silverbullet.loadbalancer.server.port=3000"
```

## Option 3: Deploy Memos (Twitter-style Notes)

```yaml
# docker-compose.yml - Memos
version: "3.8"

networks:
  notes_network:
    driver: bridge

services:
  memos:
    image: neosmemo/memos:stable
    container_name: memos
    restart: unless-stopped
    ports:
      - "5230:5230"
    volumes:
      # Data persistence
      - /opt/memos:/var/opt/memos
    networks:
      - notes_network
```

## Step 3: Set Up Automated Backups

```bash
#!/bin/bash
# /usr/local/bin/backup-notes.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups/notes"

mkdir -p "$BACKUP_DIR"

# Backup Silverbullet notes
if [ -d "/opt/silverbullet/notes" ]; then
  tar -czf "$BACKUP_DIR/silverbullet_$DATE.tar.gz" /opt/silverbullet/notes
fi

# Backup Joplin data
docker exec joplin_db pg_dump -U joplin joplin | \
  gzip > "$BACKUP_DIR/joplin_db_$DATE.sql.gz"

# Rotate - keep 30 days
find "$BACKUP_DIR" -mtime +30 -delete

echo "Notes backup completed: $DATE"
```

```bash
# Schedule daily backup
chmod +x /usr/local/bin/backup-notes.sh
echo "0 2 * * * /usr/local/bin/backup-notes.sh" | crontab -
```

## Mobile Sync Setup

For Joplin mobile sync:
1. Install Joplin on iOS or Android
2. Navigate to **Configuration** > **Sync**
3. Select **Joplin Server**
4. Enter your server URL and credentials

## Monitoring in Portainer

Use Portainer to:
- **View logs**: Navigate to the container > **Logs** tab to debug sync issues
- **Monitor resources**: Check CPU and memory usage under **Stats**
- **Update images**: Use **Recreate** with the **Pull latest image** option

```bash
# Check Joplin server logs for errors
docker logs joplin_server --tail=50

# Verify database connectivity
docker exec joplin_db psql -U joplin -c "SELECT COUNT(*) FROM items;"
```

## Conclusion

You now have a self-hosted note-taking solution that gives you complete control over your data. Whether you choose Joplin Server for its mature client ecosystem, Silverbullet for its powerful PKM features, or Memos for quick-capture notes, Portainer makes deployment and maintenance straightforward. Keep your notes backed up regularly and update your containers to get the latest security patches and features.
