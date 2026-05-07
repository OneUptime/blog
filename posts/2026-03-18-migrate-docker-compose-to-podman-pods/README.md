# How to Migrate from Docker Compose to Podman Pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Docker Compose, Migration, Pod, Container

Description: A step-by-step guide to migrating multi-container applications from Docker Compose to Podman pods, including networking changes, volume migration, and service configuration.

---

> Migrating from Docker Compose to Podman pods means shifting from DNS-based service discovery to shared-namespace networking, which requires updating connection strings but simplifies inter-container communication.

Docker Compose is a popular tool for defining multi-container applications, but Podman pods offer a different model that aligns with Kubernetes patterns and provides tighter container grouping. Migrating from one to the other involves understanding the networking differences and adjusting your configuration accordingly.

This guide walks through the complete migration process with practical examples and common pitfalls to avoid.

---

## Understanding the Key Differences

In Docker Compose, each service gets its own IP address on a shared bridge network. Services communicate using hostnames derived from service names. In Podman pods, all containers share a single network namespace and communicate over localhost.

```yaml
# Docker Compose: services use hostnames

services:
  api:
    environment:
      DATABASE_URL: postgresql://user:pass@db:5432/app
      REDIS_URL: redis://cache:6379
  db:
    image: postgres:16
  cache:
    image: redis:7
```

```bash
# Podman pod: after the pod exists, services use localhost
podman run -d --pod myapp --name api \
  -e DATABASE_URL=postgresql://user:pass@127.0.0.1:5432/app \
  -e REDIS_URL=redis://127.0.0.1:6379 \
  my-api
```

## Step 1: Analyze Your Docker Compose File

Start by documenting your existing compose configuration:

```yaml
# docker-compose.yml
version: "3.9"
services:
  web:
    image: nginx:stable
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - static-files:/var/www/static:ro
    depends_on:
      - api

  api:
    build: ./api
    environment:
      - DATABASE_URL=postgresql://appuser:apppass@db:5432/appdb
      - REDIS_URL=redis://cache:6379
      - SECRET_KEY=mysecret
    volumes:
      - uploads:/app/uploads
    depends_on:
      - db
      - cache

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=appdb
      - POSTGRES_USER=appuser
      - POSTGRES_PASSWORD=apppass
    volumes:
      - pgdata:/var/lib/postgresql/data

  cache:
    image: redis:7-alpine
    volumes:
      - redis-data:/data

volumes:
  static-files:
  uploads:
  pgdata:
  redis-data:
```

List what needs to change:
- Hostnames (`db`, `cache`) become `127.0.0.1`
- Ports are declared at the pod level
- All containers must use unique port numbers
- Services with `build:` need images built separately with `podman build`

## Step 2: Check for Port Conflicts

In a pod, all containers share the same port space. Verify no two services bind to the same port:

```bash
# Common conflicts to check:
# Multiple services on port 80
# Multiple services on port 8080
# Health check endpoints on the same port
```

If conflicts exist, change the listening port of one service. For example, if both web and api listen on port 80:

```bash
# Change api to listen on port 3000 instead
podman run -d --pod myapp --name api \
  -e PORT=3000 \
  my-api
```

## Step 3: Create Podman Volumes

Create named volumes matching your Docker Compose configuration:

```bash
podman volume create static-files
podman volume create uploads
podman volume create pgdata
podman volume create redis-data
```

## Step 4: Migrate Data from Docker Volumes

Export data from Docker volumes and import into Podman volumes:

```bash
# Check the actual Docker Compose volume name first. Compose usually
# prefixes named volumes with the project name unless `name:` or
# `external:` is set.
docker volume ls \
  --filter label=com.docker.compose.volume=pgdata \
  --format '{{.Name}}'

# Export from Docker using the returned name. This example assumes myapp_pgdata.
docker run --rm \
  -v myapp_pgdata:/source:ro \
  -v $(pwd)/backup:/backup \
  alpine tar -czf /backup/pgdata.tar.gz -C /source .

# Import to Podman
podman run --rm \
  -v pgdata:/dest \
  -v $(pwd)/backup:/backup:ro \
  alpine sh -c 'cd /dest && tar -xzf /backup/pgdata.tar.gz'
```

## Step 5: Create the Pod

Create a pod with all the published ports:

```bash
podman pod create --name myapp \
  -p 80:80 \
  -p 443:443

# Build images that were built by Docker Compose
podman build -t my-api ./api
```

## Step 6: Start Containers in the Pod

Start containers in dependency order:

```bash
# Database first
podman run -d --pod myapp \
  --name db \
  -e POSTGRES_DB=appdb \
  -e POSTGRES_USER=appuser \
  -e POSTGRES_PASSWORD=apppass \
  -v pgdata:/var/lib/postgresql/data:Z \
  postgres:16-alpine

# Cache
podman run -d --pod myapp \
  --name cache \
  -v redis-data:/data:Z \
  redis:7-alpine

# Wait for database to be ready
sleep 5

# API (note: hostname changed to 127.0.0.1)
podman run -d --pod myapp \
  --name api \
  -e DATABASE_URL=postgresql://appuser:apppass@127.0.0.1:5432/appdb \
  -e REDIS_URL=redis://127.0.0.1:6379 \
  -e SECRET_KEY=mysecret \
  -v uploads:/app/uploads:Z \
  my-api

# Web server
podman run -d --pod myapp \
  --name web \
  -v ./nginx.conf:/etc/nginx/conf.d/default.conf:ro,Z \
  -v static-files:/var/www/static:ro,Z \
  nginx:stable
```

## Step 7: Update Nginx Configuration

Since services are now on localhost, update the Nginx proxy configuration:

```nginx
# Before (Docker Compose):
upstream api {
    server api:3000;
}

# After (Podman pod):
upstream api {
    server 127.0.0.1:3000;
}
```

## Step 8: Create a Migration Script

Automate the entire migration:

```bash
#!/bin/bash
# migrate-to-pods.sh

set -e

echo "Creating volumes..."
podman volume create static-files
podman volume create uploads
podman volume create pgdata
podman volume create redis-data

echo "Creating pod..."
podman pod create --name myapp -p 80:80 -p 443:443

echo "Building API image..."
podman build -t my-api ./api

echo "Starting database..."
podman run -d --pod myapp --name db \
  -e POSTGRES_DB=appdb \
  -e POSTGRES_USER=appuser \
  -e POSTGRES_PASSWORD=apppass \
  -v pgdata:/var/lib/postgresql/data:Z \
  postgres:16-alpine

echo "Waiting for database..."
until podman exec db pg_isready -U appuser; do
  sleep 2
done

echo "Starting cache..."
podman run -d --pod myapp --name cache \
  -v redis-data:/data:Z \
  redis:7-alpine

echo "Starting API..."
podman run -d --pod myapp --name api \
  -e DATABASE_URL=postgresql://appuser:apppass@127.0.0.1:5432/appdb \
  -e REDIS_URL=redis://127.0.0.1:6379 \
  -e SECRET_KEY=mysecret \
  -v uploads:/app/uploads:Z \
  my-api

echo "Starting web server..."
podman run -d --pod myapp --name web \
  -v ./nginx.conf:/etc/nginx/conf.d/default.conf:ro,Z \
  -v static-files:/var/www/static:ro,Z \
  nginx:stable

echo "Migration complete. Pod status:"
podman pod ps
podman ps --pod
```

## Step 9: Generate Kubernetes YAML

One benefit of using pods is Kubernetes compatibility:

```bash
podman kube generate myapp > myapp-k8s.yaml
```

This produces a Kubernetes YAML manifest. Review the generated volumes, image names, security settings, and service exposure before applying it to a cluster.

## Step 10: Set Up systemd Management

Convert your pod to a systemd service:

```ini
# ~/.config/containers/systemd/myapp.pod
[Pod]
PodName=myapp
PublishPort=80:80
PublishPort=443:443

# ~/.config/containers/systemd/db.container
[Container]
Image=docker.io/library/postgres:16-alpine
Pod=myapp.pod
Volume=pgdata:/var/lib/postgresql/data:Z
Environment=POSTGRES_DB=appdb
Environment=POSTGRES_USER=appuser
Environment=POSTGRES_PASSWORD=apppass
[Service]
Restart=always

# ~/.config/containers/systemd/api.container
[Container]
Image=my-api:latest
Pod=myapp.pod
Volume=uploads:/app/uploads:Z
Environment=DATABASE_URL=postgresql://appuser:apppass@127.0.0.1:5432/appdb
Environment=REDIS_URL=redis://127.0.0.1:6379
Environment=SECRET_KEY=mysecret
[Service]
Restart=always
```

## Common Migration Issues

**Port conflicts**: Two services binding to the same port. Solution: change one service's port.

**Hostname resolution**: Services using compose service names. Solution: replace hostnames with `127.0.0.1`.

**Health check dependencies**: Compose `depends_on` with health checks. Solution: use systemd ordering with `After=` directives or startup scripts that poll for readiness.

**Volume permissions**: SELinux labels differ. Solution: use the `:Z` flag on volume mounts.

## Conclusion

Migrating from Docker Compose to Podman pods requires updating connection strings from service hostnames to localhost, declaring ports at the pod level, and handling startup ordering through scripts or systemd. The payoff is a Kubernetes-compatible deployment model, rootless execution, and tighter container grouping. Plan the migration by documenting your compose configuration, checking for port conflicts, and testing thoroughly before cutting over.
