# How to Run Directus in Docker for API Generation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Directus, Headless CMS, REST API, GraphQL, PostgreSQL, Node.js, Containers, API

Description: Deploy Directus in Docker to get an instant REST and GraphQL API for any SQL database, complete with an admin dashboard and flexible content management.

---

Directus is an open-source data platform that wraps any SQL database with a real-time REST and GraphQL API. It also provides a sleek admin dashboard for managing content without writing code. Unlike traditional CMS platforms that impose their own data model, Directus works with your existing database schema. Point it at a PostgreSQL, MySQL, or SQLite database, and it generates a full API with authentication, permissions, file management, and webhooks.

Running Directus in Docker is the fastest path to a working setup. You get a complete data platform with a single `docker compose up` command.

## Prerequisites

Make sure you have:

- Docker Engine 20.10+
- Docker Compose v2
- At least 1GB of RAM allocated to Docker

```bash
# Confirm Docker is installed and running
docker --version
docker compose version
```

## Quick Start with a Single Command

You can spin up Directus with SQLite for a quick test.

```bash
# Run Directus with SQLite - fastest way to try it out
docker run -d \
  --name directus \
  -p 8055:8055 \
  -e SECRET="change-this-to-a-random-string" \
  -e ADMIN_EMAIL="admin@example.com" \
  -e ADMIN_PASSWORD="admin123" \
  -e DB_CLIENT="sqlite3" \
  -e DB_FILENAME="/directus/database/data.db" \
  -v directus-data:/directus/database \
  -v directus-uploads:/directus/uploads \
  directus/directus:10
```

Open `http://localhost:8055` and log in with the admin credentials.

## Production Docker Compose Setup

For anything beyond testing, use PostgreSQL as the database backend. Here is a complete Docker Compose configuration.

```yaml
# docker-compose.yml - Directus with PostgreSQL and Redis
version: "3.8"

services:
  # Directus - the main application
  directus:
    image: directus/directus:10
    ports:
      - "8055:8055"
    volumes:
      - directus-uploads:/directus/uploads
      - directus-extensions:/directus/extensions
    environment:
      # Security key used for signing tokens
      SECRET: "a-long-random-string-change-in-production"

      # Admin account created on first startup
      ADMIN_EMAIL: "admin@example.com"
      ADMIN_PASSWORD: "admin_password_123"

      # PostgreSQL connection settings
      DB_CLIENT: "pg"
      DB_HOST: "postgres"
      DB_PORT: "5432"
      DB_DATABASE: "directus"
      DB_USER: "directus"
      DB_PASSWORD: "directus_pass"

      # Redis for caching and real-time messaging
      CACHE_ENABLED: "true"
      CACHE_STORE: "redis"
      REDIS: "redis://redis:6379"

      # WebSocket support for real-time updates
      WEBSOCKETS_ENABLED: "true"

      # File storage settings
      STORAGE_LOCATIONS: "local"
      STORAGE_LOCAL_ROOT: "/directus/uploads"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    networks:
      - directus-network

  # PostgreSQL - stores all content and configuration
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: directus
      POSTGRES_USER: directus
      POSTGRES_PASSWORD: directus_pass
    volumes:
      - postgres-data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U directus"]
      interval: 5s
      timeout: 5s
      retries: 10
    networks:
      - directus-network

  # Redis - handles caching and real-time events
  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data
    networks:
      - directus-network

volumes:
  directus-uploads:
  directus-extensions:
  postgres-data:
  redis-data:

networks:
  directus-network:
    driver: bridge
```

## Starting the Stack

```bash
# Start all services
docker compose up -d

# Watch the Directus startup logs
docker compose logs -f directus

# Verify everything is healthy
docker compose ps
```

Directus takes about 15-30 seconds on first startup as it runs database migrations. Once you see "Server started at http://0.0.0.0:8055", it is ready.

## Accessing the Admin Dashboard

Open `http://localhost:8055` in your browser and log in with:

- Email: admin@example.com
- Password: admin_password_123

The dashboard lets you create collections (tables), define fields, manage content, configure permissions, and set up workflows, all without touching code.

## Creating Collections

Collections in Directus correspond to database tables. You can create them through the UI or the API.

```bash
# Create a new collection called "articles" via the API
curl -X POST http://localhost:8055/collections \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "collection": "articles",
    "fields": [
      {
        "field": "id",
        "type": "integer",
        "meta": {"hidden": true, "interface": "input", "readonly": true},
        "schema": {"is_primary_key": true, "has_auto_increment": true}
      },
      {
        "field": "title",
        "type": "string",
        "meta": {"interface": "input"},
        "schema": {"is_nullable": false}
      },
      {
        "field": "content",
        "type": "text",
        "meta": {"interface": "input-rich-text-html"}
      },
      {
        "field": "status",
        "type": "string",
        "meta": {"interface": "select-dropdown", "options": {"choices": [{"text": "Draft", "value": "draft"}, {"text": "Published", "value": "published"}]}},
        "schema": {"default_value": "draft"}
      }
    ]
  }'
```

## Using the REST API

Directus generates REST endpoints for every collection automatically.

```bash
# List all articles
curl http://localhost:8055/items/articles \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get a single article by ID
curl http://localhost:8055/items/articles/1 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create a new article
curl -X POST http://localhost:8055/items/articles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Getting Started with Directus",
    "content": "<p>This is my first article managed through Directus.</p>",
    "status": "published"
  }'

# Update an article
curl -X PATCH http://localhost:8055/items/articles/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"status": "published"}'

# Delete an article
curl -X DELETE http://localhost:8055/items/articles/1 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Filter and sort articles
curl "http://localhost:8055/items/articles?filter[status][_eq]=published&sort=-date_created&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Using the GraphQL API

Directus also exposes a GraphQL endpoint at `/graphql`.

```bash
# Query articles through GraphQL
curl -X POST http://localhost:8055/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "query": "{ articles { id title content status } }"
  }'
```

## File Upload and Management

Directus handles file uploads with built-in image transformation.

```bash
# Upload a file
curl -X POST http://localhost:8055/files \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/image.jpg" \
  -F "title=My Image"

# Access the file with transformations (resize, crop, format)
# http://localhost:8055/assets/FILE_ID?width=300&height=200&fit=cover
```

## Setting Up Roles and Permissions

Directus has a granular permissions system. Create roles with specific access levels.

```bash
# Create a read-only "viewer" role
curl -X POST http://localhost:8055/roles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Viewer",
    "icon": "visibility"
  }'

# Set permissions for the role on the articles collection
curl -X POST http://localhost:8055/permissions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "role": "ROLE_ID_HERE",
    "collection": "articles",
    "action": "read",
    "fields": ["*"]
  }'
```

## Real-Time Updates with WebSockets

With WebSockets enabled, clients can subscribe to changes.

```javascript
// Connect to Directus WebSocket for real-time updates
const ws = new WebSocket("ws://localhost:8055/websocket");

ws.onopen = () => {
  // Authenticate the WebSocket connection
  ws.send(JSON.stringify({
    type: "auth",
    access_token: "YOUR_TOKEN"
  }));

  // Subscribe to changes on the articles collection
  ws.send(JSON.stringify({
    type: "subscribe",
    collection: "articles"
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("Change received:", data);
};
```

## Backup and Restore

```bash
# Back up the PostgreSQL database
docker compose exec postgres pg_dump -U directus directus > directus_backup.sql

# Back up uploaded files
docker compose cp directus:/directus/uploads ./uploads-backup

# Restore the database
cat directus_backup.sql | docker compose exec -T postgres psql -U directus directus
```

## Stopping and Cleaning Up

```bash
# Stop all containers
docker compose stop

# Remove containers and networks
docker compose down

# Remove everything including data
docker compose down -v
```

## Summary

Directus gives you an instant, production-ready API for any SQL database. Running it in Docker with PostgreSQL and Redis provides a robust foundation for content management, headless CMS use cases, and custom application backends. The admin dashboard lets non-technical users manage data, while the REST and GraphQL APIs give developers full programmatic access. It is a versatile tool that bridges the gap between traditional CMS platforms and custom-built APIs.
