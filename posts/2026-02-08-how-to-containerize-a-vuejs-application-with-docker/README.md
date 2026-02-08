# How to Containerize a Vue.js Application with Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Vue.js, Containerization, Frontend, DevOps, Nginx, Vite

Description: Learn how to containerize a Vue.js application using Docker with multi-stage builds, Nginx, and Vite-powered development workflows

---

Vue.js has earned its place as a go-to framework for building reactive user interfaces. Whether you are working on a small side project or a large enterprise application, Docker helps you package your Vue.js app into a portable container that runs the same way everywhere. This guide covers the entire process, from writing a production-ready Dockerfile to setting up development workflows with hot reload.

## Prerequisites

You will need these tools installed:

- Node.js 18+ and npm (or yarn/pnpm)
- Docker Engine 20.10+
- Basic familiarity with Vue.js and the terminal

## Scaffolding a Vue.js Project

Modern Vue.js projects use Vite as the build tool. If you already have a project, skip this step.

Create a new Vue.js project with Vite:

```bash
# Scaffold a new Vue project using the official create-vue tool
npm create vue@latest my-vue-app
cd my-vue-app
npm install
```

Confirm the app builds successfully:

```bash
npm run build
```

The output lands in the `dist` directory. These are plain static files that any web server can serve.

## Project Structure Overview

A typical Vue.js project after scaffolding looks like this:

```
my-vue-app/
  src/
    components/
    views/
    App.vue
    main.ts
  public/
  dist/           # Generated after build
  package.json
  vite.config.ts
  index.html
```

The key insight for containerization is that Vue.js produces static HTML, CSS, and JavaScript after the build step. You do not need Node.js in production. All you need is a web server.

## Writing the Production Dockerfile

The multi-stage build approach works perfectly here. Stage one builds the app with Node.js. Stage two serves the output with Nginx.

This Dockerfile handles the full build-to-serve pipeline:

```dockerfile
# Stage 1: Build the Vue.js application
FROM node:20-alpine AS build

WORKDIR /app

# Copy dependency manifests first for better layer caching
COPY package.json package-lock.json ./

# Install all dependencies including devDependencies needed for the build
RUN npm ci

# Copy source files
COPY . .

# Run the production build
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:1.25-alpine

# Remove default Nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

## Nginx Configuration for Vue Router

If you are using Vue Router in history mode, the browser sends actual HTTP requests for routes like `/about` or `/users/42`. Nginx needs to route all of these back to `index.html`.

This Nginx config handles history mode routing and static asset caching:

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Route all requests to index.html for Vue Router history mode
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache hashed assets (Vite adds content hashes to filenames)
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Prevent caching of index.html
    location = /index.html {
        expires -1;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }

    # Enable gzip compression for text-based responses
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 256;
}
```

## The .dockerignore File

Keep your build context lean. A bloated context means slower builds.

This file excludes everything Docker does not need:

```
node_modules
dist
.git
.gitignore
.vscode
*.md
.env.local
.env.*.local
```

## Building and Running

Build the Docker image:

```bash
# Build the production image
docker build -t my-vue-app:latest .
```

Run the container:

```bash
# Start the container, mapping host port 8080 to container port 80
docker run -d -p 8080:80 --name vue-app my-vue-app:latest
```

Visit `http://localhost:8080` in your browser. Your Vue.js application is now running inside a Docker container.

## Docker Compose Setup

Docker Compose simplifies running and rebuilding the container.

This Compose file adds restart policies and a health check:

```yaml
version: "3.8"

services:
  vue-app:
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

Run it:

```bash
docker compose up -d --build
```

## Development Workflow

Rebuilding the Docker image on every code change is painfully slow. For development, mount your source directory as a volume and run the Vite dev server directly.

This development Dockerfile runs Vite with HMR enabled:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 5173

# Start Vite dev server, binding to all interfaces so Docker can expose it
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

Pair it with a development Compose file:

```yaml
version: "3.8"

services:
  vue-dev:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "5173:5173"
    volumes:
      # Bind mount source for hot module replacement
      - .:/app
      # Anonymous volume to preserve container's node_modules
      - /app/node_modules
```

Now `docker compose -f docker-compose.dev.yml up` gives you a containerized development environment with live reload.

## Handling Environment Variables

Vue.js (with Vite) supports `.env` files for environment-specific configuration. Variables prefixed with `VITE_` are embedded into the client-side bundle at build time.

Pass environment variables as build arguments:

```dockerfile
FROM node:20-alpine AS build

WORKDIR /app

# Accept the API URL as a build argument
ARG VITE_API_BASE_URL=http://localhost:3000/api

# Make it available as an environment variable during the build
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
```

Build with a specific API URL:

```bash
docker build --build-arg VITE_API_BASE_URL=https://api.example.com -t my-vue-app:prod .
```

In your Vue.js code, access it with `import.meta.env.VITE_API_BASE_URL`.

## Runtime Environment Variables

Sometimes you need to change configuration without rebuilding the image. One approach is to generate a config file at container startup.

Create an `entrypoint.sh` script:

```bash
#!/bin/sh
# Generate a runtime config file from environment variables
cat <<EOF > /usr/share/nginx/html/config.json
{
  "apiUrl": "${API_URL:-http://localhost:3000}",
  "appTitle": "${APP_TITLE:-My Vue App}"
}
EOF

# Start Nginx
nginx -g "daemon off;"
```

Update the Dockerfile to use this entrypoint:

```dockerfile
FROM nginx:1.25-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]
```

Then in your Vue.js code, fetch `/config.json` at startup to read the runtime configuration.

## Image Size Optimization

Check the final image size:

```bash
docker images my-vue-app
```

A Vue.js app served from Nginx Alpine typically weighs between 20-40MB. To squeeze it further:

- Use `npm ci --ignore-scripts` if you do not need postinstall hooks.
- Add only production-relevant files in the build stage.
- Use `nginx:1.25-alpine` rather than the full Nginx image.

## Security Best Practices

Add security headers in your Nginx config:

```nginx
# Add security headers to all responses
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

Run Nginx as a non-root user for an extra layer of protection. This is especially important in Kubernetes environments where pod security policies may enforce non-root containers.

## Conclusion

Containerizing a Vue.js application follows a well-established pattern: build with Node.js, serve with Nginx. Multi-stage Docker builds keep the production image lean, and proper Nginx configuration handles Vue Router's history mode routing. For development, volume mounts with the Vite dev server maintain the fast feedback loop you are used to. Combine these patterns with environment variable injection and security hardening to create a production-ready deployment pipeline for any Vue.js project.
