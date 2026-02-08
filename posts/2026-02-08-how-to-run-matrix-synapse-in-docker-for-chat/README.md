# How to Run Matrix (Synapse) in Docker for Chat

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Matrix, Synapse, Chat, Messaging, Self-Hosted, Containers, Federation, End-to-End Encryption

Description: Deploy Matrix Synapse in Docker for a self-hosted, federated chat platform with end-to-end encryption, bridging to other services, and full data ownership.

---

Matrix is an open standard for decentralized, real-time communication. Synapse is the reference server implementation of the Matrix protocol. Together, they give you a self-hosted chat platform that supports end-to-end encryption, federation with other Matrix servers, bridging to platforms like Slack, Discord, and Telegram, voice/video calls, and rich media sharing.

If you have been looking for a self-hosted alternative to Slack or Microsoft Teams, Matrix with Synapse is one of the strongest options available. Federation means your server can communicate with every other Matrix server on the internet, similar to how email works across different providers.

Running Synapse in Docker is the cleanest way to deploy it. This guide covers the full setup including PostgreSQL, Nginx reverse proxy, and Element web client.

## Prerequisites

You need:

- Docker Engine 20.10+
- Docker Compose v2
- A domain name (required for federation)
- At least 2GB of RAM
- Ports 80, 443, and 8448 available

```bash
# Verify Docker
docker --version
docker compose version
```

## DNS Configuration

Matrix uses a special DNS convention. Your server should be reachable at `matrix.yourdomain.com`, but user IDs use the base domain (like `@user:yourdomain.com`).

```
# DNS records needed
matrix.yourdomain.com    A    YOUR_SERVER_IP
element.yourdomain.com   A    YOUR_SERVER_IP   (for the web client)
```

You also need a `.well-known` file on your base domain for federation, but we will cover that later.

## Generating the Synapse Configuration

Before starting the server, generate an initial configuration file.

```bash
# Create the project directory
mkdir matrix-docker && cd matrix-docker

# Generate the initial Synapse configuration
docker run -it --rm \
  -v $(pwd)/synapse-data:/data \
  -e SYNAPSE_SERVER_NAME=yourdomain.com \
  -e SYNAPSE_REPORT_STATS=no \
  matrixdotorg/synapse:latest generate
```

This creates a `homeserver.yaml` file in the `synapse-data` directory with default settings.

## Docker Compose Configuration

Here is a complete Docker Compose file with Synapse, PostgreSQL, and Element.

```yaml
# docker-compose.yml - Matrix Synapse with PostgreSQL and Element
version: "3.8"

services:
  # Synapse - the Matrix homeserver
  synapse:
    image: matrixdotorg/synapse:latest
    container_name: synapse
    volumes:
      - synapse-data:/data
    environment:
      SYNAPSE_CONFIG_DIR: /data
      SYNAPSE_CONFIG_PATH: /data/homeserver.yaml
      TZ: "America/New_York"
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      # Client-Server API
      - "8008:8008"
      # Federation API
      - "8448:8448"
    networks:
      - matrix-network
    restart: unless-stopped

  # PostgreSQL - much better performance than SQLite
  postgres:
    image: postgres:16-alpine
    container_name: synapse-postgres
    environment:
      POSTGRES_DB: synapse
      POSTGRES_USER: synapse
      POSTGRES_PASSWORD: synapse_db_pass
      POSTGRES_INITDB_ARGS: "--encoding=UTF-8 --lc-collate=C --lc-ctype=C"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U synapse"]
      interval: 5s
      timeout: 5s
      retries: 10
    networks:
      - matrix-network
    restart: unless-stopped

  # Element Web - the Matrix chat client
  element:
    image: vectorim/element-web:latest
    container_name: element-web
    volumes:
      - ./element-config.json:/app/config.json:ro
    ports:
      - "8080:80"
    networks:
      - matrix-network
    restart: unless-stopped

  # Nginx reverse proxy with TLS
  nginx:
    image: nginx:alpine
    container_name: matrix-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./certs:/etc/nginx/certs:ro
      - ./well-known:/var/www/.well-known:ro
    depends_on:
      - synapse
      - element
    networks:
      - matrix-network
    restart: unless-stopped

volumes:
  synapse-data:
  postgres-data:

networks:
  matrix-network:
    driver: bridge
```

## Synapse Configuration

Edit the generated `homeserver.yaml` to use PostgreSQL and configure key settings.

```yaml
# synapse-data/homeserver.yaml - Key settings (edit the generated file)

# Server name - this appears in user IDs (@user:yourdomain.com)
server_name: "yourdomain.com"

# Listener configuration
listeners:
  - port: 8008
    tls: false
    type: http
    x_forwarded: true
    resources:
      - names: [client, federation]
        compress: false

# Switch from SQLite to PostgreSQL
database:
  name: psycopg2
  args:
    user: synapse
    password: synapse_db_pass
    database: synapse
    host: postgres
    port: 5432
    cp_min: 5
    cp_max: 10

# Logging configuration
log_config: "/data/yourdomain.com.log.config"

# Media storage
media_store_path: /data/media_store
max_upload_size: 50M

# Registration settings
enable_registration: false
enable_registration_without_verification: false

# For initial setup, you may want to temporarily enable registration
# enable_registration: true

# Rate limiting
rc_message:
  per_second: 0.2
  burst_count: 10

rc_registration:
  per_second: 0.17
  burst_count: 3

# Retention policy
retention:
  enabled: true
  default_policy:
    min_lifetime: 1d
    max_lifetime: 365d

# URL preview configuration
url_preview_enabled: true
url_preview_ip_range_blacklist:
  - '127.0.0.0/8'
  - '10.0.0.0/8'
  - '172.16.0.0/12'
  - '192.168.0.0/16'

# Report stats to matrix.org (optional)
report_stats: false
```

## Element Web Configuration

Create the Element configuration file.

```json
{
  "default_server_config": {
    "m.homeserver": {
      "base_url": "https://matrix.yourdomain.com",
      "server_name": "yourdomain.com"
    },
    "m.identity_server": {
      "base_url": "https://vector.im"
    }
  },
  "brand": "Element",
  "integrations_ui_url": "https://scalar.vector.im/",
  "integrations_rest_url": "https://scalar.vector.im/api",
  "bug_report_endpoint_url": "https://element.io/bugreports/submit",
  "showLabsSettings": true,
  "default_theme": "light",
  "room_directory": {
    "servers": ["yourdomain.com", "matrix.org"]
  }
}
```

## Nginx Configuration

Set up the reverse proxy for TLS termination and federation.

```nginx
# nginx.conf - Reverse proxy for Matrix Synapse and Element

# Matrix Synapse server
server {
    listen 443 ssl http2;
    server_name matrix.yourdomain.com;

    ssl_certificate /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;

    # Client-Server and Federation API
    location ~* ^(\/_matrix|\/_synapse\/client) {
        proxy_pass http://synapse:8008;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $host;

        # Increase timeouts for large file uploads
        client_max_body_size 50M;
        proxy_read_timeout 600s;
    }
}

# Element Web client
server {
    listen 443 ssl http2;
    server_name element.yourdomain.com;

    ssl_certificate /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;

    location / {
        proxy_pass http://element:80;
        proxy_set_header Host $host;
    }
}

# Federation port
server {
    listen 8448 ssl http2;
    server_name matrix.yourdomain.com;

    ssl_certificate /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;

    location / {
        proxy_pass http://synapse:8008;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $host;
    }
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name matrix.yourdomain.com element.yourdomain.com;

    # Serve .well-known files for federation
    location /.well-known/matrix/ {
        root /var/www;
        default_type application/json;
        add_header Access-Control-Allow-Origin *;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}
```

## Federation Configuration

Create `.well-known` files so other Matrix servers can find yours.

```bash
# Create the well-known directory
mkdir -p well-known/matrix

# Server delegation file
cat > well-known/matrix/server << 'EOF'
{
    "m.server": "matrix.yourdomain.com:443"
}
EOF

# Client configuration file
cat > well-known/matrix/client << 'EOF'
{
    "m.homeserver": {
        "base_url": "https://matrix.yourdomain.com"
    },
    "m.identity_server": {
        "base_url": "https://vector.im"
    }
}
EOF
```

## Starting the Stack

```bash
# Start the database first
docker compose up -d postgres

# Wait for it to be healthy, then start Synapse
docker compose up -d synapse

# Start Element and Nginx
docker compose up -d element nginx

# Check all services
docker compose ps

# Watch Synapse logs
docker compose logs -f synapse
```

## Creating the First Admin User

Since registration is disabled by default, create the first user from the command line.

```bash
# Register a new admin user
docker exec -it synapse register_new_matrix_user \
  http://localhost:8008 \
  -c /data/homeserver.yaml \
  -u admin \
  -p your_secure_password \
  --admin
```

## Connecting with Element

1. Open `https://element.yourdomain.com` (or `http://localhost:8080` for local testing)
2. Click "Sign In"
3. Change the homeserver to `https://matrix.yourdomain.com`
4. Enter your username and password
5. You are now logged into your self-hosted Matrix server

## Creating Rooms and Inviting Users

```bash
# Create a room via the admin API
curl -X POST https://matrix.yourdomain.com/_matrix/client/v3/createRoom \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "General",
    "topic": "General discussion",
    "preset": "private_chat",
    "visibility": "private"
  }'
```

## Admin API

Synapse provides a powerful admin API for server management.

```bash
# List all users
curl -s "https://matrix.yourdomain.com/_synapse/admin/v2/users?from=0&limit=10" \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"

# Get server version
curl -s "https://matrix.yourdomain.com/_synapse/admin/v1/server_version" \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"

# List all rooms
curl -s "https://matrix.yourdomain.com/_synapse/admin/v1/rooms?limit=10" \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"

# Deactivate a user
curl -X POST "https://matrix.yourdomain.com/_synapse/admin/v1/deactivate/@user:yourdomain.com" \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"erase": false}'
```

## Backup and Restore

```bash
# Back up the PostgreSQL database
docker compose exec postgres pg_dump -U synapse synapse > synapse-backup-$(date +%Y%m%d).sql

# Back up media files
docker cp synapse:/data/media_store ./media-backup-$(date +%Y%m%d)

# Restore the database
cat synapse-backup-20260201.sql | docker compose exec -T postgres psql -U synapse synapse
```

## Updating Synapse

```bash
# Pull the latest images
docker compose pull

# Restart with new versions
docker compose up -d

# Check the version
curl -s https://matrix.yourdomain.com/_matrix/federation/v1/version
```

## Stopping and Cleaning Up

```bash
# Stop all services
docker compose down

# Remove everything including message history
docker compose down -v
```

## Summary

Matrix with Synapse gives you a self-hosted, federated chat platform with end-to-end encryption, rich media support, and bridges to other messaging services. Running it in Docker with PostgreSQL provides solid performance, and the Element web client gives users a polished interface. Federation lets your server communicate with the wider Matrix network, meaning your users can chat with anyone on any Matrix server. The setup requires some DNS configuration and TLS certificates, but once running, you have a communication platform that you fully own and control.
