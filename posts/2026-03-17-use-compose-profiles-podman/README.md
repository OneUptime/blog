# How to Use Compose Profiles with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, podman-compose, Profiles, Configuration

Description: Learn how to use Compose profiles with Podman to selectively start groups of services for different environments and workflows.

---

> Compose profiles let you define groups of services and start only the ones you need, keeping your development environment lean.

Profiles allow you to tag services in your compose file and selectively activate them. A debugging service, a monitoring stack, or test runners can all live in the same compose file but only start when their profile is explicitly activated.

---

## Defining Profiles

```yaml
# docker-compose.yml

services:
  web:
    image: docker.io/library/nginx:alpine
    ports:
      - "8080:80"
    # No profile - always starts

  db:
    image: docker.io/library/postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: secret
    # No profile - always starts

  adminer:
    image: docker.io/library/adminer:latest
    ports:
      - "9090:8080"
    profiles:
      - debug
    # Only starts when 'debug' profile is active

  prometheus:
    image: docker.io/prom/prometheus:latest
    ports:
      - "9091:9090"
    profiles:
      - monitoring

  grafana:
    image: docker.io/grafana/grafana:latest
    ports:
      - "3000:3000"
    profiles:
      - monitoring
```

## Starting Services Without Profiles

```bash
# Only web and db start (services without profiles)
podman-compose up -d

podman-compose ps
# Only web and db are running
```

## Activating a Profile

```bash
# Start services with the debug profile
podman-compose --profile debug up -d

# web, db, and adminer all start
podman-compose ps
```

## Activating Multiple Profiles

```bash
# Start both debug and monitoring profiles
podman-compose --profile debug --profile monitoring up -d

# All five services start
podman-compose ps
```

## Using COMPOSE_PROFILES Environment Variable

```bash
# Set profiles via environment variable
export COMPOSE_PROFILES=debug,monitoring

# Now 'up' activates both profiles automatically
podman-compose up -d

# Unset to go back to default
unset COMPOSE_PROFILES
```

## Services in Multiple Profiles

```yaml
# docker-compose.yml
services:
  test-runner:
    image: docker.io/library/python:3.12-slim
    command: python -m pytest
    profiles:
      - test
      - ci
    # Starts when either 'test' or 'ci' profile is active
```

## Profile-Specific Tear Down

```bash
# Stop services in the debug profile and services without profiles
podman-compose --profile debug down

# Stop services included by both profiles and services without profiles
podman-compose --profile debug --profile monitoring down
```

## Development vs Production Profiles

```yaml
# docker-compose.yml
services:
  app:
    image: docker.io/library/node:20-alpine
    ports:
      - "3000:3000"

  hot-reload:
    image: docker.io/library/node:20-alpine
    volumes:
      - .:/app
    command: npm run dev
    profiles:
      - dev

  load-balancer:
    image: docker.io/library/nginx:alpine
    profiles:
      - prod
```

```bash
# Development workflow
podman-compose --profile dev up -d

# Production-like workflow
podman-compose --profile prod up -d
```

## Summary

Compose profiles let you tag services and selectively start them with `--profile`. Services without a profile always start. Use profiles to separate debugging tools, monitoring stacks, and test services from your core application, keeping each environment minimal.
