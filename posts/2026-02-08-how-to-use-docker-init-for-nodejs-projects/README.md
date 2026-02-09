# How to Use docker init for Node.js Projects

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Init, Node.js, JavaScript, Containerization, DevOps, Express, Fastify

Description: A hands-on guide to using docker init with Node.js projects, covering Express, Fastify, and full-stack applications with optimized builds.

---

Containerizing a Node.js application involves a surprising number of decisions. Which base image? Alpine or Debian? How do you handle node_modules caching? Should you use npm ci or npm install? What about the .npmrc for private registries? The `docker init` command handles all of this by detecting your Node.js project and generating optimized Docker configuration.

This guide covers using docker init with different types of Node.js projects and customizing the output for real-world scenarios.

## Setting Up a Sample Project

Let's start with a typical Express application to demonstrate the workflow:

```bash
# Create and initialize a new project
mkdir node-docker-demo && cd node-docker-demo
npm init -y

# Install Express and a few common dependencies
npm install express cors helmet morgan
npm install --save-dev nodemon
```

Create a basic Express server:

```javascript
// src/server.js - A basic Express application with middleware
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const port = process.env.PORT || 3000;

// Security and logging middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', uptime: process.uptime() });
});

// Sample API route
app.get('/api/users', (req, res) => {
  res.json([
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
  ]);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
```

Add a start script to package.json:

```json
{
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js"
  }
}
```

## Running docker init

With the project in place, run docker init:

```bash
docker init
```

Docker init detects the package.json and identifies the project as Node.js. You will see prompts like:

```
? What application platform does your project use? Node
? What version of Node do you want to use? 20
? Which package manager do you want to use? npm
? What command do you want to use to start the app? npm start
? What port does your server listen on? 3000
```

Answer based on your project's requirements. The tool generates three files: Dockerfile, compose.yaml, and .dockerignore.

## Understanding the Generated Dockerfile

The generated Dockerfile uses a multi-stage build pattern that separates dependency installation from the final image:

```dockerfile
# syntax=docker/dockerfile:1

# Base stage with the chosen Node version
ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-alpine as base
WORKDIR /usr/src/app

# Dependencies stage - installs only production dependencies
FROM base as deps
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

# Final stage - copies dependencies and application code
FROM base as final
ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Copy dependencies from the deps stage
COPY --from=deps /usr/src/app/node_modules ./node_modules

# Copy the rest of the application
COPY . .

EXPOSE 3000
CMD ["npm", "start"]
```

This structure has three important advantages. First, the dependency installation is cached separately from your source code. If you change application code but not package.json, Docker skips the npm install entirely. Second, dev dependencies are excluded with `--omit=dev`, keeping the production image small. Third, the non-root user prevents container breakout attacks.

## Customizing for Different Package Managers

If you use yarn or pnpm instead of npm, docker init adapts accordingly. But you can also modify the generated Dockerfile manually.

### Yarn Configuration

```dockerfile
# Deps stage for Yarn
FROM base as deps
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=yarn.lock,target=yarn.lock \
    --mount=type=cache,target=/usr/local/share/.cache/yarn \
    yarn install --frozen-lockfile --production
```

### pnpm Configuration

```dockerfile
# Deps stage for pnpm
FROM base as deps
RUN corepack enable
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \
    --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod
```

## TypeScript Projects

TypeScript projects need a build step. Add a build stage to the generated Dockerfile:

```dockerfile
# syntax=docker/dockerfile:1

ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-alpine as base
WORKDIR /usr/src/app

# Install ALL dependencies (including devDependencies for TypeScript compiler)
FROM base as deps
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci

# Build stage - compile TypeScript to JavaScript
FROM deps as build
COPY . .
RUN npm run build

# Production dependencies only
FROM base as prod-deps
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

# Final stage - only compiled JavaScript and production dependencies
FROM base as final
ENV NODE_ENV=production
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
COPY --from=prod-deps /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

This four-stage build compiles TypeScript during the build but ships only the compiled JavaScript and production dependencies.

## Full-Stack Applications with Next.js

For Next.js applications, the generated Dockerfile needs adjustment to handle the build output correctly:

```dockerfile
# syntax=docker/dockerfile:1

ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-alpine as base
WORKDIR /app

# Install dependencies
FROM base as deps
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci

# Build the Next.js application
FROM deps as build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Production image
FROM base as final
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy only the standalone output and static files
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

USER appuser
EXPOSE 3000
CMD ["node", "server.js"]
```

Make sure your next.config.js enables standalone output:

```javascript
// next.config.js - Enable standalone output for Docker
module.exports = {
  output: 'standalone',
};
```

## Extending compose.yaml for Development

The generated compose.yaml works for production. For local development, add volume mounts and environment overrides:

```yaml
# compose.yaml - Extended for development
services:
  app:
    build:
      context: .
      target: base  # Use base stage, skip production optimizations
    ports:
      - "3000:3000"
    volumes:
      # Mount source code for live reload
      - ./src:/usr/src/app/src
      - ./package.json:/usr/src/app/package.json
      # Prevent overwriting container's node_modules
      - /usr/src/app/node_modules
    command: npx nodemon src/server.js
    environment:
      - NODE_ENV=development
      - PORT=3000

  # Add a database for development
  db:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: devpass
      POSTGRES_DB: myapp_dev
    volumes:
      - pgdata:/var/lib/postgresql/data

  # Add Redis for session storage or caching
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  pgdata:
```

## Optimizing the .dockerignore

The generated .dockerignore is a good start. Extend it for Node.js specifics:

```
# Dependencies (installed inside the container)
node_modules

# Build artifacts
dist
.next
build

# Development files
.env.local
.env.development
*.test.js
*.spec.js
__tests__
coverage

# IDE and OS files
.vscode
.idea
.DS_Store
*.swp

# Docker files (no need to copy these into the image)
Dockerfile
compose.yaml
.dockerignore

# Documentation
*.md
LICENSE
```

## Building and Testing

After docker init generates your files and you have made any customizations:

```bash
# Build the image
docker build -t my-node-app:latest .

# Run it standalone
docker run -p 3000:3000 my-node-app:latest

# Or use compose for the full development stack
docker compose up --build

# Test the health endpoint
curl http://localhost:3000/health
```

## Production Considerations

Before deploying the generated Dockerfile to production, review these points.

Add a health check to the Dockerfile:

```dockerfile
# Add after EXPOSE
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1
```

Set memory limits in your compose file:

```yaml
services:
  app:
    build: .
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
```

Docker init gives you 80% of a production-ready setup out of the box. The remaining 20% is project-specific customization that only you can decide. Start with what docker init generates, run it, and iterate from there.
