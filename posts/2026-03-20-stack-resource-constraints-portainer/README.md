# How to Set Up Stack-Level Resource Constraints in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Compose, Resource Limit, Performance, Stack

Description: Apply CPU and memory resource constraints at the stack level in Portainer to ensure fair resource allocation.

## Introduction

Apply CPU and memory resource constraints to services in Portainer stacks to ensure fair resource allocation. This guide provides practical examples and best practices for implementing this in your Portainer deployments.

## Prerequisites

- Portainer CE or BE installed
- Docker Standalone or Docker Swarm environment connected
- Familiarity with Docker Compose YAML syntax

## Core Concepts

Understanding Docker Compose stack features in Portainer helps you create more maintainable, reliable deployments.

## Step 1: Navigate to Stacks in Portainer

1. Log into your Portainer instance
2. Select your Docker environment
3. Go to **Stacks** > **Add Stack**

## Step 2: Create the Stack Configuration

The example below targets Docker Standalone stacks in Portainer. For Docker Swarm stacks, keep the `deploy.resources` limits and reservations, but use Swarm-compatible options such as overlay networks and application-level retries instead of relying on Compose-only behavior such as profiles or `depends_on.condition`.

```yaml
# docker-compose.yml

# Reusable configuration using YAML anchors
x-common-env: &common-env
  LOG_LEVEL: info
  TZ: UTC

x-common-resources: &common-resources
  deploy:
    resources:
      limits:
        cpus: '1.0'
        memory: 512M
      reservations:
        cpus: '0.25'
        memory: 128M

x-common-healthcheck: &common-healthcheck
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 60s

services:
  # Frontend service
  frontend:
    image: my-frontend:latest
    <<: *common-resources
    ports:
      - "80:80"
    environment:
      <<: *common-env
      API_URL: http://api:3000
    healthcheck:
      <<: *common-healthcheck
      test: ["CMD", "wget", "--spider", "-q", "http://localhost/health"]
    depends_on:
      api:
        condition: service_healthy
    networks:
      - frontend-net
      - backend-net

  # API service
  api:
    image: my-api:latest
    <<: *common-resources
    environment:
      <<: *common-env
      DB_URL: postgresql://appuser:${DB_PASSWORD}@postgres:5432/appdb
    healthcheck:
      <<: *common-healthcheck
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - backend-net
      - db-net

  # Database
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: appdb
      POSTGRES_USER: appuser
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U appuser -d appdb"]
      interval: 10s
      timeout: 5s
      retries: 5
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - db-net

  # Cache
  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3
    volumes:
      - redis-data:/data
    networks:
      - backend-net

volumes:
  postgres-data:
  redis-data:

networks:
  # External-facing network
  frontend-net:
    driver: bridge
  # Internal API network
  backend-net:
    driver: bridge
    internal: false
  # Database network (isolated)
  db-net:
    driver: bridge
    internal: true  # No external access
```

## Step 3: Configure Environment Variables

Set stack-level environment variables in Portainer:

```bash
# Required by the compose file above
DB_PASSWORD=secure-database-password

# Optional application-specific variables
REDIS_PASSWORD=secure-redis-password
APP_SECRET=your-application-secret
DOMAIN=app.example.com
```

Enter these in Portainer's Stack editor under the **Environment variables** section.

## Step 4: Add Profiles for Optional Services

Use Docker Compose profiles for optional components:

```yaml
services:
  # Always starts
  app:
    image: my-app:latest
    # No profile = always starts

  # Only starts with 'monitoring' profile
  prometheus:
    image: prom/prometheus:latest
    profiles: ["monitoring"]

  # Only starts with 'debug' profile
  debugger:
    image: my-app-debug:latest
    profiles: ["debug"]
```

Start specific profiles in Portainer by setting:
`COMPOSE_PROFILES=monitoring`

For Docker Swarm stacks, avoid relying on Compose profiles. Swarm stacks are deployed with `docker stack deploy`, which uses the legacy Compose file version 3 format rather than the full Compose Specification.

## Step 5: Configure NFS Volumes

For shared storage across multiple hosts:

```yaml
volumes:
  shared-data:
    driver: local
    driver_opts:
      type: nfs
      o: "addr=nfs-server.example.com,rw,nfsvers=4"
      device: ":/exports/app-data"
  
  local-cache:
    driver: local
    driver_opts:
      type: tmpfs
      device: tmpfs
      o: "size=512m,mode=1777"
```

## Step 6: Validate and Deploy

Before deploying, validate your compose file:

```bash
# Validate compose file syntax
docker compose config

# Check for any configuration issues
docker compose config --quiet && echo "Config is valid"

# For Swarm stacks, also check compatibility with docker stack deploy
docker stack config --compose-file docker-compose.yml
```

Then deploy in Portainer:
1. Paste the validated compose file
2. Set environment variables
3. Click **Deploy the stack**

## Monitoring Stack Health

After deployment, monitor stack health in Portainer:

1. Go to **Stacks** > your stack
2. View container statuses
3. Check individual container logs
4. View resource usage per container or service

## Updating Stacks

Update running stacks:
1. Edit the stack compose file
2. Update image tags or configuration
3. Click **Update the stack**
4. Portainer redeploys the stack with the updated configuration

## Troubleshooting

Common issues and solutions:

```bash
# Stack fails to deploy - check logs
docker compose logs service-name

# Service can't connect to another service
# Check they're on the same network
docker network inspect stack-name_backend-net

# Volume permissions issue
docker exec app ls -la /data
```

## Conclusion

Mastering advanced Docker Compose features in Portainer stacks enables you to build more robust, maintainable, and production-ready deployments. Using YAML anchors to avoid duplication, profiles for environment-specific services, and proper health checks with dependencies improves startup ordering and operational visibility. Portainer's visual interface makes managing these complex configurations straightforward.
