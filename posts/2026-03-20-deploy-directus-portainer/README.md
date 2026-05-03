# How to Deploy Directus via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Directus, CMS, Docker, Headless CMS

Description: Deploy Directus data platform and headless CMS using Portainer for instant API generation over your database.

## Introduction

Directus is an open-source headless CMS and data platform that wraps any SQL database with a REST and GraphQL API, plus an intuitive admin interface. This guide deploys Directus backed by PostgreSQL via Portainer.

## Prerequisites

- Portainer installed with Docker
- At least 2 GB RAM

## Step 1: Create the Stack in Portainer

Navigate to **Stacks** > **Add Stack**:

```yaml
# docker-compose.yml - Directus

version: "3.8"

services:
  directus:
    image: directus/directus:10.13.0
    container_name: directus
    restart: unless-stopped
    ports:
      - "8055:8055"
    volumes:
      - directus_uploads:/directus/uploads
      - directus_extensions:/directus/extensions
    environment:
      - SECRET=${DIRECTUS_SECRET}
      - DB_CLIENT=pg
      - DB_HOST=directus_postgres
      - DB_PORT=5432
      - DB_DATABASE=directus
      - DB_USER=directus
      - DB_PASSWORD=${DB_PASSWORD}
      - CACHE_ENABLED=true
      - CACHE_STORE=redis
      - REDIS=redis://directus_redis:6379
      - ADMIN_EMAIL=${ADMIN_EMAIL}
      - ADMIN_PASSWORD=${ADMIN_PASSWORD}
      - PUBLIC_URL=http://${DIRECTUS_DOMAIN}:8055
    depends_on:
      directus_postgres:
        condition: service_healthy
      directus_redis:
        condition: service_healthy
    networks:
      - directus_net

  directus_postgres:
    image: postgres:16-alpine
    container_name: directus_postgres
    restart: unless-stopped
    volumes:
      - directus_postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=directus
      - POSTGRES_USER=directus
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U directus"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - directus_net

  directus_redis:
    image: redis:7-alpine
    container_name: directus_redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - directus_net

volumes:
  directus_uploads:
  directus_extensions:
  directus_postgres_data:

networks:
  directus_net:
    driver: bridge
```

## Step 2: Set Environment Variables in Portainer

```text
DIRECTUS_SECRET=your-random-64-char-secret
DB_PASSWORD=your-db-password
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=your-admin-password
DIRECTUS_DOMAIN=directus.yourdomain.com
```

## Step 3: Access the Admin Panel

Open `http://<host>:8055` and log in with your admin credentials.

## Step 4: Query the Auto-Generated API

```bash
# Authenticate and get access token
curl -X POST http://localhost:8055/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email": "admin@yourdomain.com", "password": "your-password"}'

# List items from a collection
curl http://localhost:8055/items/articles \
  -H 'Authorization: Bearer <access_token>'

# Create an item
curl -X POST http://localhost:8055/items/articles \
  -H 'Authorization: Bearer <access_token>' \
  -H 'Content-Type: application/json' \
  -d '{"title": "Hello World", "status": "published"}'

# GraphQL query
curl -X POST http://localhost:8055/graphql \
  -H 'Authorization: Bearer <access_token>' \
  -H 'Content-Type: application/json' \
  -d '{"query": "{ articles { id title status } }"}'
```

## Step 5: Upload and Serve Files

```bash
# Upload a file
curl -X POST http://localhost:8055/files \
  -H 'Authorization: Bearer <access_token>' \
  -F 'file=@/path/to/image.jpg'

# Access the file (Directus transforms images on the fly)
# Original: http://localhost:8055/assets/<file-id>
# Resized: http://localhost:8055/assets/<file-id>?width=400&height=300&fit=cover
```

## Conclusion

Directus auto-generates REST and GraphQL APIs for every table in your database, including custom collections you define in the admin panel. The `PUBLIC_URL` env var must match your actual URL or file links will be broken. Use Redis caching (`CACHE_ENABLED=true`) to reduce database load on read-heavy workloads.
