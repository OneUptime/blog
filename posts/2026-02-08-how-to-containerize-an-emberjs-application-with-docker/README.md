# How to Containerize an Ember.js Application with Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Ember.js, Containerization, Frontend, DevOps, Nginx

Description: Complete guide to containerizing Ember.js applications with Docker using multi-stage builds and production Nginx configuration

---

Ember.js is an opinionated framework that provides strong conventions for building ambitious web applications. Its built-in build system, Ember CLI, produces optimized static assets ready for deployment. Docker fits naturally into this workflow, giving you reproducible builds and consistent runtime environments. This guide takes you through every step of containerizing an Ember.js application, from the initial Dockerfile to production-grade deployment configuration.

## Prerequisites

Make sure you have these tools available:

- Node.js 18+ and npm
- Docker Engine 20.10+
- Ember CLI (`npm install -g ember-cli`)

## Setting Up an Ember.js Project

If you already have an Ember.js application, skip to the Dockerfile section. Otherwise, create a fresh project.

Scaffold a new Ember.js application:

```bash
# Create a new Ember.js application
ember new my-ember-app --lang en
cd my-ember-app
```

Verify the build works:

```bash
# Run the production build
ember build --environment=production
```

The output appears in the `dist/` directory. Like other single-page application frameworks, Ember.js compiles to static HTML, CSS, and JavaScript files.

## Why Multi-Stage Builds Matter

Ember.js builds require Node.js, npm, and all your project dependencies. That can easily add up to 500MB or more. Your production container only needs the compiled static files and a web server. A multi-stage build lets you use a heavy Node.js image for building and a lightweight Nginx image for serving.

## The Production Dockerfile

Create a `Dockerfile` in the project root.

Stage one installs dependencies and builds the Ember.js application:

```dockerfile
# Stage 1: Build the Ember.js app
FROM node:20-alpine AS build

WORKDIR /app

# Copy dependency files for layer caching
COPY package.json package-lock.json ./

# Install all dependencies
RUN npm ci

# Copy the entire source tree
COPY . .

# Build for production
RUN npx ember build --environment=production
```

Stage two copies the compiled output to Nginx:

```dockerfile
# Stage 2: Serve with Nginx
FROM nginx:1.25-alpine

# Clean default content
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Add custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

## Nginx Configuration

Ember.js uses the Ember Router for client-side routing. By default, it operates in hash mode, but most production apps use the `history` location type. Nginx must handle this correctly.

This config routes unknown paths back to index.html:

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Serve static files directly, fall back to index.html for Ember routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Long cache for fingerprinted assets (Ember CLI adds fingerprints by default)
    location ~* ^/assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Never cache index.html
    location = /index.html {
        expires -1;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }
}
```

## The .dockerignore File

Ember projects can have large `node_modules` and `tmp` directories. Exclude them from the Docker build context.

This .dockerignore keeps the build context minimal:

```
node_modules
dist
tmp
.git
.gitignore
.vscode
*.md
.ember-cli
.env*
```

## Building and Running

Build the Docker image:

```bash
# Build the image
docker build -t my-ember-app:latest .
```

Run the container:

```bash
# Run in detached mode, mapping port 8080 to the container's port 80
docker run -d -p 8080:80 --name ember-app my-ember-app:latest
```

Visit `http://localhost:8080`. Your Ember.js application should render correctly.

## Docker Compose Configuration

A Compose file makes it easier to manage the container lifecycle.

This Compose file defines the Ember.js service:

```yaml
version: "3.8"

services:
  ember-app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8080:80"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:80"]
      interval: 30s
      timeout: 5s
      retries: 3
```

Start and rebuild with:

```bash
docker compose up -d --build
```

## Development Workflow

For day-to-day development, you want Ember CLI's live reload rather than rebuilding a Docker image.

Create a `Dockerfile.dev` for local development:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 4200
EXPOSE 7020

# Run Ember's dev server with live reload, binding to all interfaces
CMD ["npx", "ember", "serve", "--host", "0.0.0.0"]
```

And a development Compose file:

```yaml
version: "3.8"

services:
  ember-dev:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "4200:4200"
      - "7020:7020"
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      # Disable Ember CLI's update checker inside the container
      - EMBER_CLI_UPDATE_CHECK=false
```

Port 7020 is the default live reload port. Make sure it is exposed so your browser can pick up file changes.

## Environment Configuration

Ember.js uses `config/environment.js` for build-time configuration. You can inject values through Docker build arguments.

This modified build stage accepts a custom API host:

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app

ARG API_HOST=http://localhost:3000

COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# Pass the API host as an environment variable that the Ember build can read
ENV API_HOST=$API_HOST

RUN npx ember build --environment=production
```

In `config/environment.js`, read from `process.env`:

```javascript
// config/environment.js
module.exports = function (environment) {
  const ENV = {
    // Use the API_HOST env variable or fall back to a default
    apiHost: process.env.API_HOST || 'http://localhost:3000',
    // ... other configuration
  };

  return ENV;
};
```

Build with the custom value:

```bash
docker build --build-arg API_HOST=https://api.production.com -t my-ember-app:prod .
```

## Handling Ember Addons with Native Dependencies

Some Ember addons depend on native Node.js modules that require compilation. If your build fails with errors about missing libraries, install the necessary build tools in the build stage.

Add build dependencies to the Node.js image:

```dockerfile
FROM node:20-alpine AS build

# Install build tools for native module compilation
RUN apk add --no-cache python3 make g++

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx ember build --environment=production
```

This adds roughly 100MB to the build stage, but it does not affect the final production image because only the `dist` directory gets copied.

## Testing Before Deployment

Run your test suite inside Docker to catch issues early.

Execute tests in a one-off container:

```bash
# Run the Ember test suite inside a container
docker run --rm my-ember-app:build npx ember test
```

Alternatively, add a test stage to your Dockerfile:

```dockerfile
# Optional test stage
FROM build AS test
RUN npx ember test
```

If tests fail, the Docker build fails, preventing broken code from reaching the production image.

## Optimizing Build Speed

Ember.js builds can be slow, especially with many addons. Speed things up with these techniques:

- Layer caching: Copy `package.json` and `package-lock.json` before copying source files. Dependencies only reinstall when the lock file changes.
- Use BuildKit: Set `DOCKER_BUILDKIT=1` for parallel stage execution and better caching.
- Prune devDependencies: Not applicable here since they are needed for the build, but keep your dependency list tidy.

Enable BuildKit for faster builds:

```bash
DOCKER_BUILDKIT=1 docker build -t my-ember-app:latest .
```

## Conclusion

Ember.js applications fit the multi-stage Docker build pattern well. The framework's convention-over-configuration philosophy extends to deployment: build once with Ember CLI, serve the static output with Nginx. Adding proper Nginx configuration for client-side routing, a focused .dockerignore file, and sensible caching headers gives you a production-ready container. Pair this with a development-specific Compose setup, and your team gets consistent environments from local development all the way to production.
