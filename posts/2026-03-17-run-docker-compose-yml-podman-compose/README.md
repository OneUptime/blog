# How to Run a docker-compose.yml with podman-compose

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, podman-compose, Docker Compose

Description: Learn how to run existing Docker Compose files using podman-compose without any modifications.

---

> podman-compose reads standard docker-compose.yml files and runs them with Podman, no Docker daemon required.

If you have an existing Docker Compose project, you can run it with Podman using podman-compose. In most cases, your `docker-compose.yml` works without changes. podman-compose translates Compose directives into Podman commands for containers, networks, and volumes.

---

## Running an Existing Compose File

```bash
# Navigate to your project directory containing docker-compose.yml

cd /path/to/project

# Start all services in the foreground
podman-compose up

# Or start in detached mode
podman-compose up -d
```

## Example Compose File

```yaml
# docker-compose.yml
services:
  web:
    image: docker.io/library/nginx:alpine
    ports:
      - "8080:80"
    volumes:
      - ./html:/usr/share/nginx/html:ro
  api:
    image: docker.io/library/node:20-alpine
    working_dir: /app
    volumes:
      - ./api:/app
    command: node server.js
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
  db:
    image: docker.io/library/postgres:16-alpine
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: appuser
      POSTGRES_PASSWORD: secret
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

```bash
# Run the full stack
podman-compose up -d

# Check all running containers
podman-compose ps

# View the logs
podman-compose logs
```

## Specifying a Custom File

```bash
# Use a different compose file name
podman-compose -f production.yml up -d

# Use multiple compose files (overrides)
podman-compose -f docker-compose.yml -f docker-compose.override.yml up -d
```

## Using Full Image References

One key difference from Docker: fully qualified image names are recommended with Podman to avoid short-name prompts or registry lookup issues.

```yaml
# Instead of this:
# image: nginx:alpine

# Use the full registry path:
image: docker.io/library/nginx:alpine
```

## Checking the Status

```bash
# List all services and their status
podman-compose ps

# Check specific container details
podman inspect project_web_1
```

## Stopping Services

```bash
# Stop and remove all containers, networks
podman-compose down

# Stop but keep containers
podman-compose stop
```

## Summary

Running Docker Compose files with podman-compose requires minimal or no changes. Use fully qualified image names, run `podman-compose up -d` to start services, and `podman-compose down` to stop them. The command syntax mirrors Docker Compose for an easy transition.
