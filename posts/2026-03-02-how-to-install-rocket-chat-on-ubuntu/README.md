# How to Install Rocket.Chat on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Rocket.Chat, Messaging, Self-Hosted, Docker

Description: Step-by-step guide to installing and configuring Rocket.Chat on Ubuntu using Docker Compose, including MongoDB setup and HTTPS configuration.

---

Rocket.Chat is a fully-featured open-source team messaging platform that you can host on your own infrastructure. It supports real-time messaging, video calls, file sharing, and integrations with dozens of other tools. If you're replacing Slack or Microsoft Teams with something you control, Rocket.Chat is a solid choice.

This guide covers installation using Docker Compose, which is the most reliable way to run Rocket.Chat and simplifies future upgrades.

## Prerequisites

- Ubuntu 22.04 or 24.04
- At least 2 CPU cores and 4 GB RAM (8 GB recommended for teams)
- Docker and Docker Compose installed
- A domain name pointing to your server
- Ports 80 and 443 accessible from the internet

## Installing Docker

```bash
# Update package list and install prerequisites
sudo apt update && sudo apt install -y ca-certificates curl gnupg

# Add Docker's GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine and Compose plugin
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Allow your user to run Docker without sudo
sudo usermod -aG docker $USER
newgrp docker
```

## Creating the Project Directory

```bash
mkdir -p /opt/rocketchat
cd /opt/rocketchat
```

## Writing the Docker Compose File

Rocket.Chat requires MongoDB as its database. The compose file below sets up both services together:

```yaml
# /opt/rocketchat/docker-compose.yml
version: '3.8'

services:
  rocketchat:
    image: registry.rocket.chat/rocketchat/rocket.chat:latest
    container_name: rocketchat
    restart: unless-stopped
    depends_on:
      - mongodb
    environment:
      # MongoDB connection string
      - MONGO_URL=mongodb://mongodb:27017/rocketchat?replicaSet=rs0
      - MONGO_OPLOG_URL=mongodb://mongodb:27017/local?replicaSet=rs0
      # Server root URL - change to your domain
      - ROOT_URL=https://chat.example.com
      # Admin user setup (only used on first run)
      - ADMIN_USERNAME=admin
      - ADMIN_PASS=ChangeThisPassword123!
      - ADMIN_EMAIL=admin@example.com
      # Port to listen on internally
      - PORT=3000
    ports:
      - "3000:3000"
    volumes:
      - rocketchat_data:/app/uploads
    networks:
      - rocketchat_network

  mongodb:
    image: mongo:6.0
    container_name: rocketchat_mongodb
    restart: unless-stopped
    command: >
      mongod
      --oplogSize 128
      --replSet rs0
      --storageEngine wiredTiger
    volumes:
      - mongodb_data:/data/db
    networks:
      - rocketchat_network

  # One-time job to initialize the MongoDB replica set
  mongo-init-replica:
    image: mongo:6.0
    container_name: mongo_init_replica
    command: >
      bash -c "sleep 10 && mongosh --host mongodb:27017 --eval \"rs.initiate({_id: 'rs0', members: [{_id: 0, host: 'mongodb:27017'}]})\""
    depends_on:
      - mongodb
    networks:
      - rocketchat_network

volumes:
  rocketchat_data:
  mongodb_data:

networks:
  rocketchat_network:
    driver: bridge
```

## Starting Rocket.Chat

```bash
# Start all services
docker compose up -d

# Watch the logs to confirm startup
docker compose logs -f rocketchat
```

The initial startup can take a few minutes as MongoDB initializes the replica set and Rocket.Chat connects. You'll see "SERVER RUNNING" in the logs when it's ready.

Verify the containers are all running:

```bash
docker compose ps
```

## Configuring Nginx as a Reverse Proxy

Install Nginx and certbot for HTTPS:

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

Create the Nginx configuration:

```nginx
# /etc/nginx/sites-available/chat.example.com
server {
    listen 80;
    server_name chat.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name chat.example.com;

    ssl_certificate /etc/letsencrypt/live/chat.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/chat.example.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options SAMEORIGIN;
    add_header X-Content-Type-Options nosniff;

    # Increase body size for file uploads
    client_max_body_size 200m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 3600;
        proxy_send_timeout 3600;
    }
}
```

Enable the site and obtain SSL certificate:

```bash
sudo ln -s /etc/nginx/sites-available/chat.example.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d chat.example.com
```

## Post-Installation Setup

After visiting `https://chat.example.com` and logging in with the admin credentials you set in the compose file, you'll go through a setup wizard. Key settings to configure:

**General Settings (Admin > Administration > General):**
- Confirm the Site URL matches your domain exactly
- Set your organization name and type

**Email Setup (Admin > Administration > Email > SMTP):**
Configure SMTP so users can receive registration emails, password resets, and notifications.

**User Registration (Admin > Administration > Accounts):**
- Decide whether registration is open or invite-only
- Enable email verification for new accounts

## Enabling Push Notifications

For mobile push notifications, you can use Rocket.Chat's cloud gateway (which has a free tier) or set up your own push notification server:

```bash
# In Admin > Administration > Push
# Enable "Enable Gateway" and use:
# https://gateway.rocket.chat (free tier, 5000 push notifications/month)
```

## Setting Up File Storage

By default, files are stored inside the container. For production, configure external storage like S3-compatible storage:

```bash
# In Admin > Administration > File Upload
# Set "Storage Type" to "AmazonS3" and fill in your credentials
# This works with any S3-compatible provider (MinIO, Wasabi, Backblaze B2, etc.)
```

## Backup Strategy

Back up MongoDB and the uploads volume regularly:

```bash
# Backup MongoDB
docker exec rocketchat_mongodb mongodump \
  --out /tmp/rocketchat_backup_$(date +%Y%m%d) \
  --db rocketchat

# Copy the backup out of the container
docker cp rocketchat_mongodb:/tmp/rocketchat_backup_$(date +%Y%m%d) \
  /opt/backups/rocketchat/

# Backup uploads volume
docker run --rm \
  -v rocketchat_rocketchat_data:/source \
  -v /opt/backups/rocketchat:/backup \
  alpine tar czf /backup/uploads_$(date +%Y%m%d).tar.gz -C /source .
```

Add this to a cron job for automated daily backups:

```bash
# Edit root crontab
sudo crontab -e

# Add this line for daily 2am backups
0 2 * * * /opt/rocketchat/backup.sh >> /var/log/rocketchat-backup.log 2>&1
```

## Upgrading Rocket.Chat

```bash
cd /opt/rocketchat

# Pull the latest image
docker compose pull rocketchat

# Restart with the new image
docker compose up -d rocketchat
```

Always back up MongoDB before upgrading between major versions. Rocket.Chat sometimes requires running migration scripts during major version jumps.

## Monitoring

Keep an eye on Rocket.Chat's health with an uptime monitor. The `/api/v1/info` endpoint returns 200 when the service is healthy. [OneUptime](https://oneuptime.com) can monitor this endpoint and alert your team if the chat service becomes unavailable.
