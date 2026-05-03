# How to Deploy Budibase via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Budibase, Low Code, Docker, Self-Hosted

Description: Deploy Budibase low-code platform using Portainer to quickly build internal tools and business applications.

## Introduction

Budibase is an open-source low-code platform for building internal tools, admin panels, and CRUD applications. It connects to PostgreSQL, MySQL, MongoDB, REST APIs, and more. This guide deploys Budibase via Portainer.

## Prerequisites

- Portainer installed with Docker
- At least 2 GB RAM

## Step 1: Create the Stack in Portainer

Navigate to **Stacks** > **Add Stack**:

```yaml
# docker-compose.yml - Budibase

version: "3.8"

services:
  budibase:
    image: budibase/budibase:3.37.2
    container_name: budibase
    restart: unless-stopped
    ports:
      - "80:80"
    volumes:
      - budibase_data:/data
    environment:
      - JWT_SECRET=${JWT_SECRET}
      - MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY}
      - MINIO_SECRET_KEY=${MINIO_SECRET_KEY}
      - REDIS_PASSWORD=${REDIS_PASSWORD}
      - COUCHDB_PASSWORD=${COUCHDB_PASSWORD}
      - COUCHDB_USER=budibase
      - INTERNAL_API_KEY=${INTERNAL_API_KEY}
      - BB_ADMIN_USER_EMAIL=${ADMIN_EMAIL}
      - BB_ADMIN_USER_PASSWORD=${ADMIN_PASSWORD}
    networks:
      - budibase_net

volumes:
  budibase_data:

networks:
  budibase_net:
    driver: bridge
```

The `budibase/budibase` image bundles all services (app server, worker, CouchDB, MinIO, Redis, NGINX proxy) into a single container for simplified self-hosting.

## Step 2: Set Environment Variables in Portainer

```text
JWT_SECRET=your-random-jwt-secret-min-32-chars
MINIO_ACCESS_KEY=your-minio-access-key
MINIO_SECRET_KEY=your-minio-secret-key
REDIS_PASSWORD=your-redis-password
COUCHDB_PASSWORD=your-couchdb-password
INTERNAL_API_KEY=your-internal-api-key
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=your-admin-password
```

## Step 3: Access the Budibase Builder

Open `http://<host>` and log in with your admin credentials.

## Step 4: Create an Application

1. Click **Create new app**
2. Choose a template or start from scratch
3. Connect a data source (PostgreSQL, REST API, etc.)
4. Drag and drop components to build your UI
5. Configure automations if needed

## Step 5: Connect an External Database

In the Budibase Builder:

1. Navigate to **Data** > **Add source**
2. Select **PostgreSQL** (or MySQL, MongoDB, etc.)
3. Enter connection details:
   - Host: `your-db-host`
   - Port: `5432`
   - Database: `your-database`
   - User / Password

## Step 6: Use the REST API

```bash
# Authenticate
curl -X POST http://budibase-host/api/global/auth/default/login \
  -H 'Content-Type: application/json' \
  -d '{"username": "admin@yourdomain.com", "password": "your-password"}'

# List applications via the Public API (requires an API key generated from the Budibase portal)
curl http://budibase-host/api/public/v1/applications \
  -H 'x-budibase-api-key: <your-api-key>'
```

## Conclusion

Budibase's single Docker image simplifies deployment - all internal services are managed by a supervisor process within the container. The `budibase_data` volume persists CouchDB data and MinIO object storage. For production, replace the bundled MinIO with external S3 or a dedicated MinIO instance and configure external PostgreSQL instead of the embedded CouchDB.
