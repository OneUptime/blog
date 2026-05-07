# How to Start Services with podman-compose up

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, podman-compose, Service

Description: Learn how to start container services using podman-compose up with various options for detached mode, specific services, and rebuilds.

---

> podman-compose up creates and starts all services defined in your compose file with a single command.

The `podman-compose up` command reads your `docker-compose.yml`, creates the necessary networks and volumes, pulls images if needed, and starts all defined services. It supports detached mode, selective service startup, and forced rebuilds.

---

## Basic Usage

```bash
# Start all services in the foreground (logs stream to terminal)

podman-compose up

# Start all services in detached (background) mode
podman-compose up -d
```

## Starting Specific Services

```bash
# Start the web and db services, plus any required dependencies
podman-compose up -d web db

# Unrelated services such as api will not be started
podman-compose ps
```

## Force Recreate Containers

```bash
# Recreate containers even if nothing has changed
podman-compose up -d --force-recreate

# Useful after changing environment variables or configuration
```

## Building Before Starting

```bash
# Build images before starting services
podman-compose up -d --build

# This rebuilds any service that has a 'build' section
```

## Example with Build

```yaml
# docker-compose.yml
services:
  app:
    build:
      context: .
      dockerfile: Containerfile
    ports:
      - "8080:8080"
    environment:
      - APP_ENV=development
  redis:
    image: docker.io/library/redis:7-alpine
    ports:
      - "6379:6379"
```

```bash
# Build the app image and start both services
podman-compose up -d --build

# Check the status
podman-compose ps
```

## Pulling Latest Images

```bash
# Pull the latest images before starting
podman-compose pull
podman-compose up -d
```

## Viewing Output

```bash
# Start in foreground to see all logs
podman-compose up

# Start detached, then follow logs
podman-compose up -d
podman-compose logs -f
```

## Handling Startup Failures

```bash
# Start and stop all containers if any container exits with an error
podman-compose up --abort-on-container-failure

# Check which container failed
podman-compose ps -a
podman-compose logs failed-service
```

## Summary

Use `podman-compose up` to start services from your compose file. Add `-d` for detached mode, `--build` to rebuild images, and specify service names to start only selected services. The command handles network and volume creation automatically.
