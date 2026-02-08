# How to Run Baserow in Docker (Airtable Alternative)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Baserow, Airtable Alternative, No-Code, Database, Docker Compose, Self-Hosted

Description: Deploy Baserow in Docker as a self-hosted, open-source Airtable alternative with a real-time collaborative database interface.

---

Baserow is an open-source, no-code database platform that provides a spreadsheet-like interface backed by a real PostgreSQL database. It competes directly with Airtable, but you own the data and the infrastructure. Unlike some alternatives that feel like thin wrappers around SQL, Baserow offers genuine features like real-time collaboration, row-level comments, form views, and a plugin system for extending functionality.

Running Baserow in Docker gives you the simplest deployment path. The official Docker images bundle everything you need, including the web frontend, the API backend, a Celery worker for background tasks, and PostgreSQL. This guide walks through the full setup, from quick testing to production-ready deployment.

## What Makes Baserow Different

Baserow stands out among Airtable alternatives for several reasons. The real-time collaboration works smoothly, with multiple users seeing each other's changes instantly. The API is well-documented and automatically generated for every table. Baserow also supports plugins, so you can extend field types and integrations. The interface feels polished and responsive, not like a hastily built open-source clone.

## Prerequisites

Docker and Docker Compose are required. Baserow needs at least 2 GB of RAM for comfortable operation, and 4 GB if you plan on having more than a few concurrent users.

```bash
# Verify Docker installation
docker --version
docker compose version
```

## Quick Start with the All-in-One Image

Baserow offers an all-in-one image that bundles everything into a single container. This is perfect for testing and small deployments.

```bash
# Run Baserow all-in-one with persistent data
docker run -d \
  --name baserow \
  -p 8080:80 \
  -v baserow-data:/baserow/data \
  -e BASEROW_PUBLIC_URL=http://localhost:8080 \
  baserow/baserow:latest
```

Wait about 30-60 seconds for all services to start, then open `http://localhost:8080` in your browser. Create your admin account through the setup wizard.

## Production Setup with Docker Compose

For production, use the standalone services configuration. This gives you separate containers for the web frontend, API backend, Celery workers, and the database. Each can be scaled and monitored independently.

```yaml
# docker-compose.yml - Baserow production setup
version: "3.8"

services:
  baserow:
    image: baserow/baserow:latest
    container_name: baserow
    restart: unless-stopped
    ports:
      - "8080:80"
    volumes:
      - baserow-data:/baserow/data
    environment:
      # Public URL where Baserow is accessible
      BASEROW_PUBLIC_URL: https://baserow.yourdomain.com
      # Database connection (using external PostgreSQL)
      DATABASE_HOST: baserow-postgres
      DATABASE_PORT: 5432
      DATABASE_NAME: baserow
      DATABASE_USER: baserow
      DATABASE_PASSWORD: ${POSTGRES_PASSWORD}
      # Redis for caching and Celery task queue
      REDIS_URL: redis://baserow-redis:6379/0
      # Secret key for Django (generate a random string)
      SECRET_KEY: ${SECRET_KEY}
      # Email configuration for invitations and notifications
      EMAIL_SMTP: "true"
      EMAIL_SMTP_HOST: smtp.gmail.com
      EMAIL_SMTP_PORT: 587
      EMAIL_SMTP_USE_TLS: "true"
      EMAIL_SMTP_USER: ${SMTP_USER}
      EMAIL_SMTP_PASSWORD: ${SMTP_PASSWORD}
      FROM_EMAIL: baserow@yourdomain.com
      # Disable telemetry
      BASEROW_DISABLE_ANONYMOUS_TELEMETRY: "true"
    depends_on:
      baserow-postgres:
        condition: service_healthy
      baserow-redis:
        condition: service_healthy

  baserow-postgres:
    image: postgres:16-alpine
    container_name: baserow-postgres
    restart: unless-stopped
    volumes:
      - baserow-postgres-data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: baserow
      POSTGRES_USER: baserow
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U baserow"]
      interval: 10s
      timeout: 5s
      retries: 5

  baserow-redis:
    image: redis:7-alpine
    container_name: baserow-redis
    restart: unless-stopped
    volumes:
      - baserow-redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  baserow-data:
  baserow-postgres-data:
  baserow-redis-data:
```

Create the environment file.

```bash
# .env - Sensitive configuration values
POSTGRES_PASSWORD=your-secure-postgres-password
SECRET_KEY=your-random-django-secret-key-at-least-50-chars
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password
```

Generate the secret key.

```bash
# Generate a random secret key for Django
openssl rand -hex 50
```

Start everything.

```bash
# Launch the full Baserow stack
docker compose up -d

# Monitor startup progress
docker compose logs -f baserow
```

The first startup takes longer as Baserow runs database migrations. Watch the logs for a message confirming the web server is ready.

## Creating Tables and Fields

After creating your admin account, click "Create new database." Baserow organizes data into workspaces containing databases, which contain tables.

Baserow supports these field types:
- Text (single line and long text)
- Number (integer and decimal)
- Boolean (checkbox)
- Date and DateTime
- Single select and Multiple select
- Link to another table (foreign key relationships)
- File attachments
- Formula fields
- Lookup and Rollup fields
- URL, Email, and Phone number
- Rating and Progress bar

The formula field supports expressions similar to spreadsheet formulas.

```
# Example Baserow formulas
concat(field('First Name'), ' ', field('Last Name'))
if(field('Status') = 'Active', 'Yes', 'No')
todate(field('Date String'), 'YYYY-MM-DD')
```

## Using the REST API

Every table gets a REST API automatically. Find the API documentation for your specific tables under the database settings.

```bash
# List all rows in a table
curl -X GET \
  -H "Authorization: Token your-api-token" \
  "http://localhost:8080/api/database/rows/table/TABLE_ID/?user_field_names=true"

# Create a new row
curl -X POST \
  -H "Authorization: Token your-api-token" \
  -H "Content-Type: application/json" \
  -d '{"Name": "New Project", "Status": "Planning", "Priority": "High"}' \
  "http://localhost:8080/api/database/rows/table/TABLE_ID/?user_field_names=true"

# Update an existing row
curl -X PATCH \
  -H "Authorization: Token your-api-token" \
  -H "Content-Type: application/json" \
  -d '{"Status": "In Progress"}' \
  "http://localhost:8080/api/database/rows/table/TABLE_ID/ROW_ID/?user_field_names=true"

# Delete a row
curl -X DELETE \
  -H "Authorization: Token your-api-token" \
  "http://localhost:8080/api/database/rows/table/TABLE_ID/ROW_ID/"
```

Generate API tokens from the Baserow web interface under Settings > API tokens.

## Views and Sharing

Baserow supports multiple view types:

- **Grid View**: standard spreadsheet layout with sorting and filtering
- **Gallery View**: card-based view for visual data
- **Form View**: create input forms, shareable via public link
- **Kanban View**: organize records into columns by a single-select field

Each view supports filters, sorting, and field visibility independent of other views. You can share views publicly with anyone, even without a Baserow account.

## Webhooks and Integrations

Baserow supports webhooks for real-time notifications when data changes.

```bash
# Create a webhook via the API
curl -X POST \
  -H "Authorization: Token your-api-token" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://n8n.yourdomain.com/webhook/baserow-events",
    "events": ["rows.created", "rows.updated", "rows.deleted"],
    "table_id": 1
  }' \
  "http://localhost:8080/api/database/webhooks/table/TABLE_ID/"
```

## Managing Users and Permissions

Invite team members through the workspace settings. Baserow supports these roles:
- **Admin**: full access including settings
- **Member**: can create and edit databases and tables
- **Viewer**: read-only access (available in the premium version)

```bash
# Invite a user via the API
curl -X POST \
  -H "Authorization: Token your-api-token" \
  -H "Content-Type: application/json" \
  -d '{"email": "colleague@example.com"}' \
  "http://localhost:8080/api/workspaces/WORKSPACE_ID/invitations/"
```

## Backup Strategy

Back up the PostgreSQL database and the Baserow data volume (which contains file uploads).

```bash
# Backup PostgreSQL
docker exec baserow-postgres pg_dump -U baserow baserow > baserow-db-$(date +%Y%m%d).sql

# Backup the data volume
docker run --rm \
  -v baserow-data:/source:ro \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/baserow-data-$(date +%Y%m%d).tar.gz -C /source .

# Restore the database
docker exec -i baserow-postgres psql -U baserow baserow < baserow-db-20260208.sql
```

## Updating Baserow

Update by pulling the new image and recreating the container. Baserow handles database migrations automatically.

```bash
# Pull the latest image
docker compose pull

# Recreate containers with the new image
docker compose up -d

# Check migration logs
docker compose logs -f baserow
```

## Reverse Proxy Configuration

```yaml
# Traefik labels for Baserow
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.baserow.rule=Host(`baserow.yourdomain.com`)"
  - "traefik.http.routers.baserow.entrypoints=websecure"
  - "traefik.http.routers.baserow.tls.certresolver=letsencrypt"
  - "traefik.http.services.baserow.loadbalancer.server.port=80"
```

Make sure BASEROW_PUBLIC_URL matches the URL you configure in your reverse proxy.

## Summary

Baserow delivers a polished Airtable experience that you can self-host entirely. The Docker deployment bundles everything into a manageable stack, and the auto-generated REST API makes it useful beyond just a spreadsheet interface. Real-time collaboration, webhooks, and a growing plugin ecosystem make it suitable for teams that need a flexible data management tool without recurring SaaS costs. Monitor the underlying PostgreSQL and Redis instances with OneUptime to keep the platform stable as your data grows.
