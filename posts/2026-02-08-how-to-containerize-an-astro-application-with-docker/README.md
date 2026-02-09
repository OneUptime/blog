# How to Containerize an Astro Application with Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, astro, containerization, node.js, static site, SSR, multi-stage builds

Description: Build Docker images for Astro applications covering both static output and SSR server modes

---

Astro supports two deployment models: static site generation (the default) and server-side rendering (SSR). Each requires a different Docker approach. Static output can be served with Nginx or Caddy for best performance, while SSR mode needs a Node.js runtime. This guide covers both scenarios with optimized Dockerfiles.

## Static Output: Astro + Nginx

By default, Astro generates a static site. The build output is plain HTML, CSS, and JavaScript files that any web server can serve.

```javascript
// astro.config.mjs - Static output (default)
import { defineConfig } from 'astro/config';

export default defineConfig({
  // output: 'static' is the default, no need to specify
});
```

```dockerfile
# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build the static site
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build Astro (produces dist/ directory with static files)
RUN npm run build

# Stage 3: Serve with Nginx
FROM nginx:alpine AS runner

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built static files
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

# Nginx runs as its own process, no CMD needed (uses default)
```

The Nginx configuration for an Astro static site:

```nginx
# nginx.conf - Optimized for Astro static output
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Enable gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 256;

    # Cache static assets aggressively
    location /_astro/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Cache other static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # Handle client-side routing (SPA fallback)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
}
```

```bash
docker build -t astro-static .
docker images astro-static --format "{{.Size}}"
# ~30-50MB (Nginx Alpine + static files)
```

This produces an extremely small image. Nginx serves static files faster than Node.js and uses less memory.

## SSR Output: Astro + Node.js

For server-side rendering, Astro needs the Node.js adapter:

```bash
npm install @astrojs/node
```

```javascript
// astro.config.mjs - SSR with Node.js adapter
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  output: 'server',    // Enable SSR
  adapter: node({
    mode: 'standalone', // Self-contained Node.js server
  }),
});
```

The SSR Dockerfile:

```dockerfile
# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build the Astro SSR application
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
RUN npm run build

# Stage 3: Production runtime
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321

RUN addgroup --system astro && adduser --system astro --ingroup astro

# Copy the built SSR server
COPY --from=builder --chown=astro:astro /app/dist ./dist

# Copy node_modules if the adapter needs runtime dependencies
COPY --from=deps --chown=astro:astro /app/node_modules ./node_modules
COPY --chown=astro:astro package.json .

USER astro
EXPOSE 4321

# Start the standalone Astro server
CMD ["node", "dist/server/entry.mjs"]
```

## Hybrid Mode

Astro's hybrid mode pre-renders most pages while allowing specific routes to use SSR:

```javascript
// astro.config.mjs - Hybrid rendering
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  output: 'hybrid',   // Static by default, SSR where opted in
  adapter: node({
    mode: 'standalone',
  }),
});
```

```astro
---
// src/pages/dashboard.astro - Opt this page into SSR
export const prerender = false;  // This page renders on each request
---

<html>
  <body>
    <h1>Dashboard</h1>
    <p>Server time: {new Date().toISOString()}</p>
  </body>
</html>
```

The Docker setup for hybrid mode is identical to the SSR Dockerfile since the Node.js server handles both static and dynamic pages.

## The .dockerignore File

```
# .dockerignore
node_modules
dist
.astro
.git
.gitignore
*.md
.env
.env.*
.vscode
.idea
coverage
tests
e2e
docker-compose*.yml
Dockerfile*
.dockerignore
```

## Environment Variables

Astro accesses environment variables through `import.meta.env`:

```astro
---
// Server-side: all env vars are available
const dbUrl = import.meta.env.DATABASE_URL;
const apiKey = import.meta.env.SECRET_API_KEY;

// Client-side: only PUBLIC_ prefixed vars
// import.meta.env.PUBLIC_API_URL
---
```

For SSR, runtime environment variables work with `process.env`:

```typescript
// src/pages/api/data.ts - Server endpoint
export async function GET() {
  const apiUrl = process.env.API_URL;  // Available at runtime
  const response = await fetch(apiUrl);
  return new Response(JSON.stringify(await response.json()));
}
```

```bash
# Pass runtime environment variables
docker run -d \
  -e DATABASE_URL="postgresql://user:pass@db:5432/mydb" \
  -e API_URL="https://external-api.com" \
  -e PUBLIC_SITE_URL="https://mysite.com" \
  -p 4321:4321 \
  myapp
```

For static builds, environment variables must be available at build time:

```dockerfile
FROM node:20-alpine AS builder
ARG PUBLIC_SITE_URL
ARG PUBLIC_ANALYTICS_ID
ENV PUBLIC_SITE_URL=$PUBLIC_SITE_URL
ENV PUBLIC_ANALYTICS_ID=$PUBLIC_ANALYTICS_ID
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
```

## Docker Compose

```yaml
# docker-compose.yml - Astro SSR with database
services:
  app:
    build:
      context: .
    ports:
      - "4321:4321"
    environment:
      - DATABASE_URL=postgresql://postgres:devpass@db:5432/astro_dev
      - HOST=0.0.0.0
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: devpass
      POSTGRES_DB: astro_dev
    healthcheck:
      test: ["CMD-SHELL", "pg_isready"]
      interval: 2s
      retries: 5
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

## Development Setup

```yaml
# docker-compose.dev.yml
services:
  app:
    build:
      context: .
      target: deps
    command: npx astro dev --host 0.0.0.0
    ports:
      - "4321:4321"
    volumes:
      - ./src:/app/src
      - ./public:/app/public
      - ./astro.config.mjs:/app/astro.config.mjs
      - /app/node_modules
    environment:
      - DATABASE_URL=postgresql://postgres:devpass@db:5432/astro_dev
```

## Health Check

```typescript
// src/pages/api/health.ts - Health endpoint for SSR mode
export async function GET() {
  return new Response(
    JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}
```

```dockerfile
# For SSR mode
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4321/api/health || exit 1

# For static mode with Nginx
HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1
```

## Image Size Comparison

| Mode | Image Size |
|---|---|
| Static + Nginx Alpine | 30-50 MB |
| SSR + Node.js Alpine | 140-180 MB |
| Hybrid + Node.js Alpine | 140-180 MB |

Astro's static output paired with Nginx produces one of the smallest possible Docker images for a web application. If your site does not need server-side rendering, choose the static approach. The image is tiny, serves lightning fast, and has virtually no attack surface beyond Nginx itself. For dynamic content, the SSR Dockerfile with Node.js Alpine stays under 200MB, which is competitive with other Node.js frameworks.
