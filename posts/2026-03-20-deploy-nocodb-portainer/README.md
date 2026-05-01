# How to Deploy NocoDB via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, NocoDB, Airtable Alternative, Docker, Self-Hosted

Description: Deploy NocoDB open-source Airtable alternative using Portainer to build no-code databases with REST API generation.

## Introduction

NocoDB is an open-source Airtable alternative that turns any MySQL, PostgreSQL, SQLite, or SQL Server database into a smart spreadsheet with an intuitive UI and auto-generated REST APIs.

## Prerequisites

- Portainer installed with Docker

## Step 1: Create the Stack in Portainer

Navigate to **Stacks** > **Add Stack**:

```yaml
# docker-compose.yml - NocoDB

version: "3.8"

services:
  nocodb:
    image: nocodb/nocodb:latest
    container_name: nocodb
    restart: unless-stopped
    ports:
      - "8080:8080"
    volumes:
      - nocodb_data:/usr/app/data
    environment:
      - NC_DB=pg://nocodb_postgres:5432?u=nocodb&p=${DB_PASSWORD}&d=nocodb
      - NC_AUTH_JWT_SECRET=${JWT_SECRET}
      - NC_PUBLIC_URL=http://${NOCODB_DOMAIN}:8080
    depends_on:
      nocodb_postgres:
        condition: service_healthy
    networks:
      - nocodb_net

  nocodb_postgres:
    image: postgres:16-alpine
    container_name: nocodb_postgres
    restart: unless-stopped
    volumes:
      - nocodb_postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=nocodb
      - POSTGRES_USER=nocodb
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U nocodb"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - nocodb_net

volumes:
  nocodb_data:
  nocodb_postgres_data:

networks:
  nocodb_net:
    driver: bridge
```

## Step 2: Set Environment Variables in Portainer

```text
DB_PASSWORD=your-postgres-password
JWT_SECRET=your-jwt-secret-min-32-chars
NOCODB_DOMAIN=nocodb.yourdomain.com
```

## Step 3: Access NocoDB

Open `http://<host>:8080/dashboard` and create the first super admin account.

## Step 4: Connect to an External Database

In the NocoDB UI:
1. Click the base name in the left sidebar to open the base homepage
2. Click **Connect External Data**
3. Enter connection details for the external database
4. Click **Test Database Connection**, then **Add Source**

## Step 5: Use the Auto-Generated REST API

```bash
# Get API token from NocoDB UI: Account Settings > API Tokens

# List records from a table
curl "http://localhost:8080/api/v3/data/{base-id}/{table-id}/records?pageSize=25" \
  -H "xc-token: your-api-token"

# Create a record
curl -X POST "http://localhost:8080/api/v3/data/{base-id}/{table-id}/records" \
  -H "xc-token: your-api-token" \
  -H "Content-Type: application/json" \
  -d '{"fields": {"Name": "Alice", "Status": "Active"}}'

# Search with filters
curl "http://localhost:8080/api/v3/data/{base-id}/{table-id}/records?where=(Status,eq,Active)&pageSize=25" \
  -H "xc-token: your-api-token"
```

## Step 6: Export Table Data

In the NocoDB UI:
1. Click the `:` icon in the toolbar
2. Choose **Download**
3. Select **CSV**

## Conclusion

NocoDB stores its own metadata in the `NC_DB` database while connecting to your existing databases as data sources. The `NC_AUTH_JWT_SECRET` secures authentication and other stored secrets. NocoDB supports row-level permissions per view - use shared views for embedding spreadsheets publicly without exposing admin access.
