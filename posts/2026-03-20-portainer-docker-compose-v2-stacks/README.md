# How to Use Docker Compose v2 Syntax in Portainer Stacks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Docker Compose, Stack, DevOps

Description: Learn how to leverage Docker Compose v2 syntax features in your Portainer stacks for modern container deployments.

## Introduction

Docker Compose v2 introduced significant improvements over v1, including better performance, new features, and tighter integration with the Docker CLI. In Portainer, these features are most relevant for Docker Standalone stacks, but support still depends on the Compose features available to your Portainer deployment path. This guide covers key v2 syntax features and the Portainer-specific caveats to keep in mind.

## Prerequisites

- Portainer CE or BE on a Docker Standalone environment
- Docker Engine 20.10+ with Docker Compose v2 available
- A recent enough Compose version for the features you plan to use (`include` requires Docker Compose 2.20.0+, `develop` requires 2.22.0+)
- Familiarity with basic Docker Compose concepts

## Compose v2 vs v1: Key Differences

| Feature | Compose v1 | Compose v2 |
|---------|-----------|-----------|
| CLI command | `docker-compose` | `docker compose` |
| Installation | Standalone Python binary | Docker plugin |
| Compose file format | Legacy 2.x/3.x format selection | Unified Compose Specification |
| Top-level `version` key | Commonly used to select file format | Obsolete and informational only |
| `include` directive | No | Yes (Docker Compose 2.20.0+) |
| `develop` specification | No | Yes (Docker Compose 2.22.0+) |

## Step 1: Remove the Version Key (Optional)

In Compose v2, the top-level `version` key is optional and ignored. You can omit it for cleaner files:

```yaml
# Compose v2 - no version key needed

services:
  web:
    image: nginx:alpine
    ports:
      - "80:80"
```

## Step 2: Use `depends_on` with Health Checks

Compose v2 supports condition-based dependency management:

```yaml
services:
  api:
    image: myapi:latest
    depends_on:
      database:
        condition: service_healthy   # Wait for DB health check to pass
      cache:
        condition: service_started   # Just wait for container to start

  database:
    image: postgres:15
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s   # Grace period for initial startup

  cache:
    image: redis:7-alpine
```

## Step 3: Use Profiles to Group Services

Profiles let you conditionally start services:

```yaml
services:
  web:
    image: nginx:alpine
    # No profile - always starts

  api:
    image: myapi:latest
    # No profile - always starts

  debug-tools:
    image: nicolaka/netshoot
    profiles:
      - debug   # Only starts when 'debug' profile is active

  monitoring:
    image: prom/prometheus
    profiles:
      - monitoring   # Only starts with 'monitoring' profile
```

Compose activates profiles through the `COMPOSE_PROFILES` environment variable or the `--profile` CLI flag. In Portainer, make sure `COMPOSE_PROFILES` is available during stack deployment.

## Step 4: Use the `include` Directive

Break large Compose files into smaller, reusable fragments:

```yaml
# Main docker-compose.yml
include:
  - path: ./compose/database.yml    # Include database services
  - path: ./compose/monitoring.yml  # Include monitoring services

services:
  web:
    image: nginx:alpine
    ports:
      - "80:80"
```

```yaml
# compose/database.yml
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: mydb
    volumes:
      - pg-data:/var/lib/postgresql/data

volumes:
  pg-data:
```

In Portainer, this is most practical with Git-based stacks so the included files are available alongside the main Compose file at deploy time.

## Step 5: Use Build Secrets

Compose v2 supports build-time secrets that don't persist in image layers:

```yaml
services:
  app:
    build:
      context: .
      secrets:
        - github_token   # Available during build, not in final image
    image: myapp:latest

secrets:
  github_token:
    environment: GITHUB_TOKEN   # Read from environment variable
```

The `GITHUB_TOKEN` variable must exist in the environment where Compose is running, and your Dockerfile must consume the secret with BuildKit syntax such as `RUN --mount=type=secret,id=github_token ...`. Also note that Portainer documents build-step limitations for remote Docker environments, so build-based workflows are safest on local Docker Standalone environments or when images are built outside Portainer first.

## Step 6: Use `develop` for Local Watch Mode

The `develop` key is part of Compose watch workflows and is used with `docker compose up --watch` or `docker compose watch`. Portainer stack deployments do not start watch mode, so treat this as a local development feature rather than a Portainer stack deployment feature:

```yaml
services:
  frontend:
    build: .
    command: npm run dev
    develop:
      watch:
        - action: sync           # Sync files without rebuild
          path: ./src
          target: /app/src
        - action: rebuild        # Rebuild image on Dockerfile change
          path: Dockerfile
```

## Step 7: Advanced Network Configuration

```yaml
networks:
  frontend-net:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/24   # Custom subnet

  backend-net:
    driver: bridge
    internal: true   # No external connectivity

services:
  web:
    networks:
      - frontend-net

  api:
    networks:
      - frontend-net
      - backend-net   # Connected to both networks

  database:
    networks:
      - backend-net   # Only on internal network
```

## Deploying in Portainer

1. Navigate to **Stacks > Add stack**
2. Paste your v2 Compose file in the web editor
3. Add any required environment variables
4. Click **Deploy the stack**

On Docker Standalone environments, Portainer deploys stacks from Compose YAML, but support for newer Compose features still depends on the Compose implementation available to Portainer and the kind of environment you are deploying to.

## Troubleshooting

- **"version is obsolete" warning** - safe to ignore or remove the `version` key
- **Profile not activating** - `COMPOSE_PROFILES` is the Compose variable that enables profiles; ensure it is available during deployment
- **`include` not found** - use a Git-based stack or otherwise ensure referenced files exist alongside the main Compose file at deploy time
- **Build fails on remote environments** - Portainer documents `build` directives as unsupported on remote Docker environments; build images externally and deploy by `image:` in that case

## Conclusion

Docker Compose v2 brings powerful new capabilities to Portainer stacks. Features like health-check-based dependencies, profiles, and the `include` directive make it easier to manage complex applications. When using Portainer, just keep in mind that some Compose features depend on the deployment path and environment, and `develop` is intended for local watch workflows rather than normal stack deployment.
