# How to Run Strapi CMS in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Strapi, Headless CMS, API, Docker Compose, Node.js, Self-Hosted, Content Management

Description: Deploy Strapi headless CMS in Docker to build customizable content APIs with an intuitive admin panel and flexible data modeling.

---

Strapi is the leading open-source headless CMS built on Node.js. It provides an admin panel for content editors, a flexible content-type builder for defining your data models, and automatically generated REST and GraphQL APIs for your frontend applications. Unlike traditional CMS platforms that couple content management with presentation, Strapi focuses exclusively on the backend. Your frontend, whether React, Next.js, Vue, or a mobile app, consumes the API and handles rendering.

Running Strapi in Docker makes the development-to-production workflow consistent and eliminates environment-specific issues. This guide covers building a Docker image for Strapi, deploying it with Docker Compose, connecting it to PostgreSQL, and configuring it for production use.

## When to Use Strapi

Strapi fits well when you need:

- A content API for a JavaScript frontend (Next.js, Nuxt, Gatsby, etc.)
- Non-technical content editors who need a visual admin panel
- Custom content types defined through a UI, not code
- Both REST and GraphQL endpoints from the same data
- Fine-grained role-based access control for your API
- Webhooks that trigger builds when content changes

## Prerequisites

Docker and Docker Compose are required. Strapi needs at least 1 GB of RAM for development and 2 GB or more for production.

```bash
# Verify Docker installation
docker --version
docker compose version
```

## Creating the Strapi Project

First, create a new Strapi project locally that you will then Dockerize.

```bash
# Create a new Strapi project with PostgreSQL as the database
npx create-strapi-app@latest my-strapi-project --quickstart --no-run

# Or with specific database configuration
npx create-strapi-app@latest my-strapi-project \
  --dbclient=postgres \
  --dbhost=127.0.0.1 \
  --dbport=5432 \
  --dbname=strapi \
  --dbusername=strapi \
  --dbpassword=strapi \
  --no-run
```

## Dockerfile for Strapi

Create a Dockerfile in your Strapi project root.

```dockerfile
# Dockerfile - Multi-stage build for Strapi CMS

# Build stage: install dependencies and build the admin panel
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better Docker cache utilization
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application
COPY . .

# Build the Strapi admin panel
RUN npm run build

# Production stage: smaller final image
FROM node:20-alpine AS production

WORKDIR /app

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Copy built application from the builder stage
COPY --from=builder /app/build ./build
COPY --from=builder /app/config ./config
COPY --from=builder /app/database ./database
COPY --from=builder /app/public ./public
COPY --from=builder /app/src ./src
COPY --from=builder /app/.env.example ./.env.example
COPY --from=builder /app/favicon.png ./favicon.png

# Expose the Strapi port
EXPOSE 1337

# Start Strapi in production mode
CMD ["npm", "run", "start"]
```

Add a `.dockerignore` to keep the image clean.

```
# .dockerignore - Exclude unnecessary files from the Docker build
node_modules
.tmp
.cache
build
.git
.env
*.md
.editorconfig
```

## Docker Compose Configuration

```yaml
# docker-compose.yml - Strapi CMS with PostgreSQL
version: "3.8"

services:
  strapi:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: strapi
    restart: unless-stopped
    ports:
      - "1337:1337"
    volumes:
      # Persist uploaded media files
      - strapi-uploads:/app/public/uploads
    environment:
      NODE_ENV: production
      # Database configuration
      DATABASE_CLIENT: postgres
      DATABASE_HOST: strapi-postgres
      DATABASE_PORT: 5432
      DATABASE_NAME: strapi
      DATABASE_USERNAME: strapi
      DATABASE_PASSWORD: ${POSTGRES_PASSWORD}
      DATABASE_SSL: "false"
      # Secret keys for authentication and encryption
      APP_KEYS: ${APP_KEYS}
      API_TOKEN_SALT: ${API_TOKEN_SALT}
      ADMIN_JWT_SECRET: ${ADMIN_JWT_SECRET}
      TRANSFER_TOKEN_SALT: ${TRANSFER_TOKEN_SALT}
      JWT_SECRET: ${JWT_SECRET}
      # Public URL
      PUBLIC_URL: https://cms.yourdomain.com
    depends_on:
      strapi-postgres:
        condition: service_healthy

  strapi-postgres:
    image: postgres:16-alpine
    container_name: strapi-postgres
    restart: unless-stopped
    volumes:
      - strapi-postgres-data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: strapi
      POSTGRES_USER: strapi
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U strapi"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  strapi-uploads:
  strapi-postgres-data:
```

Create the environment file with all required secrets.

```bash
# .env - Strapi secrets and database credentials
POSTGRES_PASSWORD=your-secure-postgres-password

# Generate these with: openssl rand -base64 32
APP_KEYS=key1,key2,key3,key4
API_TOKEN_SALT=your-api-token-salt
ADMIN_JWT_SECRET=your-admin-jwt-secret
TRANSFER_TOKEN_SALT=your-transfer-token-salt
JWT_SECRET=your-jwt-secret
```

Generate all the secrets.

```bash
# Generate each secret
echo "APP_KEYS=$(openssl rand -base64 32),$(openssl rand -base64 32),$(openssl rand -base64 32),$(openssl rand -base64 32)"
echo "API_TOKEN_SALT=$(openssl rand -base64 32)"
echo "ADMIN_JWT_SECRET=$(openssl rand -base64 32)"
echo "TRANSFER_TOKEN_SALT=$(openssl rand -base64 32)"
echo "JWT_SECRET=$(openssl rand -base64 32)"
```

## Database Configuration

Update the Strapi database configuration to read from environment variables.

```javascript
// config/database.js - Database configuration using environment variables
module.exports = ({ env }) => ({
  connection: {
    client: env('DATABASE_CLIENT', 'postgres'),
    connection: {
      host: env('DATABASE_HOST', '127.0.0.1'),
      port: env.int('DATABASE_PORT', 5432),
      database: env('DATABASE_NAME', 'strapi'),
      user: env('DATABASE_USERNAME', 'strapi'),
      password: env('DATABASE_PASSWORD', ''),
      ssl: env.bool('DATABASE_SSL', false),
    },
    pool: {
      min: 2,
      max: 10,
    },
  },
});
```

## Building and Running

```bash
# Build the Docker image
docker compose build

# Start the stack
docker compose up -d

# Watch the logs
docker compose logs -f strapi
```

The first startup takes a minute while Strapi runs database migrations. Navigate to `https://cms.yourdomain.com/admin` to create your admin account.

## Defining Content Types

Strapi's Content-Type Builder lets you define your data models visually through the admin panel. For example, to create a blog:

1. Go to Content-Type Builder
2. Click "Create new collection type"
3. Name it "Article"
4. Add fields: Title (Text), Slug (UID), Content (Rich Text), Cover Image (Media), Published Date (Date), Author (Relation to Users)
5. Save and restart

Strapi generates REST and GraphQL endpoints automatically.

```bash
# REST API - List all articles
curl http://localhost:1337/api/articles

# REST API - Get a specific article with related data
curl "http://localhost:1337/api/articles/1?populate=*"

# REST API - Filter articles
curl "http://localhost:1337/api/articles?filters[published][\$eq]=true&sort=publishedDate:desc"
```

## API Authentication

Strapi supports API tokens for machine-to-machine access and JWT authentication for user-facing applications.

```bash
# Create a full-access API token via the admin panel
# Settings > API Tokens > Create new API Token

# Use the token in requests
curl -H "Authorization: Bearer your-api-token" \
  http://localhost:1337/api/articles
```

For user authentication:

```bash
# Register a new user
curl -X POST http://localhost:1337/api/auth/local/register \
  -H "Content-Type: application/json" \
  -d '{"username": "user1", "email": "user@example.com", "password": "Password123"}'

# Login and get a JWT
curl -X POST http://localhost:1337/api/auth/local \
  -H "Content-Type: application/json" \
  -d '{"identifier": "user@example.com", "password": "Password123"}'
```

## Webhooks for Build Triggers

Configure webhooks to trigger frontend rebuilds when content changes.

1. Go to Settings > Webhooks
2. Add a new webhook URL (e.g., your Vercel or Netlify deploy hook)
3. Select which events should trigger it (create, update, delete)

This creates a smooth content workflow: editors publish in Strapi, a webhook fires, and the frontend rebuilds with fresh content.

## Backup and Restore

```bash
# Backup the PostgreSQL database
docker exec strapi-postgres pg_dump -U strapi strapi > strapi-db-$(date +%Y%m%d).sql

# Backup uploaded files
docker run --rm \
  -v strapi-uploads:/source:ro \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/strapi-uploads-$(date +%Y%m%d).tar.gz -C /source .
```

## Reverse Proxy Configuration

```yaml
# Traefik labels for Strapi
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.strapi.rule=Host(`cms.yourdomain.com`)"
  - "traefik.http.routers.strapi.entrypoints=websecure"
  - "traefik.http.routers.strapi.tls.certresolver=letsencrypt"
  - "traefik.http.services.strapi.loadbalancer.server.port=1337"
```

## Summary

Strapi in Docker provides a powerful, customizable headless CMS that generates APIs automatically from your content models. The Docker deployment ensures consistency between development and production, and the PostgreSQL backend handles production workloads reliably. The combination of a visual admin panel for content editors and auto-generated REST/GraphQL APIs for developers makes Strapi a versatile choice for modern web applications. Monitor your Strapi API response times and database health with OneUptime to keep the content delivery pipeline running smoothly.
