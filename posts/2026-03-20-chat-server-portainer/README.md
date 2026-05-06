# How to Self-Host a Chat Server with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Self-Hosted, Chat, Rocket.Chat, Matrix, Communication

Description: Deploy a self-hosted team chat server using Rocket.Chat or Matrix/Element with Portainer for secure internal communications.

## Introduction

Self-hosted chat servers give your organization complete control over communications data, eliminate per-seat subscription costs, and ensure messages never leave your infrastructure. This guide covers deploying both Rocket.Chat (Slack alternative) and Matrix/Element (decentralized messaging protocol) using Portainer.

## Prerequisites

- Portainer installed and running
- At least 4GB RAM if you plan to run Rocket.Chat
- A domain name with SSL certificate
- Reverse proxy (Traefik or Nginx)

## Option 1: Deploy Rocket.Chat

Rocket.Chat is a feature-complete team messaging platform with channels, DMs, video calls, and integrations.

```yaml
# docker-compose.yml - Rocket.Chat with MongoDB

version: "3.8"

networks:
  chat_network:
    driver: bridge

volumes:
  rocketchat_db:
  rocketchat_uploads:

services:
  # MongoDB database
  mongodb:
    image: mongo:8.0
    container_name: rocketchat_db
    restart: unless-stopped
    command: >
      mongod
      --oplogSize 128
      --replSet rs0
    volumes:
      - rocketchat_db:/data/db
    networks:
      - chat_network
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5

  # MongoDB replica set initialization
  mongo_init:
    image: mongo:8.0
    restart: "no"
    depends_on:
      mongodb:
        condition: service_healthy
    command: >
      mongosh --host mongodb:27017 --eval
      "rs.initiate({_id: 'rs0', members: [{_id: 0, host: 'mongodb:27017'}]})"
    networks:
      - chat_network

  # Rocket.Chat application
  rocketchat:
    image: registry.rocket.chat/rocketchat/rocket.chat:8.2
    container_name: rocketchat
    restart: unless-stopped
    depends_on:
      mongodb:
        condition: service_healthy
    ports:
      - "3000:3000"
    environment:
      - MONGO_URL=mongodb://mongodb:27017/rocketchat?replicaSet=rs0
      - ROOT_URL=https://chat.yourdomain.com
      - PORT=3000
      # Admin account setup
      - INITIAL_USER=yes
      - ADMIN_USERNAME=admin
      - ADMIN_NAME=Admin
      - ADMIN_PASS=change_this_password
      - ADMIN_EMAIL=admin@yourdomain.com
      # Disable registration after setup
      - Accounts_RegistrationForm=Disabled
    volumes:
      - rocketchat_uploads:/app/uploads
    networks:
      - chat_network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.rocketchat.rule=Host(`chat.yourdomain.com`)"
      - "traefik.http.routers.rocketchat.entrypoints=websecure"
      - "traefik.http.routers.rocketchat.tls.certresolver=letsencrypt"
      - "traefik.http.services.rocketchat.loadbalancer.server.port=3000"
```

## Option 2: Deploy Matrix + Element

Matrix is an open standard for decentralized communication. Synapse is the reference server implementation, and Element is the web client.

```yaml
# docker-compose.yml - Matrix Synapse + Element
version: "3.8"

networks:
  matrix_network:
    driver: bridge

volumes:
  synapse_db:

services:
  # PostgreSQL for Synapse
  synapse_db:
    image: postgres:15-alpine
    container_name: synapse_db
    restart: unless-stopped
    environment:
      - POSTGRES_DB=synapse
      - POSTGRES_USER=synapse
      - POSTGRES_PASSWORD=secure_synapse_password
      # Required for Synapse
      - POSTGRES_INITDB_ARGS=--encoding=UTF-8 --lc-collate=C --lc-ctype=C
    volumes:
      - synapse_db:/var/lib/postgresql/data
    networks:
      - matrix_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U synapse"]
      interval: 10s
      retries: 5

  # Matrix Synapse server
  synapse:
    image: matrixdotorg/synapse:latest
    container_name: synapse
    restart: unless-stopped
    depends_on:
      synapse_db:
        condition: service_healthy
    ports:
      - "8008:8008"   # Client API
    environment:
      - SYNAPSE_CONFIG_DIR=/data
      - SYNAPSE_CONFIG_PATH=/data/homeserver.yaml
      - SYNAPSE_DATA_DIR=/data
      - TZ=America/New_York
    volumes:
      - /opt/synapse:/data
    networks:
      - matrix_network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.synapse.rule=Host(`matrix.yourdomain.com`)"
      - "traefik.http.routers.synapse.entrypoints=websecure"
      - "traefik.http.routers.synapse.tls.certresolver=letsencrypt"
      - "traefik.http.services.synapse.loadbalancer.server.port=8008"

  # Element Web client
  element:
    image: vectorim/element-web:latest
    container_name: element
    restart: unless-stopped
    ports:
      - "8080:80"
    volumes:
      - /opt/element/config.json:/app/config.json:ro
    networks:
      - matrix_network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.element.rule=Host(`element.yourdomain.com`)"
      - "traefik.http.routers.element.entrypoints=websecure"
      - "traefik.http.routers.element.tls.certresolver=letsencrypt"
      - "traefik.http.services.element.loadbalancer.server.port=80"
```

### Generate Synapse Configuration

Run this before deploying the Synapse service so the bind-mounted config exists.

```bash
# Generate the initial Synapse homeserver.yaml
docker run -it --rm \
  -v /opt/synapse:/data \
  -e SYNAPSE_SERVER_NAME=matrix.yourdomain.com \
  -e SYNAPSE_REPORT_STATS=no \
  matrixdotorg/synapse:latest generate
```

```yaml
# Update /opt/synapse/homeserver.yaml before starting Synapse
database:
  name: psycopg2
  args:
    user: synapse
    password: secure_synapse_password
    dbname: synapse
    host: synapse_db
    cp_min: 5
    cp_max: 10

registration_shared_secret: "generate-a-long-random-value"
```

```bash
# If Synapse is already running, restart it after editing the config
docker restart synapse

# Create first admin user
docker exec -it synapse register_new_matrix_user \
  http://localhost:8008 \
  -c /data/homeserver.yaml \
  -u admin \
  -p your_secure_password \
  --admin
```

## Step 3: Configure Element Web Client

Create `/opt/element/config.json` before deploying Element:

```json
{
  "default_server_config": {
    "m.homeserver": {
      "base_url": "https://matrix.yourdomain.com"
    },
    "m.identity_server": {
      "base_url": "https://vector.im"
    }
  },
  "brand": "Element",
  "integrations_ui_url": "https://scalar.vector.im/",
  "integrations_rest_url": "https://scalar.vector.im/api",
  "integrations_widgets_urls": [
    "https://scalar.vector.im/_matrix/integrations/v1",
    "https://scalar.vector.im/api",
    "https://scalar-staging.vector.im/_matrix/integrations/v1",
    "https://scalar-staging.vector.im/api"
  ],
  "bug_report_endpoint_url": "https://rageshakes.element.io/api/submit",
  "show_labs_settings": true
}
```

## Step 4: Set Up Push Notifications

```yaml
# Push notifications are enabled by default in Synapse.
# Add to homeserver.yaml only if you want to tune push payloads.
push:
  include_content: false
```

## Backup Strategy

```bash
#!/bin/bash
# backup-chat.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups/chat"
mkdir -p "$BACKUP_DIR"

# Backup Rocket.Chat MongoDB
docker exec rocketchat_db mongodump \
  --out /tmp/mongo_backup
docker cp rocketchat_db:/tmp/mongo_backup "$BACKUP_DIR/mongo_$DATE"
tar -czf "$BACKUP_DIR/rocketchat_db_$DATE.tar.gz" "$BACKUP_DIR/mongo_$DATE"
rm -rf "$BACKUP_DIR/mongo_$DATE"

# Backup uploads
tar -czf "$BACKUP_DIR/uploads_$DATE.tar.gz" \
  $(docker volume inspect rocketchat_uploads -f '{{ .Mountpoint }}')

# Rotate backups (keep 7 days)
find "$BACKUP_DIR" -mtime +7 -delete
echo "Chat backup completed: $DATE"
```

## Monitoring in Portainer

Key metrics to monitor:
- **Memory**: MongoDB and Rocket.Chat can be memory-intensive
- **CPU**: Video call features require more CPU
- **Disk**: File uploads and message history grow over time

```bash
# Check MongoDB replica set status
docker exec rocketchat_db mongosh --eval "rs.status()"

# View Rocket.Chat logs
docker logs rocketchat --tail=100 -f
```

## Conclusion

Your self-hosted chat server is now running with Portainer managing the entire stack. Rocket.Chat provides a familiar Slack-like experience for teams, while Matrix/Element offers decentralized, federated messaging with strong encryption. Both solutions eliminate cloud provider dependencies and keep your communications private. Portainer makes it easy to update, monitor, and maintain these services over time.
