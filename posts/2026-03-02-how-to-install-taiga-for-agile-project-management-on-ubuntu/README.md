# How to Install Taiga for Agile Project Management on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Project Management, Agile, Docker, DevOps

Description: Learn how to deploy Taiga, an open-source agile project management platform, on Ubuntu using Docker Compose with full support for Scrum, Kanban, and issue tracking.

---

Taiga is an open-source project management platform designed for agile teams. It supports Scrum (sprints, user stories, backlog), Kanban boards, epics, issues, wiki pages, and time tracking - the full feature set you'd expect from a commercial project management tool. Running your own instance means your project data stays on infrastructure you control, and there's no per-seat licensing.

The recommended deployment method is Docker Compose, which handles the multiple services Taiga needs (backend, frontend, async workers, events, database, cache) without requiring you to manage each component separately.

## Prerequisites

- Ubuntu 20.04 or 22.04
- Docker and Docker Compose installed
- At least 4 GB RAM (Taiga runs several services)
- A domain name (for email and SSL)

## Installing Docker and Docker Compose

```bash
# Install Docker
curl -fsSL https://get.docker.com | sudo sh

# Add your user to the docker group
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose (V2 plugin)
sudo apt install docker-compose-plugin

# Verify installations
docker --version
docker compose version
```

## Setting Up the Taiga Docker Environment

Taiga provides an official Docker Compose setup:

```bash
# Clone the Taiga Docker repository
git clone https://github.com/taigaio/taiga-docker.git
cd taiga-docker

# Create a directory for configuration
mkdir -p /opt/taiga
cp -r . /opt/taiga/
cd /opt/taiga
```

## Configuring Environment Variables

The main configuration is in the `.env` file:

```bash
# Copy the example environment file
cp .env.example .env
nano .env
```

Key settings to configure:

```bash
# === MUST CONFIGURE THESE ===

# Secret key for cryptographic operations - generate a random string
# python3 -c "import secrets; print(secrets.token_urlsafe(50))"
SECRET_KEY=your-very-long-random-secret-key-here

# Your server's domain or IP
TAIGA_DOMAIN=taiga.example.com
TAIGA_SUBPATH=""  # Leave empty if serving at root

# URLs
TAIGA_BACKEND_URL=https://taiga.example.com
TAIGA_FRONTEND_URL=https://taiga.example.com
TAIGA_EVENTS_URL=wss://taiga.example.com/events

# Email configuration
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
DEFAULT_FROM_EMAIL=taiga@example.com
EMAIL_USE_TLS=True
EMAIL_USE_SSL=False
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_HOST_USER=taiga@example.com
EMAIL_HOST_PASSWORD=your-smtp-password

# Public registration (set to False for private instances)
PUBLIC_REGISTER_ENABLED=True

# Database (can leave as default for Docker setup)
POSTGRES_DB=taiga
POSTGRES_USER=taiga
POSTGRES_PASSWORD=change-this-password
POSTGRES_HOST=taiga-db

# RabbitMQ
RABBITMQ_USER=taiga
RABBITMQ_PASS=change-this-password
RABBITMQ_VHOST=taiga
RABBITMQ_HOST=taiga-async-rabbitmq

# Object storage (MinIO for file attachments)
AWS_ACCESS_KEY_ID=taiga-minio
AWS_SECRET_ACCESS_KEY=change-this-minio-password
AWS_STORAGE_BUCKET_NAME=taiga
```

## Reviewing the Docker Compose Configuration

```bash
# Review the default docker-compose.yml
cat docker-compose.yml
```

The compose file starts these services:
- `taiga-db` - PostgreSQL database
- `taiga-async-rabbitmq` - RabbitMQ for async tasks
- `taiga-back` - Django backend
- `taiga-async` - Celery worker for background tasks
- `taiga-front` - Angular frontend
- `taiga-events` - WebSocket events server
- `taiga-protected` - Protected file storage service
- `taiga-gateway` - nginx gateway that routes to all services

## Starting Taiga

```bash
cd /opt/taiga

# Pull all images
docker compose pull

# Start all services in the background
docker compose up -d

# Monitor startup (it takes a minute or two)
docker compose logs -f

# Check that all services are running
docker compose ps
```

All services should show as "running" or "healthy". If any are restarting repeatedly, check their logs:

```bash
docker compose logs taiga-back
docker compose logs taiga-async
```

## Creating the Admin User

After services start, create the initial admin user:

```bash
# Create the admin user via management command
docker compose exec taiga-back python manage.py createsuperuser \
    --username admin \
    --email admin@example.com \
    --noinput

# Then set the password
docker compose exec taiga-back python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
user = User.objects.get(username='admin')
user.set_password('your-admin-password')
user.save()
"
```

## Configuring nginx as a Reverse Proxy

The Taiga gateway handles internal routing, but you'll want nginx in front for SSL termination:

```bash
sudo apt install nginx certbot python3-certbot-nginx

sudo tee /etc/nginx/sites-available/taiga << 'EOF'
server {
    listen 80;
    server_name taiga.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name taiga.example.com;

    ssl_certificate /etc/letsencrypt/live/taiga.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/taiga.example.com/privkey.pem;

    # Proxy to Taiga's internal nginx gateway
    location / {
        proxy_pass http://localhost:9000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support for events
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Increase timeouts for long-running operations
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
        client_max_body_size 100m;
    }
}
EOF

# Get SSL certificate
sudo certbot --nginx -d taiga.example.com

sudo ln -s /etc/nginx/sites-available/taiga /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Update the `.env` file to use HTTPS and restart:

```bash
cd /opt/taiga
docker compose down
# Update TAIGA_BACKEND_URL and TAIGA_FRONTEND_URL to https://
docker compose up -d
```

## Backing Up Taiga

```bash
# Backup the database
docker compose exec taiga-db pg_dump -U taiga taiga | \
    gzip > /var/backups/taiga-db-$(date +%Y%m%d).sql.gz

# Backup the media files (attachments, avatars)
docker compose exec taiga-back tar czf - /taiga/media | \
    sudo tee /var/backups/taiga-media-$(date +%Y%m%d).tar.gz > /dev/null

# Create a backup script
sudo tee /usr/local/bin/taiga-backup << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d)
BACKUP_DIR=/var/backups/taiga

mkdir -p $BACKUP_DIR

cd /opt/taiga

# Database backup
docker compose exec -T taiga-db pg_dump -U taiga taiga | \
    gzip > $BACKUP_DIR/db-$DATE.sql.gz

# Keep only 7 days of backups
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/db-$DATE.sql.gz"
EOF

sudo chmod +x /usr/local/bin/taiga-backup
echo "0 2 * * * root /usr/local/bin/taiga-backup" | sudo tee /etc/cron.d/taiga-backup
```

## Restoring from Backup

```bash
# Restore database
gunzip -c /var/backups/taiga/db-20260301.sql.gz | \
    docker compose exec -T taiga-db psql -U taiga taiga
```

## Managing the Taiga Instance

```bash
# View all running containers
docker compose ps

# Restart a specific service
docker compose restart taiga-back

# View logs for a service
docker compose logs -f taiga-back

# Access the Django admin interface
# Navigate to https://taiga.example.com/admin
# Login with your superuser credentials

# Run Django management commands
docker compose exec taiga-back python manage.py shell
docker compose exec taiga-back python manage.py check

# Scale the async worker (for higher throughput)
docker compose up -d --scale taiga-async=3
```

## Updating Taiga

```bash
cd /opt/taiga

# Pull latest images
docker compose pull

# Restart with new images
docker compose down
docker compose up -d

# Check the changelog for any required migration steps
docker compose logs taiga-back | grep -i migration
```

## Troubleshooting

```bash
# Backend not starting - check for migration issues
docker compose logs taiga-back | tail -50

# Frontend connection errors
docker compose logs taiga-front | tail -20

# Email not working - test SMTP config
docker compose exec taiga-back python manage.py shell -c "
from django.core.mail import send_mail
send_mail('Test', 'Test message', 'from@example.com', ['to@example.com'])
"

# Reset a user's password
docker compose exec taiga-back python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
u = User.objects.get(username='someuser')
u.set_password('newpassword')
u.save()
"
```

Taiga is a capable project management platform once running. The Docker Compose setup makes it reproducible across environments, and the data model covers the full agile workflow most teams need without forcing a particular methodology.
