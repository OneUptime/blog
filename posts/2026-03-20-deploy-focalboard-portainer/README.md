# How to Deploy Focalboard via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Focalboard, Project Management, Docker, Self-Hosted

Description: Deploy Focalboard open-source project management tool via Portainer as a self-hosted alternative to Trello and Asana.

## Introduction

Focalboard is an open-source, self-hosted project management tool that is an alternative to Trello, Notion, and Asana. It supports board, gallery, table, and calendar views backed by PostgreSQL. Note: Focalboard is now part of Mattermost and the standalone version is in maintenance mode; for active development use the Mattermost integration.

## Prerequisites

- Portainer installed with Docker

## Step 1: Create the Stack in Portainer

Navigate to **Stacks** > **Add Stack**:

```yaml
# docker-compose.yml - Focalboard

version: "3.8"

services:
  focalboard:
    image: mattermost/focalboard:7.11.4
    container_name: focalboard
    restart: unless-stopped
    ports:
      - "8000:8000"
    volumes:
      - focalboard_data:/opt/focalboard/data
      - ./config.json:/opt/focalboard/config.json:ro
    depends_on:
      focalboard_postgres:
        condition: service_healthy
    networks:
      - focalboard_net

  focalboard_postgres:
    image: postgres:15-alpine
    container_name: focalboard_postgres
    restart: unless-stopped
    volumes:
      - focalboard_postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=focalboard
      - POSTGRES_USER=focalboard
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U focalboard"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - focalboard_net

volumes:
  focalboard_data:
  focalboard_postgres_data:

networks:
  focalboard_net:
    driver: bridge
```

## Step 2: Create the Configuration File

Create `config.json` on the host before starting the stack:

```bash
cat > /path/to/config.json << 'EOF'
{
    "serverRoot": "http://localhost:8000",
    "port": 8000,
    "dbtype": "postgres",
    "dbconfig": "postgres://focalboard:YOUR_DB_PASSWORD@focalboard_postgres:5432/focalboard?sslmode=disable",
    "useSSL": false,
    "webpath": "./pack",
    "filespath": "/opt/focalboard/data/files",
    "telemetry": false,
    "prometheus_address": ":9092",
    "session_expire_time": 2592000,
    "session_refresh_time": 18000,
    "localOnly": false,
    "enableLocalMode": true,
    "localModeSocketLocation": "/var/tmp/focalboard_local.socket"
}
EOF
```

Update the `dbconfig` with your actual `DB_PASSWORD`.

## Step 3: Access Focalboard

Open `http://<host>:8000` and register a new user account.

## Step 4: Use the REST API

```bash
# Login
curl -X POST http://localhost:8000/api/v2/login \
  -H 'Content-Type: application/json' \
  -d '{"type": "normal", "username": "admin", "password": "your-password"}'

# List boards in a team (use team ID "0" in personal-server mode)
curl http://localhost:8000/api/v2/teams/0/boards \
  -H 'Authorization: Bearer <token>'
```

## Conclusion

Focalboard uses a PostgreSQL backend for persistent storage. The `config.json` file controls database connection, file storage location, and session management. For new projects, consider using Mattermost's integrated Focalboard (Boards) for ongoing updates and active maintenance.
