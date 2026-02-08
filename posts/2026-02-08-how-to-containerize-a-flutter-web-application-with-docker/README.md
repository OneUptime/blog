# How to Containerize a Flutter Web Application with Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Flutter, Containerization, DevOps, Web Development, Nginx

Description: Complete guide to building and serving Flutter web applications with Docker, including multi-stage builds with Nginx and optimization strategies.

---

Flutter's web support turns your cross-platform application into a production-ready web app. Docker provides the ideal way to build and serve this web app with consistent, reproducible deployments. This guide covers the full pipeline: building Flutter web assets in Docker, serving them with Nginx, and optimizing for production.

## Prerequisites

You need Docker installed. Familiarity with Flutter and basic web server concepts is helpful. We will work with a sample Flutter project, but the techniques apply to any Flutter web application.

## Creating a Sample Flutter Web App

If you already have a Flutter project, skip this section. Otherwise, create a simple one:

```bash
# Create a new Flutter project with web support
flutter create flutter_docker_demo
cd flutter_docker_demo

# Verify web support is enabled
flutter config --enable-web
```

The default Flutter counter app works fine for our purposes. The important thing is the build output.

## Understanding the Flutter Web Build

Before writing the Dockerfile, understand what `flutter build web` produces:

```bash
# Build the web app locally to see the output
flutter build web --release
ls build/web/
```

The `build/web/` directory contains static files: HTML, JavaScript, CSS, and assets. This is what we need to serve. There is no backend runtime, just static files that need a web server.

## Basic Dockerfile with Nginx

The most common approach uses a multi-stage build: Flutter SDK for building, Nginx for serving.

```dockerfile
# Stage 1: Build Flutter web assets
FROM ghcr.io/cirruslabs/flutter:stable AS builder

WORKDIR /app

# Copy pubspec files first for dependency caching
COPY pubspec.* ./

# Get dependencies
RUN flutter pub get

# Copy the rest of the source code
COPY . .

# Build the web app in release mode
RUN flutter build web --release

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Remove the default Nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy the built web assets from the builder
COPY --from=builder /app/build/web /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

## Nginx Configuration for Flutter

Flutter web apps use client-side routing. The Nginx config needs to handle this by redirecting all routes to `index.html`:

```nginx
# nginx.conf - configured for Flutter's client-side routing
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Enable gzip compression for better performance
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript application/wasm;
    gzip_min_length 1000;

    # Cache static assets aggressively
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|wasm)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Flutter's main.dart.js should be cached but revalidated
    location = /main.dart.js {
        expires 1d;
        add_header Cache-Control "public, must-revalidate";
    }

    # Handle client-side routing - send all paths to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 'ok';
        add_header Content-Type text/plain;
    }
}
```

## The .dockerignore File

Flutter projects have many files that should not enter the Docker build context:

```text
# .dockerignore - exclude non-essential files
.git/
.dart_tool/
.packages
build/
ios/
android/
macos/
linux/
windows/
test/
*.md
.gitignore
.metadata
analysis_options.yaml
```

Excluding platform directories (ios, android, macos, etc.) significantly reduces the build context size.

## Build and Run

```bash
# Build the Docker image
docker build -t flutter-web-app:latest .

# Run the container
docker run -d -p 8080:80 --name flutter-app flutter-web-app:latest

# Test it
curl http://localhost:8080
```

## Optimizing the Flutter Build

Flutter offers different web renderers. Choose based on your needs:

```dockerfile
# Use the CanvasKit renderer for richer graphics
RUN flutter build web --release --web-renderer canvaskit

# Or use the HTML renderer for smaller bundle size
RUN flutter build web --release --web-renderer html

# Auto mode lets Flutter decide based on the device
RUN flutter build web --release --web-renderer auto
```

The HTML renderer produces smaller downloads, while CanvasKit provides better visual fidelity. For most business applications, the HTML renderer is sufficient.

You can also enable tree shaking for material icons to reduce bundle size:

```bash
# Build with tree-shaken icons
flutter build web --release --tree-shake-icons
```

## Caching Flutter Dependencies in Docker

Flutter builds are slow because of dependency downloads. Use BuildKit cache mounts:

```dockerfile
# Optimized build with dependency caching
FROM ghcr.io/cirruslabs/flutter:stable AS builder

WORKDIR /app

COPY pubspec.* ./

# Cache the pub cache across builds
RUN --mount=type=cache,target=/root/.pub-cache \
    flutter pub get

COPY . .

# Cache the build directory for incremental builds
RUN --mount=type=cache,target=/app/build \
    flutter build web --release && \
    cp -r build/web /tmp/web

FROM nginx:alpine
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /tmp/web /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Environment-Specific Builds

Flutter web apps often need different configurations for staging and production. Use Dart defines:

```dockerfile
# Pass environment variables at build time
FROM ghcr.io/cirruslabs/flutter:stable AS builder

ARG API_BASE_URL=https://api.example.com
ARG ENVIRONMENT=production

WORKDIR /app
COPY . .
RUN flutter pub get

# Pass build-time variables using dart-define
RUN flutter build web --release \
    --dart-define=API_BASE_URL=${API_BASE_URL} \
    --dart-define=ENVIRONMENT=${ENVIRONMENT}

FROM nginx:alpine
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/build/web /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Access these values in your Dart code:

```dart
// Access build-time environment variables in Dart
const apiBaseUrl = String.fromEnvironment('API_BASE_URL');
const environment = String.fromEnvironment('ENVIRONMENT');
```

Build with custom values:

```bash
# Build for staging environment
docker build \
  --build-arg API_BASE_URL=https://staging-api.example.com \
  --build-arg ENVIRONMENT=staging \
  -t flutter-web-app:staging .
```

## Docker Compose for Development

For local development with hot reload, avoid Docker for the Flutter build and use it only for backend services:

```yaml
# docker-compose.yml - backend services for Flutter web development
version: "3.8"
services:
  api:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://user:pass@db:5432/app

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: app
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

Run `flutter run -d chrome` locally while Docker handles the API and database. This gives you Flutter's hot reload without the overhead of rebuilding Docker images.

## Health Checks

Add a Docker health check:

```dockerfile
# Check that Nginx is serving the app
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/health || exit 1
```

## SSL with Let's Encrypt

For production deployments, add SSL:

```nginx
# nginx-ssl.conf - HTTPS configuration
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## Image Size Comparison

Here is a comparison of different approaches:

| Approach | Image Size |
|----------|-----------|
| Flutter SDK only | ~3 GB |
| Multi-stage with Nginx | ~25 MB |
| Multi-stage with Nginx Alpine | ~15 MB |

The multi-stage build reduces the image by over 99%.

## Monitoring Your Flutter Web App

After deploying, monitor your application's availability with [OneUptime](https://oneuptime.com). Set up uptime checks against both the root URL and the `/health` endpoint. Track page load performance to ensure your users get a fast experience.

## Summary

Containerizing a Flutter web application is straightforward because the build output is just static files. The multi-stage pattern, Flutter SDK for building and Nginx for serving, produces tiny images with excellent performance. Custom Nginx configuration handles Flutter's client-side routing, and build arguments let you create environment-specific builds from the same Dockerfile. Keep Flutter's hot reload for local development and reserve Docker for CI/CD and production deployments.
