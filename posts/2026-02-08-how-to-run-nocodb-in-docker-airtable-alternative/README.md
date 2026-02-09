# How to Run Nocodb in Docker (Airtable Alternative)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, NocoDB, Airtable Alternative, Database, No-Code, Docker Compose, Self-Hosted

Description: Deploy NocoDB in Docker as a self-hosted Airtable alternative that turns any database into a smart spreadsheet interface.

---

NocoDB turns any SQL database into a spreadsheet-like interface. If you have ever used Airtable and wished you could self-host it with your own database, NocoDB is exactly what you need. It connects to MySQL, PostgreSQL, MariaDB, or SQL Server and layers a collaborative, no-code interface on top. Your data stays in your database. NocoDB just provides a better way to view, edit, and share it.

Running NocoDB in Docker is the simplest deployment method. This guide covers setting it up with Docker Compose, connecting it to an existing database, configuring views and forms, and securing it for team use.

## Why NocoDB Over Airtable

Airtable is great until you hit the row limits, need to keep data on your own servers, or want to avoid vendor lock-in. NocoDB addresses all three concerns:

- No row limits beyond what your database can handle
- Data lives in a standard SQL database you fully control
- Open-source with no licensing fees
- REST and GraphQL APIs generated automatically for every table
- Works on top of existing databases without migrating data

## Prerequisites

You need Docker and Docker Compose. NocoDB itself is lightweight, but the backend database needs appropriate resources for your data volume.

```bash
# Verify Docker is installed
docker --version
docker compose version
```

## Quick Start

Get NocoDB running in seconds.

```bash
# Run NocoDB with built-in SQLite (good for testing)
docker run -d \
  --name nocodb \
  -p 8080:8080 \
  -v nocodb-data:/usr/app/data \
  nocodb/nocodb:latest
```

Open `http://your-server-ip:8080` and create your admin account. NocoDB uses an embedded SQLite database by default, which works for small projects and testing.

## Production Setup with Docker Compose

For production, use PostgreSQL as the metadata store and connect NocoDB to your data database separately.

```yaml
# docker-compose.yml - NocoDB with PostgreSQL backend
version: "3.8"

services:
  nocodb:
    image: nocodb/nocodb:latest
    container_name: nocodb
    restart: unless-stopped
    ports:
      - "8080:8080"
    volumes:
      # Persist NocoDB data and file uploads
      - nocodb-data:/usr/app/data
    environment:
      # Use PostgreSQL for NocoDB's internal metadata
      NC_DB: "pg://nocodb-postgres:5432?u=nocodb&p=${POSTGRES_PASSWORD}&d=nocodb"
      # Secret for JWT token signing
      NC_AUTH_JWT_SECRET: ${JWT_SECRET}
      # Public URL for generating share links
      NC_PUBLIC_URL: https://nocodb.yourdomain.com
      # Disable telemetry
      NC_DISABLE_TELE: "true"
      # Timezone
      NC_TIMEZONE: America/New_York
    depends_on:
      nocodb-postgres:
        condition: service_healthy

  nocodb-postgres:
    image: postgres:16-alpine
    container_name: nocodb-postgres
    restart: unless-stopped
    volumes:
      - nocodb-postgres-data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: nocodb
      POSTGRES_USER: nocodb
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U nocodb"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  nocodb-data:
  nocodb-postgres-data:
```

Create the environment file.

```bash
# .env - Sensitive configuration
POSTGRES_PASSWORD=your-secure-postgres-password
JWT_SECRET=your-random-jwt-secret-at-least-32-chars
```

Generate the JWT secret.

```bash
# Generate a random JWT secret
openssl rand -hex 32
```

Launch the stack.

```bash
# Start NocoDB and PostgreSQL
docker compose up -d

# Watch for startup completion
docker compose logs -f nocodb
```

## Connecting to an Existing Database

NocoDB's real power shows when you connect it to an existing database. After logging into the web interface:

1. Click "New Project"
2. Select "Connect to an External Database"
3. Enter your database connection details

NocoDB supports these connection strings:

```bash
# PostgreSQL
pg://hostname:5432?u=username&p=password&d=database_name

# MySQL
mysql2://hostname:3306?u=username&p=password&d=database_name

# MariaDB
mysql2://hostname:3306?u=username&p=password&d=database_name

# SQL Server
mssql://hostname:1433?u=username&p=password&d=database_name
```

If the database is also running in Docker, use the Docker network hostname.

```yaml
# Example: connect NocoDB to an existing PostgreSQL container
# Add both to the same Docker network
networks:
  shared:
    external: true
```

NocoDB reads the schema, discovers tables, relationships, and indexes, and generates the spreadsheet interface automatically. Foreign keys become linked records, similar to Airtable's linked records feature.

## Working with Views

NocoDB supports multiple view types for the same underlying table:

- **Grid View**: traditional spreadsheet layout
- **Gallery View**: card-based layout, great for image-heavy data
- **Kanban View**: drag-and-drop board organized by a single-select field
- **Form View**: input forms for data entry, shareable via public URL
- **Calendar View**: date-based calendar layout

Create views through the web interface by clicking the "+" icon next to the table name. Each view can have its own filters, sort order, and hidden fields.

## API Access

Every table in NocoDB automatically gets REST and GraphQL APIs. This makes NocoDB useful as a quick backend for prototypes or internal tools.

```bash
# List all rows in a table via the REST API
curl -X GET \
  -H "xc-auth: your-api-token" \
  "http://localhost:8080/api/v1/db/data/noco/project_id/table_name"

# Create a new row
curl -X POST \
  -H "xc-auth: your-api-token" \
  -H "Content-Type: application/json" \
  -d '{"Name": "New Item", "Status": "Active", "Priority": "High"}' \
  "http://localhost:8080/api/v1/db/data/noco/project_id/table_name"

# Update a row
curl -X PATCH \
  -H "xc-auth: your-api-token" \
  -H "Content-Type: application/json" \
  -d '{"Status": "Completed"}' \
  "http://localhost:8080/api/v1/db/data/noco/project_id/table_name/row_id"

# Delete a row
curl -X DELETE \
  -H "xc-auth: your-api-token" \
  "http://localhost:8080/api/v1/db/data/noco/project_id/table_name/row_id"
```

Generate API tokens from the NocoDB web interface under Team & Settings > API Tokens.

## Webhooks for Automation

NocoDB can fire webhooks when records are created, updated, or deleted. Configure them through the table settings.

```json
{
  "hook_name": "On New Record",
  "event": "after",
  "operation": "insert",
  "notification": {
    "type": "URL",
    "payload": {
      "method": "POST",
      "body": "{{ json data }}",
      "headers": {
        "Content-Type": "application/json"
      },
      "path": "https://n8n.yourdomain.com/webhook/nocodb-new-record"
    }
  }
}
```

This integrates well with n8n or Huginn for building automated workflows triggered by data changes.

## User Management and Sharing

NocoDB supports multiple users with role-based access control. Invite team members through the web interface with these roles:

- **Owner**: full access to everything
- **Creator**: can create tables and views
- **Editor**: can edit data but not schema
- **Commenter**: can only add comments
- **Viewer**: read-only access

You can also share individual views publicly via a link, which is useful for forms that external users fill out.

## Backup and Restore

Back up both the NocoDB metadata database and any connected data databases.

```bash
# Backup the NocoDB metadata database
docker exec nocodb-postgres pg_dump -U nocodb nocodb > nocodb-backup-$(date +%Y%m%d).sql

# Backup the NocoDB data volume (contains file uploads)
docker run --rm \
  -v nocodb-data:/source:ro \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/nocodb-data-$(date +%Y%m%d).tar.gz -C /source .
```

## Reverse Proxy Configuration

Put NocoDB behind a reverse proxy for SSL access.

```yaml
# Traefik labels for NocoDB
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.nocodb.rule=Host(`nocodb.yourdomain.com`)"
  - "traefik.http.routers.nocodb.entrypoints=websecure"
  - "traefik.http.routers.nocodb.tls.certresolver=letsencrypt"
  - "traefik.http.services.nocodb.loadbalancer.server.port=8080"
```

## Summary

NocoDB is a practical self-hosted replacement for Airtable that works on top of standard SQL databases. Running it in Docker with PostgreSQL gives you a production-ready setup in minutes. The auto-generated APIs make it useful beyond just a spreadsheet interface, serving as a rapid backend for internal tools. Combined with webhooks and automation tools, NocoDB becomes a central piece of your data management infrastructure. For monitoring the database health underneath, tools like OneUptime can alert you when connection counts spike or query times degrade.
