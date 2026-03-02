# How to Set Up Wekan (Open-Source Trello Alternative) on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Project Management, Kanban, Docker, Linux

Description: Learn how to deploy Wekan, a free open-source Kanban board, on Ubuntu using Docker Compose with MongoDB for a self-hosted Trello alternative with full data ownership.

---

Wekan is an open-source Kanban board application that closely resembles Trello in terms of features and workflow. It supports boards, lists, cards, labels, checklists, due dates, attachments, comments, and user assignments. Running your own instance keeps project data off third-party servers and removes any per-user pricing concerns.

It's built on Meteor and MongoDB. The Docker Compose deployment is the most straightforward way to run it on Ubuntu.

## Prerequisites

- Ubuntu 20.04 or 22.04
- Docker and Docker Compose installed
- 1 GB RAM minimum (2 GB recommended)
- A domain name for production use

## Installing Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose plugin
sudo apt install docker-compose-plugin

# Verify
docker --version
docker compose version
```

## Creating the Docker Compose Configuration

Create a directory for the Wekan deployment:

```bash
sudo mkdir -p /opt/wekan
cd /opt/wekan
```

Create the `docker-compose.yml` file:

```bash
sudo tee /opt/wekan/docker-compose.yml << 'EOF'
version: '3'

services:
  wekandb:
    image: mongo:6
    container_name: wekan-db
    restart: always
    command: mongod --logpath /dev/null
    environment:
      - MONGO_INITDB_DATABASE=wekan
    volumes:
      - wekan-db:/data/db
      - wekan-db-dump:/dump
    networks:
      - wekan-tier

  wekan:
    image: ghcr.io/wekan/wekan:latest
    container_name: wekan-app
    restart: always
    networks:
      - wekan-tier
    ports:
      - "127.0.0.1:8080:8080"
    environment:
      # The URL of your Wekan instance
      - ROOT_URL=https://kanban.example.com

      # MongoDB connection string
      - MONGO_URL=mongodb://wekandb/wekan

      # Mail server settings (optional but recommended)
      - MAIL_URL=smtp://user:password@smtp.example.com:587/
      - MAIL_FROM='Wekan <noreply@example.com>'

      # Port configuration
      - PORT=8080

      # Optional: set default language
      # - DEFAULT_LOCALE=en

      # Optional: disable registration after setup
      # - REGISTRATION_DISABLED=true

      # Optional: LDAP settings
      # - LDAP_ENABLE=true
      # - LDAP_HOST=ldap.example.com
    depends_on:
      - wekandb

volumes:
  wekan-db:
    driver: local
  wekan-db-dump:
    driver: local

networks:
  wekan-tier:
    driver: bridge
EOF
```

## Starting Wekan

```bash
cd /opt/wekan

# Pull the images
docker compose pull

# Start the services
docker compose up -d

# Monitor startup
docker compose logs -f

# Check status
docker compose ps
```

Both `wekan-db` and `wekan-app` should be running. Wekan takes about 30-60 seconds to fully start on first run.

## Setting Up nginx as a Reverse Proxy

Since Wekan listens on localhost:8080, put nginx in front for SSL:

```bash
sudo apt install nginx certbot python3-certbot-nginx

sudo tee /etc/nginx/sites-available/wekan << 'EOF'
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

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;

        # Required for Meteor's WebSocket connections
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Increase timeouts
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
        client_max_body_size 50m;
    }

    access_log /var/log/nginx/wekan.access.log;
    error_log /var/log/nginx/wekan.error.log;
}
EOF

# Temporarily stop Wekan's port if it's conflicting with certbot
# (Wekan is on 8080, so certbot should be fine with 80 open)
sudo ln -s /etc/nginx/sites-available/wekan /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d kanban.example.com
```

## Creating the Admin Account

Navigate to `https://kanban.example.com` and register the first user. The first registered user automatically becomes the admin.

After logging in:
1. Go to Admin Panel (your username -> Admin Panel)
2. Configure email settings, authentication options, and other settings

## Configuring Wekan Settings

Many settings are in the Admin Panel web interface, but key Docker environment variables control the setup:

```bash
# Update docker-compose.yml environment section for common settings
sudo nano /opt/wekan/docker-compose.yml
```

Important environment variables:

```yaml
environment:
  - ROOT_URL=https://kanban.example.com
  - MONGO_URL=mongodb://wekandb/wekan
  - PORT=8080

  # Disable public registration (after creating initial accounts)
  - REGISTRATION_DISABLED=true

  # File attachment size limit (in bytes)
  - MAX_ALLOWED_FILE_SIZE=10485760  # 10 MB

  # Disable invite for registered users only mode
  - INVITE_ENABLED=true

  # LDAP authentication
  - LDAP_ENABLE=false
  # - LDAP_HOST=ldap.example.com
  # - LDAP_PORT=389
  # - LDAP_BASEDN=dc=example,dc=com
  # - LDAP_LOGIN_FALLBACK=false

  # OAuth2 / OIDC (if using external authentication)
  # - OAUTH2_ENABLED=true
  # - OAUTH2_CLIENT_ID=your-client-id
  # - OAUTH2_SECRET=your-client-secret
  # - OAUTH2_SERVER_URL=https://auth.example.com
```

After changing environment variables, restart:

```bash
cd /opt/wekan
docker compose down && docker compose up -d
```

## Managing Users

From the Admin Panel:
- View all registered users
- Change user roles (admin vs. regular user)
- Delete users
- Disable registration to prevent new signups

From the command line via MongoDB:

```bash
# Access the MongoDB container
docker compose exec wekandb mongosh wekan

# List all users
db.users.find({}, {username: 1, emails: 1, isAdmin: 1}).pretty()

# Make a user an admin
db.users.updateOne(
  { username: "johndoe" },
  { $set: { isAdmin: true } }
)

# Reset a user's password (generates a new hash)
# Better to use the "Forgot Password" feature via email

exit
```

## Backing Up Wekan

```bash
# Create a backup script
sudo tee /usr/local/bin/wekan-backup << 'EOF'
#!/bin/bash
set -e

DATE=$(date +%Y%m%d_%H%M)
BACKUP_DIR=/var/backups/wekan

mkdir -p $BACKUP_DIR

# Dump MongoDB from the container
docker exec wekan-db mongodump \
    --db wekan \
    --out /dump/$DATE

# Copy the dump out of the container
docker cp wekan-db:/dump/$DATE $BACKUP_DIR/

# Compress
tar czf $BACKUP_DIR/wekan-backup-$DATE.tar.gz -C $BACKUP_DIR $DATE
rm -rf $BACKUP_DIR/$DATE

# Remove dumps inside container older than 3 days
docker exec wekan-db find /dump -maxdepth 1 -mtime +3 -exec rm -rf {} \;

# Remove local backups older than 7 days
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup saved: $BACKUP_DIR/wekan-backup-$DATE.tar.gz"
EOF

sudo chmod +x /usr/local/bin/wekan-backup

# Schedule daily backups
echo "0 2 * * * root /usr/local/bin/wekan-backup >> /var/log/wekan-backup.log 2>&1" | \
    sudo tee /etc/cron.d/wekan-backup
```

## Restoring from Backup

```bash
# Extract the backup
tar xzf /var/backups/wekan/wekan-backup-20260301_0200.tar.gz -C /tmp/

# Copy dump into the container
docker cp /tmp/20260301_0200 wekan-db:/dump/restore

# Restore the database
docker exec wekan-db mongorestore \
    --db wekan \
    --drop \
    /dump/restore/wekan
```

## Updating Wekan

```bash
cd /opt/wekan

# Pull the latest image
docker compose pull

# Restart with new image
docker compose up -d

# Check that the new version is running
docker exec wekan-app cat /app/programs/server/app/version.json 2>/dev/null || \
    docker compose logs wekan | grep -i version | tail -5
```

## Troubleshooting

```bash
# Check container logs
docker compose logs wekan
docker compose logs wekandb

# Wekan crashes on startup - usually a MongoDB connection issue
docker compose logs wekan | grep -i "mongodb\|error\|exception"

# Check if MongoDB is accessible
docker compose exec wekan-app mongosh $MONGO_URL --eval "db.runCommand({ping: 1})"

# Clear session cache (if users get logged out unexpectedly)
docker compose exec wekandb mongosh wekan --eval "db.users.updateMany({}, {\$unset: {services: 1}})"
# Note: This logs everyone out

# Check disk space (MongoDB can grow large)
docker volume inspect wekan_wekan-db
du -sh /var/lib/docker/volumes/wekan_wekan-db/
```

Wekan delivers a functional Kanban workflow that most teams find familiar if they've used Trello. The Docker setup makes it easy to maintain and update, and the MongoDB backend handles the flexible card/board data model well. For teams that want a hosted solution without the cloud dependency, it's a workable choice.
