# How to Add a Health Check to a Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Health Check, Monitoring

Description: Learn how to add health checks to Podman containers to monitor application availability and automatically detect failures.

---

> Health checks let Podman periodically verify that your containerized application is running correctly, enabling automated failure detection.

Container health checks are a critical part of running reliable services. Without them, a container may appear running while the application inside has crashed or become unresponsive. Podman supports health checks that periodically execute a command inside the container and report the application status.

---

## Understanding Health Checks

A health check is a command that Podman runs inside your container at regular intervals. If the command exits with code 0, the container is considered healthy. Failed checks count toward the configured retry limit, and Podman marks the container as unhealthy after the allowed retries are exceeded.

## Adding a Health Check at Container Creation

Use the `--health-cmd` flag when running a container:

```bash
# Add a basic HTTP health check to a web server container

podman run -d \
  --name my-web-app \
  --health-cmd "curl -f http://localhost:8080/health || exit 1" \
  --health-interval 30s \
  --health-timeout 10s \
  --health-retries 3 \
  my-web-app:latest
```

## Adding a Health Check via Containerfile

You can also define health checks directly in your Containerfile:

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY . .
RUN npm install

EXPOSE 3000

# Define the health check in the image
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
```

## Common Health Check Commands

```bash
# HTTP endpoint check using curl
podman run -d --name web \
  --health-cmd "curl -f http://localhost:80/ || exit 1" \
  nginx:latest

# PostgreSQL readiness check
podman run -d --name db \
  -e POSTGRES_PASSWORD=example \
  --health-cmd "pg_isready -U postgres || exit 1" \
  postgres:15

# File existence check
podman run -d --name worker \
  --health-cmd "test -f /tmp/healthy || exit 1" \
  my-worker:latest
```

## Verifying the Health Check

After starting the container, inspect its health status:

```bash
# Check the container health status
podman inspect --format='{{.State.Health.Status}}' my-web-app

# View detailed health check results
podman inspect --format='{{json .State.Health}}' my-web-app | python3 -m json.tool
```

## Overriding Image Health Checks

If the image already has a health check, you can override it at run time:

```bash
# Override the image health check with a custom command
podman run -d --name custom-check \
  --health-cmd "curl -f http://localhost:9090/ready || exit 1" \
  my-app-with-healthcheck:latest
```

## Summary

Adding health checks to Podman containers is straightforward using the `--health-cmd` flag or the `HEALTHCHECK` directive in a Containerfile. Health checks provide automated monitoring that helps you detect and respond to application failures quickly, making your containerized services more reliable.
