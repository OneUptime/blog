# How to Containerize an Angular Application with Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Angular, Containerization, Frontend, DevOps, Nginx

Description: A step-by-step guide to containerizing Angular applications with Docker using multi-stage builds and Nginx for production

---

Angular is one of the most popular frameworks for building single-page applications. When you need to ship your Angular app to production, Docker gives you a consistent, portable way to package everything. This guide walks you through containerizing an Angular application from scratch, covering development workflows, multi-stage builds, and production-ready Nginx configuration.

## Prerequisites

Before you start, make sure you have the following installed on your machine:

- Node.js 22.22+ or 24.15+ and npm
- Docker Engine with Docker Compose v2
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

FROM node:24-alpine AS build

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
FROM nginx:stable-alpine AS production

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

```text
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
services:
  angular-app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8080:80"
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "wget -q --spider http://127.0.0.1:80 || exit 1"]
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
FROM node:24-alpine

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

Angular bakes environment configuration into the build output. If your project uses Angular environment files, you can pass build-time variables using Docker build arguments.

If your project does not already have environment files, create them first with `ng generate environments`. This Dockerfile snippet shows how to pass an API URL at build time:

```dockerfile
FROM node:24-alpine AS build
WORKDIR /app

# Define a build argument for the API base URL
ARG API_URL=http://localhost:3000

COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# Replace the production environment value before building
RUN sed -i "s|API_URL_PLACEHOLDER|${API_URL}|g" src/environments/environment.ts

RUN npm run build -- --configuration=production
```

Build with a custom API URL:

```bash
docker build --build-arg API_URL=https://api.mycompany.com -t my-angular-app:prod .
```

## Optimizing Image Size

The multi-stage build already reduces the final image size significantly. Here are a few additional tips:

- Use `node:24-alpine` instead of `node:24` for the build stage. Alpine images are much smaller than the full image.
- Run `npm ci` instead of `npm install`. It is faster, stricter, and produces deterministic installs.
- Make sure `.dockerignore` excludes test files, documentation, and IDE configuration.

Check your final image size:

```bash
docker images my-angular-app
```

A well-optimized Angular Docker image with Nginx typically comes in around 25-40MB.

## Security Considerations

Running containers as root is a bad practice. For Nginx, use the unprivileged image and listen on port 8080.

This snippet uses the unprivileged Nginx image and adjusts the runtime port:

```dockerfile
FROM nginxinc/nginx-unprivileged:stable-alpine AS production

USER root

RUN rm -rf /usr/share/nginx/html/*
COPY --from=build --chown=nginx:nginx /app/dist/my-angular-app/browser /usr/share/nginx/html
COPY --chown=nginx:nginx nginx.conf /etc/nginx/conf.d/default.conf

# The unprivileged image listens on 8080 instead of 80
RUN sed -i 's/listen 80;/listen 8080;/' /etc/nginx/conf.d/default.conf

USER nginx
EXPOSE 8080
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
