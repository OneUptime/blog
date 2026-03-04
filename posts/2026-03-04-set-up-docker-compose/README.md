# How to Set Up Docker Compose on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Docker, Containers, Docker Compose, Linux

Description: Learn how to set Up Docker Compose on RHEL 9 with step-by-step instructions, configuration examples, and best practices.

---

Docker Compose defines and runs multi-container applications using a YAML file. It simplifies development and deployment by letting you start entire application stacks with a single command.

## Prerequisites

- RHEL 9 with Docker CE installed
- Root or sudo access

## Step 1: Install Docker Compose

Docker Compose v2 is included as a Docker plugin:

```bash
docker compose version
```

If not installed:

```bash
sudo dnf install -y docker-compose-plugin
```

## Step 2: Create a Compose File

```bash
mkdir -p ~/myapp && cd ~/myapp
vi docker-compose.yml
```

```yaml
version: '3.8'

services:
  web:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./html:/usr/share/nginx/html
    depends_on:
      - api
    restart: unless-stopped

  api:
    image: node:20-alpine
    working_dir: /app
    volumes:
      - ./api:/app
    command: node server.js
    environment:
      - DB_HOST=db
      - DB_PORT=5432
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: appuser
      POSTGRES_PASSWORD: secret123
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  pgdata:
```

## Step 3: Start the Stack

```bash
docker compose up -d
```

## Step 4: Common Commands

```bash
docker compose ps              # List running containers
docker compose logs            # View logs
docker compose logs -f api     # Follow specific service logs
docker compose exec db psql -U appuser myapp  # Execute in container
docker compose stop            # Stop all services
docker compose down            # Stop and remove containers
docker compose down -v         # Also remove volumes
docker compose build           # Build images
docker compose pull            # Pull latest images
```

## Step 5: Scale Services

```bash
docker compose up -d --scale api=3
```

## Step 6: Override for Development

Create docker-compose.override.yml:

```yaml
version: '3.8'

services:
  api:
    environment:
      - DEBUG=true
    ports:
      - "3000:3000"
```

This file is automatically merged with docker-compose.yml.

## Conclusion

Docker Compose on RHEL 9 simplifies multi-container application deployment with declarative YAML configuration. It handles service dependencies, networking, and volume management, making it ideal for development environments and simple production deployments.
