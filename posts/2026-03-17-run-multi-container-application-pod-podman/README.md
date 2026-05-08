# How to Run a Multi-Container Application in a Pod with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Pod, Multi-Container, Architecture

Description: Learn how to deploy a complete multi-container application stack using a Podman pod.

---

> A Podman pod lets you run a full application stack where all containers share networking and communicate over localhost.

Real-world applications typically consist of multiple services: a web server, an application backend, a database, and possibly a cache. Running these in a single Podman pod simplifies networking since every container can reach every other container on localhost. This guide walks through setting up a complete multi-container application.

---

## Designing the Pod

A typical web application stack includes:
- Nginx as a reverse proxy (port 80)
- A Node.js API server (port 3000)
- PostgreSQL database (port 5432)
- Redis cache (port 6379)

```bash
# Create the pod with the externally exposed port

podman pod create --name webapp-pod -p 8080:80
```

## Starting the Database

```bash
# Run PostgreSQL with a named volume for persistence
podman run -d --pod webapp-pod --name db \
  -e POSTGRES_USER=app \
  -e POSTGRES_PASSWORD=secret \
  -e POSTGRES_DB=webapp \
  -v webapp-db:/var/lib/postgresql/data \
  docker.io/library/postgres:16-alpine
```

## Starting the Cache

```bash
# Run Redis for session and data caching
podman run -d --pod webapp-pod --name cache \
  docker.io/library/redis:7-alpine \
  redis-server --maxmemory 128mb --maxmemory-policy allkeys-lru
```

## Starting the Application Server

```bash
# Run the API server connecting to DB and cache on localhost
podman run -d --pod webapp-pod --name api \
  -e DATABASE_URL=postgresql://app:secret@localhost:5432/webapp \
  -e REDIS_URL=redis://localhost:6379 \
  docker.io/library/node:20-alpine \
  sh -c "npm install express && node -e \"
    const app = require('express')();
    app.get('/api/health', (req, res) => res.json({status: 'ok'}));
    app.listen(3000, () => console.log('API on port 3000'));
  \""
```

## Starting the Reverse Proxy

Create the nginx config file first:

```bash
# Create an nginx config that proxies to the API
cat > /tmp/nginx.conf << 'EOF'
server {
    listen 80;
    location /api/ {
        proxy_pass http://localhost:3000;
    }
    location / {
        return 200 'Webapp is running\n';
        add_header Content-Type text/plain;
    }
}
EOF
```

```bash
podman run -d --pod webapp-pod --name proxy \
  -v /tmp/nginx.conf:/etc/nginx/conf.d/default.conf:ro \
  docker.io/library/nginx:alpine
```

## Verifying the Stack

```bash
# Check all containers are running
podman ps --filter pod=webapp-pod --format "table {{.Names}}\t{{.Status}}"

# Test the reverse proxy
curl http://localhost:8080/

# Test the API through the proxy
curl http://localhost:8080/api/health

# Check database connectivity
podman exec db pg_isready -U app
```

## Managing the Full Stack

```bash
# Stop the entire application
podman pod stop webapp-pod

# Start it again
podman pod start webapp-pod

# View logs from all containers
podman pod logs --names webapp-pod

# Remove everything
podman pod rm --force webapp-pod
```

## Summary

Running a multi-container application in a Podman pod simplifies networking by placing all services on localhost. Create the pod with exposed ports, add each service as a container, and use localhost addresses for inter-service communication. Manage the entire stack as a single unit with pod-level commands.
