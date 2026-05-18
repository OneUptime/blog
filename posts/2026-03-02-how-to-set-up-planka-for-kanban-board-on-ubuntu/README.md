# How to Set Up Planka for Kanban Board on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Project Management, Kanban, Docker, PostgreSQL

Description: Learn how to deploy Planka, a real-time Kanban board application, on Ubuntu using Docker Compose with PostgreSQL for a fast and clean self-hosted project management solution.

---

Planka is a Kanban board application built with React and Node.js, using PostgreSQL for storage. It focuses on doing one thing well - Kanban boards - with a clean interface that's fast and minimal. You get boards, lists, cards, labels, due dates, file attachments, and real-time updates without the feature bloat of larger project management platforms.

If you need a simple, self-hosted Kanban board and don't need the full project management features of Taiga or Wekan, Planka is worth considering.

## Prerequisites

- Ubuntu 20.04 or 22.04
- Docker and Docker Compose
- At least 1 GB RAM

## Installing Docker

```bash
# Install Docker

curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker

# Install Compose plugin
sudo apt install docker-compose-plugin

# Verify
docker --version
docker compose version
```

## Setting Up the Deployment Directory

```bash
sudo mkdir -p /opt/planka
cd /opt/planka
```

## Creating the Docker Compose Configuration

```bash
sudo tee /opt/planka/docker-compose.yml << 'EOF'
services:
  planka:
    image: ghcr.io/plankanban/planka:latest
    container_name: planka
    restart: always
    volumes:
      - data:/app/data
    ports:
      - "127.0.0.1:3000:1337"
    environment:
      # Required: Base URL of your Planka instance
      - BASE_URL=https://kanban.example.com

      # Database connection (points to the postgres service below)
      - DATABASE_URL=postgresql://planka:dbpassword@postgres/planka

      # Secret key for sessions - generate with: openssl rand -hex 64
      - SECRET_KEY=your-very-long-secret-key-generated-with-openssl-rand-hex-64

      # Trust proxy headers (required when behind nginx)
      - TRUST_PROXY=true

      # Optional: set default language
      # - DEFAULT_LANGUAGE=en-US

      # Optional: limit file upload size (in bytes)
      # - MAX_UPLOAD_FILE_SIZE=10485760

      # Optional: create the initial admin user automatically on first startup.
      # Keep DEFAULT_ADMIN_EMAIL set if you want to prevent this user from being
      # edited or deleted; otherwise the variables can be removed after first run.
      # - DEFAULT_ADMIN_EMAIL=admin@example.com
      # - DEFAULT_ADMIN_PASSWORD=your-admin-password
      # - DEFAULT_ADMIN_NAME=Admin User
      # - DEFAULT_ADMIN_USERNAME=admin

    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:16-alpine
    container_name: planka-db
    restart: always
    volumes:
      - pg-data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=planka
      - POSTGRES_USER=planka
      - POSTGRES_PASSWORD=dbpassword
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U planka -d planka"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  data:
  pg-data:
EOF
```

Generate a proper secret key:

```bash
# Generate a secure secret key
openssl rand -hex 64
# Copy the output and paste it as the SECRET_KEY value in docker-compose.yml
```

## Starting Planka

```bash
cd /opt/planka

# Pull images
docker compose pull

# Start services
docker compose up -d

# Watch startup logs
docker compose logs -f

# Verify both containers are running
docker compose ps
```

Planka initializes the database on first startup. Once it's running, it's accessible at `http://localhost:3000`.

## Creating the Initial Admin User

Since Planka 1.13, an administrator user is not created automatically. You have two options.

The first is to run the interactive admin creation script, which prompts for email, password, name, and an optional username:

```bash
docker compose run --rm planka npm run db:create-admin-user
```

The second is to uncomment the `DEFAULT_ADMIN_*` environment variables in `docker-compose.yml`, then restart:

```bash
docker compose up -d
```

The admin user is created on startup. You can remove the variables after the first successful startup; however, if you keep `DEFAULT_ADMIN_EMAIL` set, that account cannot be deleted or modified by other users.

Check the logs to confirm:

```bash
docker compose logs planka | grep -i "admin\|user\|created"
```

## Configuring nginx for HTTPS

```bash
sudo apt install nginx certbot python3-certbot-nginx

sudo tee /etc/nginx/sites-available/planka << 'EOF'
server {
    listen 80;
    server_name kanban.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name kanban.example.com;

    ssl_certificate /etc/letsencrypt/live/kanban.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/kanban.example.com/privkey.pem;

    # Real-time features require WebSocket support
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_read_timeout 300s;
        client_max_body_size 50m;
    }

    access_log /var/log/nginx/planka.access.log;
    error_log /var/log/nginx/planka.error.log;
}
EOF

sudo ln -s /etc/nginx/sites-available/planka /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d kanban.example.com
```

## Managing Users

From the web interface, admin users can:
- Invite new users (Settings -> Users)
- Change user roles
- Deactivate accounts

Additional admin users can also be created from the command line using the same script:

```bash
docker compose run --rm planka npm run db:create-admin-user
```

Regular (non-admin) user accounts are managed through the web UI once an administrator is logged in.

## Working with Planka's Features

Once logged in, the interface is straightforward:

**Projects** are top-level containers. Click "+" to create a project, optionally assign a background image.

**Boards** live inside projects. Each board has lists and cards. You can create multiple boards per project.

**Cards** are the main work items. Drag between lists to update status. Cards support:
- Description (Markdown)
- Labels (color-coded)
- Due dates
- File attachments
- Checklists
- Members
- Comments

**Real-time updates** - when multiple users are on the same board, changes appear instantly without refreshing.

## Backing Up Planka

```bash
# Backup script
sudo tee /usr/local/bin/planka-backup << 'EOF'
#!/bin/bash
set -e

DATE=$(date +%Y%m%d_%H%M)
BACKUP_DIR=/var/backups/planka

mkdir -p $BACKUP_DIR

cd /opt/planka

# Dump PostgreSQL database
docker compose exec -T postgres pg_dump -U planka planka | \
    gzip > $BACKUP_DIR/planka-db-$DATE.sql.gz

# Backup the Planka data volume (avatars, background images, attachments)
docker run --rm \
    -v planka_data:/data \
    -v $BACKUP_DIR:/backup \
    alpine tar czf /backup/planka-data-$DATE.tar.gz -C /data .

# Remove old backups (keep 14 days)
find $BACKUP_DIR -name "*.gz" -mtime +14 -delete

echo "Backup completed: $BACKUP_DIR/planka-db-$DATE.sql.gz"
EOF

sudo chmod +x /usr/local/bin/planka-backup

# Schedule daily backups
echo "0 2 * * * root /usr/local/bin/planka-backup >> /var/log/planka-backup.log 2>&1" | \
    sudo tee /etc/cron.d/planka-backup
```

## Restoring from Backup

```bash
# Stop Planka (keep database running)
docker compose stop planka

# Restore database (drops existing data)
gunzip -c /var/backups/planka/planka-db-20260301_0200.sql.gz | \
    docker compose exec -T postgres psql -U planka planka

# Restore the data volume (avatars, background images, attachments)
docker run --rm \
    -v planka_data:/data \
    -v /var/backups/planka:/backup \
    alpine tar xzf /backup/planka-data-20260301_0200.tar.gz -C /data

# Start Planka again
docker compose start planka
```

## Updating Planka

```bash
cd /opt/planka

# Pull the latest image
docker compose pull

# Recreate the container with the new image
docker compose up -d --force-recreate planka

# Check that it started correctly
docker compose logs planka | tail -20
```

## Monitoring

```bash
# Check container resource usage
docker stats planka planka-db

# View Planka application logs
docker compose logs -f planka

# Check PostgreSQL logs
docker compose logs -f postgres

# Verify the database is healthy
docker compose exec postgres pg_isready -U planka
```

## Troubleshooting

```bash
# Planka fails to start - usually a database issue
docker compose logs planka | grep -i error

# Database authentication failing
docker compose logs postgres
# Check the POSTGRES_PASSWORD in docker-compose.yml matches DATABASE_URL

# WebSocket connections failing in browser
# Check nginx configuration has the Upgrade and Connection headers
# Check browser console for WebSocket error messages

# Port conflict - check if 3000 is in use
ss -tlnp | grep 3000

# Restart everything cleanly
cd /opt/planka
docker compose down
docker compose up -d
docker compose logs -f
```

Planka is a focused tool that does Kanban well without trying to be everything. The real-time collaboration works reliably, the interface is clean, and the resource footprint is small. For teams that want a self-hosted Kanban board without a complex setup, it delivers the core workflow efficiently.
