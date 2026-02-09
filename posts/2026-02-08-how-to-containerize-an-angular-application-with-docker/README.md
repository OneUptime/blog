# How to Containerize an Angular Application with Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Angular, Containerization, Frontend, DevOps, Nginx

Description: A step-by-step guide to containerizing Angular applications with Docker using multi-stage builds and Nginx for production

---

Angular is one of the most popular frameworks for building single-page applications. When you need to ship your Angular app to production, Docker gives you a consistent, portable way to package everything. This guide walks you through containerizing an Angular application from scratch, covering development workflows, multi-stage builds, and production-ready Nginx configuration.

## Prerequisites

Before you start, make sure you have the following installed on your machine:

- Node.js 18+ and npm
- Docker Engine 20.10+
- Angular CLI (`npm install -g @angular/cli`)

## Creating a Sample Angular Application

If you already have an Angular project, skip ahead. Otherwise, scaffold a new one quickly.

This command creates a fresh Angular project with default settings:

```bash
ng new my-angular-app --routing --style=css
cd my-angular-app
```

Verify it builds correctly before containerizing:

```bash
npm run build
```

You should see the compiled output in the `dist/my-angular-app/browser` directory.

## Understanding the Build Process

Angular applications go through a two-phase lifecycle. During development, the Angular CLI runs a dev server with hot module replacement. For production, the CLI compiles TypeScript into optimized JavaScript bundles, tree-shakes unused code, and minifies everything.

Docker needs to handle both phases. The build phase requires Node.js and all your npm dependencies. The serve phase only needs a lightweight web server like Nginx. Multi-stage builds let you separate these concerns cleanly.

## Writing the Dockerfile

Create a `Dockerfile` in your project root. This uses a multi-stage build to keep the final image small.

The first stage installs dependencies and builds the Angular project:

```dockerfile
# Stage 1: Build the Angular application
FROM node:20-alpine AS build

# Set the working directory inside the container
WORKDIR /app

# Copy package files first to leverage Docker layer caching
COPY package.json package-lock.json ./

# Install dependencies (ci is faster and more reliable for builds)
RUN npm ci

# Copy the rest of the application source code
COPY . .

# Build the Angular app for production
RUN npm run build -- --configuration=production
```

The second stage copies only the compiled output into an Nginx container:

```dockerfile
# Stage 2: Serve the built app with Nginx
FROM nginx:1.25-alpine AS production

# Remove the default Nginx static files
RUN rm -rf /usr/share/nginx/html/*

# Copy the built Angular files from the build stage
COPY --from=build /app/dist/my-angular-app/browser /usr/share/nginx/html

# Copy a custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
```

## Custom Nginx Configuration

Angular uses client-side routing. If a user refreshes the page on a deep route like `/dashboard/settings`, Nginx needs to serve `index.html` instead of returning a 404. Create an `nginx.conf` file in your project root.

This Nginx config handles SPA routing and adds basic caching headers:

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Handle Angular client-side routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets aggressively
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Disable caching for index.html so users always get the latest version
    location = /index.html {
        expires -1;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }
}
```

## Creating a .dockerignore File

You definitely do not want to copy `node_modules` or other unnecessary files into the Docker build context. This slows down builds dramatically. Create a `.dockerignore` file.

This file tells Docker which files and directories to exclude:

```
node_modules
dist
.git
.gitignore
.angular
*.md
.editorconfig
.vscode
```

## Building and Running the Container

Build the Docker image with a descriptive tag:

```bash
# Build the image and tag it
docker build -t my-angular-app:latest .
```

Run the container and map port 8080 on your host to port 80 inside the container:

```bash
# Run the container in detached mode
docker run -d -p 8080:80 --name angular-app my-angular-app:latest
```

Open your browser and navigate to `http://localhost:8080`. Your Angular application should load.

## Setting Up Docker Compose

For more complex setups, Docker Compose makes things easier to manage. Create a `docker-compose.yml` file in your project root.

This Compose file defines the Angular service with a health check:

```yaml
version: "3.8"

services:
  angular-app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8080:80"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:80"]
      interval: 30s
      timeout: 10s
      retries: 3
```

Start everything with a single command:

```bash
docker compose up -d --build
```

## Development Workflow with Docker

For local development, you probably want hot reload instead of rebuilding the image every time. Create a separate `Dockerfile.dev` for this purpose.

This development Dockerfile mounts your source code and runs the Angular dev server:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Expose the Angular dev server port
EXPOSE 4200

# Start the dev server with host binding so it is accessible outside the container
CMD ["npx", "ng", "serve", "--host", "0.0.0.0"]
```

And a matching Compose file for development:

```yaml
version: "3.8"

services:
  angular-dev:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "4200:4200"
    volumes:
      # Mount source code for live reload
      - .:/app
      # Prevent overwriting node_modules inside the container
      - /app/node_modules
```

## Environment Variables at Build Time

Angular bakes environment configuration into the build output. You can pass build-time variables using Docker build arguments.

This Dockerfile snippet shows how to pass an API URL at build time:

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app

# Define a build argument for the API base URL
ARG API_URL=http://localhost:3000

COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# Replace the environment file before building
RUN sed -i "s|API_URL_PLACEHOLDER|${API_URL}|g" src/environments/environment.prod.ts

RUN npm run build -- --configuration=production
```

Build with a custom API URL:

```bash
docker build --build-arg API_URL=https://api.mycompany.com -t my-angular-app:prod .
```

## Optimizing Image Size

The multi-stage build already reduces the final image size significantly. Here are a few additional tips:

- Use `node:20-alpine` instead of `node:20` for the build stage. Alpine images are roughly 50MB compared to 350MB+ for the full image.
- Run `npm ci` instead of `npm install`. It is faster, stricter, and produces deterministic installs.
- Make sure `.dockerignore` excludes test files, documentation, and IDE configuration.

Check your final image size:

```bash
docker images my-angular-app
```

A well-optimized Angular Docker image with Nginx typically comes in around 25-40MB.

## Security Considerations

Running containers as root is a bad practice. Add a non-root user directive to the Nginx stage.

This snippet creates a non-root user and adjusts permissions:

```dockerfile
FROM nginx:1.25-alpine AS production

# Create a non-root user for running Nginx
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

RUN rm -rf /usr/share/nginx/html/*
COPY --from=build /app/dist/my-angular-app/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Adjust ownership so the non-root user can serve files
RUN chown -R appuser:appgroup /usr/share/nginx/html
RUN chown -R appuser:appgroup /var/cache/nginx
RUN touch /var/run/nginx.pid && chown appuser:appgroup /var/run/nginx.pid

USER appuser
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Troubleshooting Common Issues

**Build fails with "out of memory"**: Angular builds can be memory-hungry. Increase the Node.js memory limit in the Dockerfile:

```dockerfile
ENV NODE_OPTIONS="--max-old-space-size=4096"
```

**404 on page refresh**: You forgot the `try_files` directive in Nginx. Make sure your `nginx.conf` includes the SPA routing fallback.

**Assets not loading**: Double-check the `COPY --from=build` path. Angular 17+ outputs to `dist/project-name/browser` rather than just `dist/project-name`.

## Conclusion

Containerizing an Angular application with Docker is straightforward once you understand the multi-stage build pattern. The build stage handles the heavy lifting with Node.js, and the production stage serves static files through Nginx. This separation keeps your images small, your builds reproducible, and your deployments consistent across every environment. Start with the basics outlined here, then customize the Nginx configuration and build arguments to match your team's requirements.
