# How to Deploy Baserow via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Baserow, Airtable Alternative, Docker, Self-Hosted

Description: Deploy Baserow open-source no-code database platform using Portainer as a self-hosted Airtable alternative.

## Introduction

Baserow is an open-source no-code database tool that functions as a self-hosted alternative to Airtable. It offers a spreadsheet-like interface backed by PostgreSQL, with REST API auto-generation and real-time collaboration.

## Prerequisites

- Portainer installed with Docker
- At least 2 GB RAM

## Step 1: Create the Stack in Portainer

Navigate to **Stacks** > **Add Stack**:

```yaml
# docker-compose.yml - Baserow

version: "3.8"

services:
  baserow:
    image: baserow/baserow:1.25.2
    container_name: baserow
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - baserow_data:/baserow/data
    environment:
      - BASEROW_PUBLIC_URL=http://${BASEROW_DOMAIN}
      - DATABASE_HOST=baserow_postgres
      - DATABASE_PORT=5432
      - DATABASE_NAME=baserow
      - DATABASE_USER=baserow
      - DATABASE_PASSWORD=${DB_PASSWORD}
      - REDIS_URL=redis://baserow_redis:6379
      - SECRET_KEY=${SECRET_KEY}
      - EMAIL_SMTP=true
      - EMAIL_SMTP_HOST=${SMTP_HOST}
      - EMAIL_SMTP_PORT=587
      - EMAIL_SMTP_USE_TLS=true
      - EMAIL_SMTP_USER=${SMTP_USER}
      - EMAIL_SMTP_PASSWORD=${SMTP_PASSWORD}
      - FROM_EMAIL=noreply@${BASEROW_DOMAIN}
    depends_on:
      baserow_postgres:
        condition: service_healthy
      baserow_redis:
        condition: service_healthy
    networks:
      - baserow_net

  baserow_postgres:
    image: postgres:15-alpine
    container_name: baserow_postgres
    restart: unless-stopped
    volumes:
      - baserow_postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=baserow
      - POSTGRES_USER=baserow
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U baserow"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - baserow_net

  baserow_redis:
    image: redis:7-alpine
    container_name: baserow_redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - baserow_net

volumes:
  baserow_data:
  baserow_postgres_data:

networks:
  baserow_net:
    driver: bridge
```

## Step 2: Set Environment Variables in Portainer

```text
BASEROW_DOMAIN=baserow.yourdomain.com
DB_PASSWORD=your-secure-db-password
SECRET_KEY=your-50-char-secret-key
SMTP_HOST=smtp.yourdomain.com
SMTP_USER=noreply@yourdomain.com
SMTP_PASSWORD=your-smtp-password
```

## Step 3: Access Baserow

Open `http://<host>` and register your first admin user.

## Step 4: Use the REST API

Baserow auto-generates a REST API for every table:

```bash
# Get a JWT (valid for 60 minutes, refreshable)
curl -X POST http://baserow.yourdomain.com/api/user/token-auth/ \
  -H 'Content-Type: application/json' \
  -d '{"email": "admin@example.com", "password": "your-password"}'

# List rows from a table (table ID from URL)
curl http://baserow.yourdomain.com/api/database/rows/table/1/ \
  -H 'Authorization: JWT <your-jwt>'

# Create a row
curl -X POST http://baserow.yourdomain.com/api/database/rows/table/1/ \
  -H 'Authorization: JWT <your-jwt>' \
  -H 'Content-Type: application/json' \
  -d '{"Name": "Alice", "Status": "Active"}'
```

For long-lived programmatic access, create a **Database Token** in the Baserow UI under your workspace settings and authenticate with `Authorization: Token <database-token>` instead.

## Conclusion

Baserow packages all services (web, backend, worker, celery) into the single `baserow/baserow` image for simplified deployment. For production, set a strong `SECRET_KEY` and configure SMTP for invitation emails. Database backups should target the `baserow_postgres` container with `pg_dump`.
