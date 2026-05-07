# How to Choose Between Quadlet and Docker Compose for systemd

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Quadlet, Docker Compose, Systemd, Container

Description: Compare Quadlet and Docker Compose for running containers as systemd services, covering their configuration models, dependency management, and production deployment characteristics.

---

> Quadlet turns container definitions into native systemd units, while Docker Compose manages containers through the Docker Engine daemon, leading to different operational models for production deployments.

Running containers as system services is essential for production deployments. Two popular approaches are Podman's Quadlet, which generates systemd unit files from container definitions, and Docker Compose, which manages multi-container applications through the Docker daemon. Each approach integrates differently with your system's service manager.

This guide compares both tools to help you choose the right approach for your production container deployments.

---

## What is Quadlet

Quadlet is a systemd generator that reads files such as `.container`, `.pod`, `.network`, `.volume`, `.image`, `.build`, `.kube`, and `.artifact` files and produces systemd service units. Containers managed by Quadlet are true systemd services, integrating with standard systemd features like dependency ordering, timers, resource controls, and journald.

```ini
# ~/.config/containers/systemd/web.container

[Container]
Image=docker.io/library/nginx:stable
PublishPort=8080:80
Volume=web-data:/usr/share/nginx/html:ro,Z

[Service]
Restart=always
TimeoutStartSec=30

[Install]
WantedBy=default.target
```

Activate and manage with standard systemctl commands:

```bash
systemctl --user daemon-reload
systemctl --user start web
systemctl --user status web
```

## What Docker Compose Provides

Docker Compose manages containers through the Docker daemon using a YAML configuration:

```yaml
# docker-compose.yml
services:
  web:
    image: nginx:stable
    ports:
      - "8080:80"
    volumes:
      - web-data:/usr/share/nginx/html:ro
    restart: always

volumes:
  web-data:
```

```bash
docker compose up -d
docker compose ps
docker compose logs web
```

## Configuration Model

Quadlet uses INI-format files that mirror systemd unit syntax:

```ini
# web.container
[Container]
Image=docker.io/library/nginx:stable
PublishPort=8080:80
Environment=NGINX_HOST=example.com
Volume=web-data:/usr/share/nginx/html:Z
Network=app.network

[Service]
Restart=always
RestartSec=10
TimeoutStartSec=30
TimeoutStopSec=30

[Install]
WantedBy=default.target
```

Docker Compose uses YAML with its own specification:

```yaml
services:
  web:
    image: nginx:stable
    ports:
      - "8080:80"
    environment:
      NGINX_HOST: example.com
    volumes:
      - web-data:/usr/share/nginx/html
    networks:
      - app
    restart: always
    stop_grace_period: 30s

networks:
  app:

volumes:
  web-data:
```

## Dependency Management

Quadlet uses systemd's native dependency system:

```ini
# db.container
[Container]
Image=docker.io/library/postgres:16
Volume=pgdata:/var/lib/postgresql/data:Z
Environment=POSTGRES_PASSWORD=secret

[Service]
Restart=always

[Install]
WantedBy=default.target
```

```ini
# api.container
[Container]
Image=my-api:latest
Environment=DATABASE_URL=postgresql://user:pass@db:5432/app
Network=app.network

[Unit]
Requires=db.container
After=db.container

[Service]
Restart=always

[Install]
WantedBy=default.target
```

Docker Compose uses `depends_on`:

```yaml
services:
  api:
    image: my-api:latest
    depends_on:
      db:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://user:pass@db:5432/app

  db:
    image: postgres:16
    healthcheck:
      test: ["CMD-SHELL", "pg_isready"]
      interval: 10s
      timeout: 5s
      retries: 5
```

Docker Compose's health check-based dependencies are more sophisticated than systemd's unit ordering, which only ensures the service process has started.

## Service Management

Quadlet services are managed with systemctl:

```bash
# Start/stop individual services
systemctl --user start web
systemctl --user stop db
systemctl --user restart api

# View logs through journald
journalctl --user -u web -f

# Check status
systemctl --user status web

# Re-read Quadlet files and apply their [Install] sections
systemctl --user daemon-reload
```

Docker Compose commonly manages the application as a project, while still allowing service-specific commands:

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# Restart specific service
docker compose restart web

# View logs
docker compose logs -f web
```

## Boot Integration

Quadlet services integrate natively with systemd boot ordering:

```bash
# User services start with the user service manager when [Install] has WantedBy=default.target
systemctl --user daemon-reload

# System services start at boot
# Place files in /etc/containers/systemd/ for root containers
sudo systemctl daemon-reload
```

Docker Compose requires a separate systemd unit or Docker's restart policies:

```ini
# Custom systemd unit for Docker Compose
[Unit]
Description=My Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/myapp
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down

[Install]
WantedBy=multi-user.target
```

## Multi-Container Applications

Quadlet defines each container as a separate unit file:

```ini
# app.network
[Network]
NetworkName=app

# db.container
[Container]
Image=postgres:16
Network=app.network
Volume=pgdata:/var/lib/postgresql/data:Z
Environment=POSTGRES_PASSWORD=secret
[Service]
Restart=always
[Install]
WantedBy=default.target

# api.container
[Container]
Image=my-api:latest
Network=app.network
PublishPort=3000:3000
[Unit]
After=db.container
[Service]
Restart=always
[Install]
WantedBy=default.target

# web.container
[Container]
Image=nginx:stable
Network=app.network
PublishPort=8080:80
[Unit]
After=api.container
[Service]
Restart=always
[Install]
WantedBy=default.target
```

Docker Compose defines everything in one file, which is more concise for multi-service applications.

## Auto-Updates

Quadlet supports automatic container image updates:

```ini
[Container]
Image=docker.io/library/nginx:stable
AutoUpdate=registry
```

```bash
# Check for updates
podman auto-update --dry-run

# Apply updates
podman auto-update

# Enable automatic update timer
systemctl --user enable --now podman-auto-update.timer
```

Docker Compose does not have built-in auto-update support. You need external tools like Watchtower.

## When to Choose Quadlet

- You want containers to be true systemd services
- You need fine-grained systemd dependency ordering and resource controls
- You are deploying on a single server and want native system integration
- You need automatic container updates
- Your deployment pipeline targets systemd-based systems
- You want journald integration for centralized logging

## When to Choose Docker Compose

- You manage multi-container applications and want them defined in a single file
- You need health check-based dependency management
- You want to scale services horizontally with a single command
- Your team is already familiar with Docker Compose
- You develop on macOS or Windows with Docker Desktop
- You need profile-based service selection for different environments

## Conclusion

Quadlet and Docker Compose serve different operational philosophies. Quadlet makes containers first-class systemd citizens with native dependency management, logging, and boot integration. Docker Compose provides a higher-level abstraction for multi-container applications with richer dependency management and a single-file configuration model. For production single-server deployments where system integration matters, Quadlet is the more natural fit. For development workflows and multi-container applications, Docker Compose remains more convenient.
