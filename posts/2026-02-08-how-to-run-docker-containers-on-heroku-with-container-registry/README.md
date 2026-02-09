# How to Run Docker Containers on Heroku with Container Registry

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Heroku, Container Registry, PaaS, Cloud, Deployment, DevOps, CI/CD

Description: A complete guide to deploying Docker containers on Heroku using the Container Registry, including multi-process apps and CI/CD integration.

---

Heroku's Container Registry lets you deploy Docker images directly instead of using buildpacks. This gives you full control over your runtime environment while keeping Heroku's convenience for scaling, add-ons, and deployment management. If your application needs specific system libraries, a particular OS version, or a custom runtime that buildpacks cannot provide, the Container Registry is the answer.

## How Heroku Container Deployments Work

When you push an image to Heroku's Container Registry, Heroku extracts it and runs it on their dyno infrastructure. The key difference from standard Heroku deployments: you control the Dockerfile, so you control everything about the runtime environment. Heroku still manages routing, SSL, logging, and add-on integration.

```mermaid
flowchart LR
    A[Build Image] --> B[Push to Heroku Registry]
    B --> C[Heroku extracts image]
    C --> D[Runs on Dynos]
    D --> E[Heroku Router]
    E --> F[Users]
```

## Prerequisites

Install the Heroku CLI and the container plugin:

```bash
# Install Heroku CLI
brew install heroku/brew/heroku  # macOS
# or: curl https://cli-assets.heroku.com/install.sh | sh  # Linux

# Login to Heroku
heroku login

# Login to the Container Registry
heroku container:login

# Create a new app (or use an existing one)
heroku create myapp-docker
```

## The Heroku Dockerfile Requirements

Heroku containers have specific requirements:

1. The web process must listen on the `$PORT` environment variable (Heroku assigns a random port)
2. The CMD or ENTRYPOINT must start your web server
3. Images must be Linux-based

Here is a Dockerfile that works with Heroku:

```dockerfile
# Dockerfile - Heroku-compatible Node.js application
FROM node:20-alpine

WORKDIR /app

# Install dependencies (cached layer)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy application code
COPY . .

# Heroku assigns PORT dynamically - your app must use this variable
EXPOSE $PORT

# Start the application (PORT is set by Heroku at runtime)
CMD ["node", "server.js"]
```

Your application must read the PORT from the environment:

```javascript
// server.js - Read PORT from environment (required for Heroku)
const express = require('express');
const app = express();

// Heroku sets PORT dynamically - never hardcode this
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({ status: 'running on Heroku' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on port ${port}`);
});
```

## Pushing and Releasing an Image

Heroku uses a two-step process: push the image, then release it.

```bash
# Build and push the image to Heroku's registry
heroku container:push web --app myapp-docker

# Release the image (makes it live)
heroku container:release web --app myapp-docker

# Open the app in your browser
heroku open --app myapp-docker
```

The `container:push` command builds the image locally and pushes it to `registry.heroku.com/myapp-docker/web`. The `container:release` command tells Heroku to deploy that image.

## Using Pre-Built Images

If you build images in CI/CD, push and release them directly:

```bash
# Tag your existing image for Heroku
docker tag myapp:latest registry.heroku.com/myapp-docker/web

# Push to Heroku's registry
docker push registry.heroku.com/myapp-docker/web

# Release the pushed image
heroku container:release web --app myapp-docker
```

## Multi-Process Applications

Heroku process types map to different images. A typical web application might have a web process and a worker process:

```bash
# Build and push both process types
heroku container:push web worker --app myapp-docker

# Release both
heroku container:release web worker --app myapp-docker
```

Each process type needs its own Dockerfile. Use naming conventions:

```
Dockerfile.web     -> web process
Dockerfile.worker  -> worker process
```

### Dockerfile.web

```dockerfile
# Dockerfile.web - Web server process
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
CMD ["node", "server.js"]
```

### Dockerfile.worker

```dockerfile
# Dockerfile.worker - Background job processor
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
CMD ["node", "worker.js"]
```

Scale each process type independently:

```bash
# Scale web to 2 dynos and worker to 1
heroku ps:scale web=2 worker=1 --app myapp-docker
```

## Using heroku.yml

For more control, define your deployment in a `heroku.yml` file:

```yaml
# heroku.yml - Docker deployment configuration
build:
  docker:
    web: Dockerfile.web
    worker: Dockerfile.worker
  config:
    NODE_ENV: production

run:
  web: node server.js
  worker: node worker.js

release:
  image: web
  command:
    - node
    - migrate.js
```

Set the stack to container:

```bash
# Switch to the container stack
heroku stack:set container --app myapp-docker

# Now git push triggers Docker builds on Heroku
git push heroku main
```

With heroku.yml, pushing to Heroku builds the images on Heroku's infrastructure instead of locally.

## Environment Variables and Add-ons

Heroku add-ons (databases, caches, monitoring) inject environment variables automatically:

```bash
# Add a PostgreSQL database
heroku addons:create heroku-postgresql:essential-0 --app myapp-docker

# Add Redis
heroku addons:create heroku-redis:mini --app myapp-docker

# Set custom environment variables
heroku config:set API_KEY=your-secret-key --app myapp-docker
heroku config:set NODE_ENV=production --app myapp-docker

# View all config variables
heroku config --app myapp-docker
```

These variables are available inside your container at runtime. Access them in your application:

```javascript
// Access Heroku add-on environment variables
const { Pool } = require('pg');

// DATABASE_URL is set automatically by heroku-postgresql
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
```

## CI/CD with GitHub Actions

Automate deployments to Heroku:

```yaml
# .github/workflows/deploy-heroku.yml
name: Deploy to Heroku
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Login to Heroku Container Registry
      - name: Login to Heroku
        env:
          HEROKU_API_KEY: ${{ secrets.HEROKU_API_KEY }}
        run: heroku container:login

      # Build, push, and release
      - name: Build and Push
        env:
          HEROKU_API_KEY: ${{ secrets.HEROKU_API_KEY }}
        run: |
          heroku container:push web --app myapp-docker
          heroku container:release web --app myapp-docker
```

### Using Docker Build and Push Directly

For more control over the build process:

```yaml
# .github/workflows/deploy-heroku-advanced.yml
name: Deploy to Heroku (Advanced)
on:
  push:
    branches: [main]

env:
  HEROKU_APP: myapp-docker

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Login to Heroku Container Registry
      - name: Login to Heroku Registry
        run: echo ${{ secrets.HEROKU_API_KEY }} | docker login registry.heroku.com -u _ --password-stdin

      # Build with caching
      - name: Build
        run: |
          docker pull registry.heroku.com/${{ env.HEROKU_APP }}/web || true
          docker build \
            --cache-from registry.heroku.com/${{ env.HEROKU_APP }}/web \
            --tag registry.heroku.com/${{ env.HEROKU_APP }}/web \
            .

      # Push the image
      - name: Push
        run: docker push registry.heroku.com/${{ env.HEROKU_APP }}/web

      # Release using the Heroku API directly
      - name: Release
        run: |
          IMAGE_ID=$(docker inspect registry.heroku.com/${{ env.HEROKU_APP }}/web --format={{.Id}})
          curl -X PATCH https://api.heroku.com/apps/${{ env.HEROKU_APP }}/formation \
            -H "Content-Type: application/json" \
            -H "Accept: application/vnd.heroku+json; version=3.docker-releases" \
            -H "Authorization: Bearer ${{ secrets.HEROKU_API_KEY }}" \
            -d "{\"updates\":[{\"type\":\"web\",\"docker_image\":\"$IMAGE_ID\"}]}"
```

## Viewing Logs and Debugging

```bash
# View recent logs
heroku logs --tail --app myapp-docker

# View logs for a specific process type
heroku logs --tail --dyno web --app myapp-docker

# Run a one-off command inside the container
heroku run bash --app myapp-docker

# Check dyno status
heroku ps --app myapp-docker

# Restart the application
heroku restart --app myapp-docker
```

## Release Phase Commands

Run database migrations or other tasks before the new version goes live:

```yaml
# heroku.yml with release phase
release:
  image: web
  command:
    - node
    - scripts/migrate.js
```

Or use a release Dockerfile:

```dockerfile
# Dockerfile.release - Runs during the release phase
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
CMD ["node", "scripts/migrate.js"]
```

## Health Checks and Timeouts

Heroku expects the web process to bind to `$PORT` within 60 seconds. If your container takes longer to start, increase the boot timeout:

```bash
# Increase boot timeout to 120 seconds
heroku config:set WEB_CONCURRENCY=2 --app myapp-docker
```

For applications with slow startup (Java, .NET), consider using a lightweight health check that responds immediately while the main application finishes loading.

## Comparison with Buildpacks

Use Container Registry when you need system libraries not available in buildpacks, a specific OS version, multi-stage builds for smaller images, or a custom runtime. Stick with buildpacks when your application fits standard patterns, because buildpacks handle security patches automatically and require less maintenance.

Heroku's Container Registry combines Docker's flexibility with Heroku's operational simplicity. You get full control over your runtime environment without managing servers, load balancers, or SSL certificates. The two-step push and release workflow gives you a clear separation between building and deploying, and the integration with Heroku add-ons means your containerized applications can use databases, caches, and monitoring services with zero configuration.
