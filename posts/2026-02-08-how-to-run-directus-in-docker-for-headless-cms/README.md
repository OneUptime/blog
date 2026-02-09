# How to Run Directus in Docker for Headless CMS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Directus, Headless CMS, API, Docker Compose, Database, Self-Hosted, Content Management

Description: Deploy Directus in Docker as a headless CMS that wraps any SQL database with a real-time API and an intuitive admin interface.

---

Directus takes a different approach to the headless CMS space. Instead of managing its own proprietary data format, it connects to your existing SQL database and layers an API and admin panel on top. Your data stays in standard database tables with normal columns and relationships. If you ever stop using Directus, your data remains perfectly usable in plain SQL. No migration, no export, no vendor lock-in.

This database-first philosophy makes Directus exceptionally flexible. It works with PostgreSQL, MySQL, MariaDB, SQLite, MS SQL Server, CockroachDB, and OracleDB. Running it in Docker is the recommended deployment method. This guide covers the complete setup with Docker Compose, from initial deployment to production configuration.

## Why Directus

Directus differentiates itself from other headless CMS platforms in several key ways:

- Database-first: your data lives in regular SQL tables, not a proprietary format
- Works with existing databases: connect to a database that already has data and Directus builds the admin panel automatically
- Real-time API: WebSocket support for live data updates
- Flows: built-in automation system for workflows triggered by data changes
- Custom dashboards: build analytics dashboards inside Directus
- Granular permissions: role-based access control at the field level

## Prerequisites

Docker and Docker Compose installed. Directus runs on Node.js and uses around 300-500 MB of RAM. The database requirements depend on your data volume.

```bash
# Verify Docker installation
docker --version
docker compose version
```

## Docker Compose Setup

Here is a production-ready Docker Compose configuration with PostgreSQL and Redis.

```yaml
# docker-compose.yml - Directus Headless CMS
version: "3.8"

services:
  directus:
    image: directus/directus:11
    container_name: directus
    restart: unless-stopped
    ports:
      - "8055:8055"
    volumes:
      # Persist file uploads
      - directus-uploads:/directus/uploads
      # Persist extensions
      - directus-extensions:/directus/extensions
    environment:
      # Secret key for signing tokens (generate a random string)
      SECRET: ${DIRECTUS_SECRET}
      # Admin account created on first run
      ADMIN_EMAIL: admin@yourdomain.com
      ADMIN_PASSWORD: ${ADMIN_PASSWORD}
      # PostgreSQL connection
      DB_CLIENT: pg
      DB_HOST: directus-postgres
      DB_PORT: 5432
      DB_DATABASE: directus
      DB_USER: directus
      DB_PASSWORD: ${POSTGRES_PASSWORD}
      # Redis for caching and rate limiting
      REDIS_HOST: directus-redis
      REDIS_PORT: 6379
      # Public URL
      PUBLIC_URL: https://cms.yourdomain.com
      # Cache settings
      CACHE_ENABLED: "true"
      CACHE_STORE: redis
      CACHE_AUTO_PURGE: "true"
      CACHE_TTL: "5m"
      # Rate limiting
      RATE_LIMITER_ENABLED: "true"
      RATE_LIMITER_STORE: redis
      RATE_LIMITER_POINTS: 50
      RATE_LIMITER_DURATION: 1
      # Email configuration
      EMAIL_FROM: directus@yourdomain.com
      EMAIL_TRANSPORT: smtp
      EMAIL_SMTP_HOST: smtp.gmail.com
      EMAIL_SMTP_PORT: 587
      EMAIL_SMTP_USER: ${SMTP_USER}
      EMAIL_SMTP_PASSWORD: ${SMTP_PASSWORD}
      EMAIL_SMTP_SECURE: "false"
    depends_on:
      directus-postgres:
        condition: service_healthy
      directus-redis:
        condition: service_healthy

  directus-postgres:
    image: postgres:16-alpine
    container_name: directus-postgres
    restart: unless-stopped
    volumes:
      - directus-postgres-data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: directus
      POSTGRES_USER: directus
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U directus"]
      interval: 10s
      timeout: 5s
      retries: 5

  directus-redis:
    image: redis:7-alpine
    container_name: directus-redis
    restart: unless-stopped
    volumes:
      - directus-redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  directus-uploads:
  directus-extensions:
  directus-postgres-data:
  directus-redis-data:
```

Create the environment file.

```bash
# .env - Directus secrets and credentials

# Generate with: openssl rand -hex 32
DIRECTUS_SECRET=your-random-64-char-secret

ADMIN_PASSWORD=your-secure-admin-password
POSTGRES_PASSWORD=your-secure-postgres-password
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password
```

Launch the stack.

```bash
# Start Directus and its dependencies
docker compose up -d

# Watch startup logs
docker compose logs -f directus
```

Navigate to `http://your-server-ip:8055` and log in with the admin credentials you configured.

## Connecting to an Existing Database

One of Directus's best features is connecting to databases that already contain data. Change the database environment variables to point to your existing database.

```yaml
environment:
  DB_CLIENT: pg
  DB_HOST: your-existing-db-host
  DB_PORT: 5432
  DB_DATABASE: your-existing-database
  DB_USER: your-db-user
  DB_PASSWORD: your-db-password
```

Directus will scan the database schema and automatically generate an admin interface for all existing tables. Foreign keys become relationship fields. Unique constraints become enforced validations. You get a full content management interface without changing a single table.

## Data Modeling

Create new collections (tables) through the admin interface or via the API.

In the admin panel:
1. Go to Settings > Data Model
2. Click "Create Collection"
3. Name your collection (e.g., "articles")
4. Add fields: title (String), slug (String), content (WYSIWYG), cover_image (Image), status (Dropdown), published_date (DateTime)

Each collection maps directly to a database table. The field configurations map to columns with appropriate constraints.

## REST API Usage

Directus generates a full REST API for all your collections.

```bash
# Authenticate and get an access token
TOKEN=$(curl -s -X POST http://localhost:8055/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@yourdomain.com", "password": "your-password"}' | jq -r '.data.access_token')

# List all articles
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8055/items/articles"

# Get a specific article with related fields
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8055/items/articles/1?fields=*,author.name,category.title"

# Create a new article
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Article",
    "slug": "new-article",
    "content": "<p>Article content here.</p>",
    "status": "published"
  }' \
  "http://localhost:8055/items/articles"

# Filter and sort articles
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8055/items/articles?filter[status][_eq]=published&sort=-published_date&limit=10"
```

## GraphQL API

Directus also provides a GraphQL endpoint at `/graphql`.

```graphql
# Query articles via GraphQL
query {
  articles(
    filter: { status: { _eq: "published" } }
    sort: ["-published_date"]
    limit: 10
  ) {
    id
    title
    slug
    content
    published_date
    author {
      first_name
      last_name
    }
  }
}
```

## Real-Time Updates with WebSocket

Directus supports WebSocket subscriptions for real-time data.

```javascript
// Subscribe to real-time changes on the articles collection
const ws = new WebSocket('wss://cms.yourdomain.com/websocket');

ws.onopen = () => {
    // Authenticate
    ws.send(JSON.stringify({
        type: 'auth',
        access_token: 'your-access-token'
    }));

    // Subscribe to article changes
    ws.send(JSON.stringify({
        type: 'subscribe',
        collection: 'articles',
        query: {
            fields: ['id', 'title', 'status']
        }
    }));
};

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('Change detected:', data);
};
```

## Flows (Automation)

Directus Flows let you build automation workflows triggered by data events, schedules, or webhooks. Configure them through the admin panel under Settings > Flows.

Common flow patterns:
- Send a Slack notification when a new article is published
- Resize uploaded images automatically
- Sync data to an external system when records change
- Send welcome emails when new users are created

## Roles and Permissions

Directus provides granular, field-level permissions. Create roles and assign specific CRUD permissions per collection and per field.

```bash
# Example: Create a read-only API role via the API
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Public API",
    "icon": "public",
    "description": "Read-only access for frontend applications"
  }' \
  "http://localhost:8055/roles"
```

Then configure permissions for that role in Settings > Roles & Permissions.

## Backup and Restore

```bash
# Backup the database
docker exec directus-postgres pg_dump -U directus directus > directus-db-$(date +%Y%m%d).sql

# Backup uploaded files
docker run --rm \
  -v directus-uploads:/source:ro \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/directus-uploads-$(date +%Y%m%d).tar.gz -C /source .

# Restore the database
docker exec -i directus-postgres psql -U directus directus < directus-db-20260208.sql
```

## Reverse Proxy with SSL

```yaml
# Traefik labels for Directus
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.directus.rule=Host(`cms.yourdomain.com`)"
  - "traefik.http.routers.directus.entrypoints=websecure"
  - "traefik.http.routers.directus.tls.certresolver=letsencrypt"
  - "traefik.http.services.directus.loadbalancer.server.port=8055"
```

## Summary

Directus in Docker provides a headless CMS that respects your database. By working directly with standard SQL tables, it avoids the data portability problems that plague many CMS platforms. The combination of automatic API generation, real-time WebSocket support, built-in automation flows, and granular permissions makes it a compelling choice for teams that want a flexible content backend. Monitor your Directus API response times and database performance with OneUptime to maintain a snappy content editing and delivery experience.
