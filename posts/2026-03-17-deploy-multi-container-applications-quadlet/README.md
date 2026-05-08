# How to Deploy Multi-Container Applications with Quadlet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Quadlet, Multi-Container, Systemd

Description: Learn how to deploy multi-container applications using Podman Quadlet with proper networking, dependencies, and shared resources.

---

> Build complete multi-container application stacks with Quadlet using shared networks, dependency ordering, and health-based readiness to ensure services start in the right order.

Real applications typically consist of multiple services: a web frontend, an API backend, a database, and possibly a cache. Quadlet manages each as a separate systemd service with proper dependency ordering and shared networking.

---

## Application Architecture

This example deploys a three-tier application:
- PostgreSQL database
- Node.js API server
- Nginx reverse proxy

## Create Shared Resources

```ini
# ~/.config/containers/systemd/appnet.network

[Network]
Driver=bridge
```

```ini
# ~/.config/containers/systemd/dbdata.volume
[Volume]
```

## Database Service

```ini
# ~/.config/containers/systemd/app-db.container
[Unit]
Description=Application database

[Container]
ContainerName=app-db
Image=docker.io/library/postgres:16
Network=appnet.network
Volume=dbdata.volume:/var/lib/postgresql/data
Environment=POSTGRES_USER=api
Environment=POSTGRES_PASSWORD=secret
Environment=POSTGRES_DB=appdb
HealthCmd=pg_isready -U api || exit 1
HealthInterval=10s
HealthStartPeriod=30s
Notify=healthy

[Service]
Type=notify
Restart=on-failure

[Install]
WantedBy=default.target
```

## API Server

```ini
# ~/.config/containers/systemd/app-api.container
[Unit]
Description=Application API server
After=app-db.service
Requires=app-db.service

[Container]
ContainerName=app-api
# Replace this with your published API image.
Image=docker.io/myorg/api:latest
Network=appnet.network
Environment=DATABASE_URL=postgresql://api:secret@app-db:5432/appdb
Environment=PORT=3000
HealthCmd=curl -f http://localhost:3000/health || exit 1
HealthInterval=15s
HealthStartPeriod=20s
Notify=healthy

[Service]
Type=notify
Restart=on-failure

[Install]
WantedBy=default.target
```

## Reverse Proxy

```ini
# ~/.config/containers/systemd/app-proxy.container
[Unit]
Description=Application reverse proxy
After=app-api.service
Requires=app-api.service

[Container]
ContainerName=app-proxy
Image=docker.io/library/nginx:latest
Network=appnet.network
PublishPort=8080:80
Volume=%h/.config/nginx/app.conf:/etc/nginx/conf.d/default.conf:ro,Z

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

## Nginx Configuration

```bash
mkdir -p ~/.config/nginx
cat > ~/.config/nginx/app.conf << 'NGINXEOF'
server {
    listen 80;
    location / {
        proxy_pass http://app-api:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
NGINXEOF
```

## Deploy the Full Stack

```bash
# Reload systemd
systemctl --user daemon-reload

# Start the proxy (pulls in api and db via dependencies)
systemctl --user start app-proxy.service

# Check all services
systemctl --user status app-db.service app-api.service app-proxy.service

# Test the application
curl http://localhost:8080
```

## Stop the Full Stack

```bash
# Stop all services
systemctl --user stop app-proxy.service app-api.service app-db.service
```

## Summary

Multi-container applications in Quadlet use separate `.container` files connected by shared `.network` files. Use `After=` and `Requires=` for dependency ordering, `Notify=healthy` for readiness-based startup, and `ContainerName=` for DNS resolution between services. This gives you a Compose-like experience with full systemd integration.
