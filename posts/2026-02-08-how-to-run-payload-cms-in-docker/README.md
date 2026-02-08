# How to Run Payload CMS in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Payload CMS, Headless CMS, TypeScript, Docker Compose, Node.js, Self-Hosted, Next.js

Description: Deploy Payload CMS in Docker for a code-first, TypeScript-native headless CMS with a powerful admin panel and flexible APIs.

---

Payload CMS is a TypeScript-native headless CMS that takes a code-first approach to content management. Instead of defining your content models through a GUI (like Strapi or Directus), you define them in TypeScript configuration files. This gives you full type safety, version control for your schema, and the ability to customize every aspect of the CMS through code. Payload 3.0 is built on top of Next.js, which means the admin panel and your frontend can live in the same application.

Running Payload in Docker gives you a consistent, deployable package that works the same in development, staging, and production. This guide covers creating a Payload project, containerizing it, deploying with Docker Compose, and configuring it for production use.

## Why Payload CMS

Payload stands out for developers who want full control over their CMS. Here is what makes it different:

- Code-first configuration: define content types in TypeScript, not a GUI
- Full TypeScript support: auto-generated types for all your collections
- Built on Next.js (v3): admin panel and frontend share the same application
- Local API: query content directly in server-side code without HTTP overhead
- Powerful hooks: run custom logic before/after CRUD operations
- Access control: define granular permissions in code
- Supports MongoDB and PostgreSQL

## Prerequisites

Docker and Docker Compose installed. Node.js 18+ is needed for the initial project setup (not needed on the server if you build with Docker). Payload needs at least 1 GB of RAM.

```bash
# Verify Docker installation
docker --version
docker compose version
```

## Creating a Payload Project

Start by creating a new Payload project locally.

```bash
# Create a new Payload 3.0 project
npx create-payload-app@latest my-payload-app

# During setup, choose:
# - Template: blank or website
# - Database: PostgreSQL (recommended for production)
```

This creates a Next.js project with Payload pre-configured. The key configuration file is `payload.config.ts`.

## Defining Collections

Collections in Payload are defined in TypeScript. Here is an example of a blog with articles and authors.

```typescript
// src/collections/Articles.ts - Define the Articles collection
import type { CollectionConfig } from 'payload'

export const Articles: CollectionConfig = {
  slug: 'articles',
  // Enable admin panel features
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'publishedDate'],
  },
  // Access control
  access: {
    // Anyone can read published articles
    read: ({ req }) => {
      if (req.user) return true
      return { status: { equals: 'published' } }
    },
    // Only authenticated users can create/update/delete
    create: ({ req }) => !!req.user,
    update: ({ req }) => !!req.user,
    delete: ({ req }) => !!req.user,
  },
  // Field definitions with full TypeScript support
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'content',
      type: 'richText',
      required: true,
    },
    {
      name: 'coverImage',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'publishedDate',
      type: 'date',
      admin: {
        position: 'sidebar',
      },
    },
  ],
  // Hooks for custom logic
  hooks: {
    beforeChange: [
      ({ data, operation }) => {
        // Auto-set published date when status changes to published
        if (operation === 'update' && data.status === 'published' && !data.publishedDate) {
          data.publishedDate = new Date().toISOString()
        }
        return data
      },
    ],
  },
}
```

Register the collection in your Payload config.

```typescript
// payload.config.ts - Main Payload configuration
import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { Articles } from './src/collections/Articles'

export default buildConfig({
  // Database adapter
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
    },
  }),
  // Rich text editor
  editor: lexicalEditor(),
  // Collections
  collections: [Articles],
  // Secret for JWT signing
  secret: process.env.PAYLOAD_SECRET || '',
  // TypeScript output path
  typescript: {
    outputFile: 'src/payload-types.ts',
  },
})
```

## Dockerfile

Create a multi-stage Dockerfile for the Payload application.

```dockerfile
# Dockerfile - Multi-stage build for Payload CMS (Next.js based)

# Dependencies stage
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Builder stage
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from the deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables needed during build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the Next.js application (includes Payload admin panel)
RUN npm run build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 payload

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Set the correct permissions for the uploads directory
RUN mkdir -p /app/public/media && chown -R payload:nodejs /app/public/media

USER payload

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

Make sure your `next.config.mjs` has standalone output enabled.

```javascript
// next.config.mjs - Enable standalone output for Docker
import { withPayload } from '@payloadcms/next/withPayload'

const nextConfig = {
  output: 'standalone',
}

export default withPayload(nextConfig)
```

Add a `.dockerignore` file.

```
# .dockerignore
node_modules
.next
.git
*.md
.env.local
```

## Docker Compose Configuration

```yaml
# docker-compose.yml - Payload CMS with PostgreSQL
version: "3.8"

services:
  payload:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: payload
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      # Persist uploaded media files
      - payload-media:/app/public/media
    environment:
      NODE_ENV: production
      # PostgreSQL connection string
      DATABASE_URI: postgres://payload:${POSTGRES_PASSWORD}@payload-postgres:5432/payload
      # Secret for JWT token signing
      PAYLOAD_SECRET: ${PAYLOAD_SECRET}
      # Public server URL
      NEXT_PUBLIC_SERVER_URL: https://cms.yourdomain.com
    depends_on:
      payload-postgres:
        condition: service_healthy

  payload-postgres:
    image: postgres:16-alpine
    container_name: payload-postgres
    restart: unless-stopped
    volumes:
      - payload-postgres-data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: payload
      POSTGRES_USER: payload
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U payload"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  payload-media:
  payload-postgres-data:
```

Create the environment file.

```bash
# .env - Payload CMS credentials
POSTGRES_PASSWORD=your-secure-postgres-password
PAYLOAD_SECRET=your-random-payload-secret-at-least-32-chars
```

## Building and Running

```bash
# Build and start the stack
docker compose up -d --build

# Watch the startup logs
docker compose logs -f payload
```

Navigate to `http://your-server-ip:3000/admin` to create your admin account and start managing content.

## Using the REST API

Payload auto-generates REST endpoints for all collections.

```bash
# List all published articles
curl "http://localhost:3000/api/articles?where[status][equals]=published&sort=-publishedDate"

# Get a specific article
curl "http://localhost:3000/api/articles/article-id-here"

# Create a new article (requires authentication)
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: JWT your-jwt-token" \
  -d '{
    "title": "New Article",
    "slug": "new-article",
    "content": {"root": {"children": []}},
    "status": "draft"
  }' \
  "http://localhost:3000/api/articles"
```

## Using the Local API

One of Payload's most powerful features is the Local API. In server-side code (Next.js server components, API routes, or getServerSideProps), you can query content directly without HTTP requests.

```typescript
// app/articles/page.tsx - Fetch articles using the Local API
import { getPayload } from 'payload'
import config from '@payload-config'

export default async function ArticlesPage() {
  const payload = await getPayload({ config })

  // Query articles directly - no HTTP request needed
  const articles = await payload.find({
    collection: 'articles',
    where: {
      status: { equals: 'published' },
    },
    sort: '-publishedDate',
    limit: 10,
  })

  return (
    <div>
      {articles.docs.map((article) => (
        <article key={article.id}>
          <h2>{article.title}</h2>
        </article>
      ))}
    </div>
  )
}
```

## Hooks and Custom Logic

Payload hooks let you run code at every stage of the CRUD lifecycle.

```typescript
// Hooks example: send a notification when an article is published
hooks: {
  afterChange: [
    async ({ doc, previousDoc, operation }) => {
      // Only trigger when status changes to published
      if (
        operation === 'update' &&
        doc.status === 'published' &&
        previousDoc.status !== 'published'
      ) {
        // Send notification (e.g., via webhook to Slack or ntfy)
        await fetch('https://ntfy.yourdomain.com/content-updates', {
          method: 'POST',
          body: `New article published: ${doc.title}`,
        })
      }
    },
  ],
}
```

## Backup and Restore

```bash
# Backup PostgreSQL
docker exec payload-postgres pg_dump -U payload payload > payload-db-$(date +%Y%m%d).sql

# Backup media files
docker run --rm \
  -v payload-media:/source:ro \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/payload-media-$(date +%Y%m%d).tar.gz -C /source .
```

## Reverse Proxy Configuration

```yaml
# Traefik labels for Payload
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.payload.rule=Host(`cms.yourdomain.com`)"
  - "traefik.http.routers.payload.entrypoints=websecure"
  - "traefik.http.routers.payload.tls.certresolver=letsencrypt"
  - "traefik.http.services.payload.loadbalancer.server.port=3000"
```

## Summary

Payload CMS in Docker brings a developer-centric approach to content management. The code-first configuration means your content schema lives in version control alongside your application code. TypeScript types are generated automatically, eliminating the type mismatches that plague other CMS integrations. Building on Next.js means your admin panel and frontend share the same deployment, simplifying infrastructure. For production monitoring, integrate with OneUptime to track API response times, database performance, and application health to keep your content platform reliable.
