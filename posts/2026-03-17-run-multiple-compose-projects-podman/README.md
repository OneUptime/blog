# How to Run Multiple Compose Projects with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, podman-compose, Project, Multi-Project

Description: Learn how to run multiple independent podman-compose projects simultaneously without naming conflicts or port collisions.

---

> Running multiple compose projects with Podman lets you develop and test microservices, client projects, or multiple environments side by side.

When working on multiple applications or microservice architectures, you often need several compose projects running at the same time. podman-compose handles this through project name isolation, separate networks, and careful port management.

---

## Project Name Isolation

Each compose project uses a project name prefix to avoid container name collisions.

```bash
# Project A - runs in /home/user/project-a

cd /home/user/project-a
podman-compose up -d
# Creates: project-a_web_1, project-a_db_1

# Project B - runs in /home/user/project-b
cd /home/user/project-b
podman-compose up -d
# Creates: project-b_web_1, project-b_db_1
```

## Custom Project Names

```bash
# Override the project name with -p flag
podman-compose -p frontend up -d
# Creates: frontend_web_1, frontend_db_1

podman-compose -p backend up -d
# Creates: backend_api_1, backend_db_1
```

## Avoiding Port Conflicts

Each project must use unique host ports.

```yaml
# project-a/docker-compose.yml
services:
  web:
    image: docker.io/library/nginx:alpine
    ports:
      - "8080:80"
  db:
    image: docker.io/library/postgres:16-alpine
    ports:
      - "5432:5432"
```

```yaml
# project-b/docker-compose.yml
services:
  web:
    image: docker.io/library/nginx:alpine
    ports:
      - "8081:80"
  db:
    image: docker.io/library/postgres:16-alpine
    ports:
      - "5433:5432"
```

## Environment-Based Port Configuration

```yaml
# docker-compose.yml (shared by all environments)
services:
  web:
    image: docker.io/library/nginx:alpine
    ports:
      - "${WEB_PORT:-8080}:80"
  db:
    image: docker.io/library/postgres:16-alpine
    ports:
      - "${DB_PORT:-5432}:5432"
```

```bash
# Start staging on different ports
WEB_PORT=8090 DB_PORT=5440 podman-compose -p staging up -d

# Start production-like on other ports
WEB_PORT=8091 DB_PORT=5441 podman-compose -p production up -d
```

## Shared Networks Between Projects

```bash
# Create a shared network
podman network create shared-services
```

```yaml
# project-a/docker-compose.yml
services:
  api:
    image: docker.io/library/python:3.12-slim
    networks:
      - default
      - shared

networks:
  shared:
    external: true
    name: shared-services
```

```yaml
# project-b/docker-compose.yml
services:
  frontend:
    image: docker.io/library/nginx:alpine
    networks:
      - default
      - shared

networks:
  shared:
    external: true
    name: shared-services
```

```bash
# Both projects can communicate through the shared network
podman-compose -f project-a/docker-compose.yml up -d
podman-compose -f project-b/docker-compose.yml up -d
```

## Managing Multiple Projects

```bash
# List all running containers across projects
podman ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Stop a specific project
podman-compose -p frontend down

# View logs from a specific project
podman-compose -p backend logs -f
```

## Multi-Project Management Script

```bash
#!/bin/bash
# manage-projects.sh - start/stop all projects
ACTION="${1:-up}"
PROJECTS=(project-a project-b project-c)

for project in "${PROJECTS[@]}"; do
  echo "=== $ACTION: $project ==="
  if [ "$ACTION" = "up" ]; then
    podman-compose -f "$project/docker-compose.yml" -p "$project" up -d
  elif [ "$ACTION" = "down" ]; then
    podman-compose -f "$project/docker-compose.yml" -p "$project" down
  fi
done

echo "All projects: $ACTION complete"
podman ps --format "table {{.Names}}\t{{.Status}}"
```

```bash
# Start all projects
./manage-projects.sh up

# Stop all projects
./manage-projects.sh down
```

## Summary

Run multiple compose projects with Podman by using different project names (directory-based or via `-p`), unique host ports, and optional shared networks for cross-project communication. Use environment variables for dynamic port assignment and management scripts for coordinating multiple projects.
