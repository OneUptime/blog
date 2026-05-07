# How to Migrate from Docker Compose to Quadlet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Quadlet, Docker Compose, Migration, Systemd

Description: A practical guide to converting Docker Compose files into Podman Quadlet unit files for native systemd integration, including networks, volumes, dependencies, and service management.

---

> Migrating from Docker Compose to Quadlet transforms your container definitions into native systemd services, giving you dependency management, logging, and boot integration through the system's init system.

Quadlet is Podman's mechanism for defining containers as systemd services. Instead of managing containers through a compose file and a separate daemon, Quadlet generates systemd unit files from simple INI-format definitions. This migration gives you native system service management while maintaining the multi-container architecture of your existing compose setup.

This guide walks through converting a Docker Compose application to Quadlet step by step.

---

## How Quadlet Works

Quadlet reads `.container`, `.network`, `.volume`, and `.pod` files from specific directories and generates systemd unit files. For user services, these files go in `~/.config/containers/systemd/`. For system services, they go in `/etc/containers/systemd/`.

After placing the files, run `systemctl --user daemon-reload` for user services, or `systemctl daemon-reload` for system services, to generate the units. Then manage them with standard systemctl commands.

## Starting Docker Compose Application

Here is a typical Docker Compose application to migrate:

```yaml
# docker-compose.yml

services:
  web:
    image: nginx:stable-alpine
    ports:
      - "8080:80"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - api
    restart: always

  api:
    image: my-api:latest
    environment:
      - DATABASE_URL=postgresql://appuser:apppass@db:5432/appdb
      - REDIS_URL=redis://cache:6379
      - LOG_LEVEL=info
    volumes:
      - uploads:/app/uploads
    depends_on:
      - db
      - cache
    restart: always

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=appdb
      - POSTGRES_USER=appuser
      - POSTGRES_PASSWORD=apppass
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: always

  cache:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data
    restart: always

networks:
  default:
    name: app-network

volumes:
  uploads:
  pgdata:
  redis-data:
```

## Step 1: Create the Network File

Convert the compose network to a Quadlet network file:

```ini
# ~/.config/containers/systemd/app.network
[Network]
NetworkName=app-network
Driver=bridge
```

## Step 2: Create Volume Files

Convert named volumes:

```ini
# ~/.config/containers/systemd/pgdata.volume
[Volume]
VolumeName=pgdata

# ~/.config/containers/systemd/uploads.volume
[Volume]
VolumeName=uploads

# ~/.config/containers/systemd/redis-data.volume
[Volume]
VolumeName=redis-data
```

## Step 3: Convert Each Service

Convert the database service:

```ini
# ~/.config/containers/systemd/db.container
[Unit]
Description=PostgreSQL Database

[Container]
Image=docker.io/library/postgres:16-alpine
ContainerName=db
Network=app.network
Environment=POSTGRES_DB=appdb
Environment=POSTGRES_USER=appuser
Environment=POSTGRES_PASSWORD=apppass
Volume=pgdata.volume:/var/lib/postgresql/data:Z
AutoUpdate=registry

[Service]
Restart=always
TimeoutStartSec=60

[Install]
WantedBy=default.target
```

Convert the cache service:

```ini
# ~/.config/containers/systemd/cache.container
[Unit]
Description=Redis Cache

[Container]
Image=docker.io/library/redis:7-alpine
ContainerName=cache
Network=app.network
Volume=redis-data.volume:/data:Z
Exec=redis-server --appendonly yes
AutoUpdate=registry

[Service]
Restart=always
TimeoutStartSec=30

[Install]
WantedBy=default.target
```

Convert the API service with dependencies:

```ini
# ~/.config/containers/systemd/api.container
[Unit]
Description=Application API
Requires=db.service cache.service
After=db.service cache.service

[Container]
Image=my-api:latest
ContainerName=api
Network=app.network
Environment=DATABASE_URL=postgresql://appuser:apppass@db:5432/appdb
Environment=REDIS_URL=redis://cache:6379
Environment=LOG_LEVEL=info
Volume=uploads.volume:/app/uploads:Z
AutoUpdate=local

[Service]
Restart=always
TimeoutStartSec=30

[Install]
WantedBy=default.target
```

Convert the web server:

```ini
# ~/.config/containers/systemd/web.container
[Unit]
Description=Nginx Web Server
Requires=api.service
After=api.service

[Container]
Image=docker.io/library/nginx:stable-alpine
ContainerName=web
Network=app.network
PublishPort=8080:80
Volume=%h/myapp/nginx.conf:/etc/nginx/conf.d/default.conf:ro,Z
AutoUpdate=registry

[Service]
Restart=always
TimeoutStartSec=30

[Install]
WantedBy=default.target
```

## Step 4: Activate the Services

```bash
# Reload systemd to generate units from Quadlet files
systemctl --user daemon-reload

# Start all services
systemctl --user start db cache api web

# Enable for automatic start with the user service manager
systemctl --user enable db cache api web

# Start user services at boot, even before the user logs in
loginctl enable-linger "$USER"

# Verify status
systemctl --user status db cache api web
```

## Conversion Reference Table

Here is a mapping of common Docker Compose directives to Quadlet equivalents:

| Docker Compose | Quadlet |
|---|---|
| `image:` | `Image=` |
| `container_name:` | `ContainerName=` |
| `ports:` | `PublishPort=` |
| `volumes:` (named) | `Volume=name.volume:/path:Z` |
| `volumes:` (bind) | `Volume=/host/path:/container/path:Z` |
| `environment:` | `Environment=KEY=VALUE` |
| `env_file:` | `EnvironmentFile=/path/to/.env` |
| `networks:` | `Network=name.network` |
| `command:` | `Exec=` |
| `depends_on:` | `Requires=` + `After=` in `[Unit]` |
| `restart: always` | `Restart=always` in `[Service]` |
| `restart: unless-stopped` | `Restart=always` in `[Service]` |
| `user:` | `User=` or `UserNS=` |
| `cap_drop:` | `DropCapability=` |
| `cap_add:` | `AddCapability=` |
| `read_only:` | `ReadOnly=true` |
| `healthcheck:` | `HealthCmd=` + `HealthInterval=` |

## Step 5: Environment Files

If your compose file uses env_file, convert it:

```yaml
# Docker Compose
services:
  api:
    env_file:
      - .env
```

```ini
# Quadlet
[Container]
EnvironmentFile=%h/myapp/.env
```

The `%h` specifier expands to the user's home directory.

## Step 6: Health Checks

Convert Docker Compose health checks:

```yaml
# Docker Compose
services:
  db:
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U appuser"]
      interval: 10s
      timeout: 5s
      retries: 5
```

```ini
# Quadlet
[Container]
HealthCmd=pg_isready -U appuser
HealthInterval=10s
HealthTimeout=5s
HealthRetries=5
```

## Managing the Migrated Application

After migration, use systemctl for all management:

```bash
# View logs
journalctl --user -u api -f

# Restart a service
systemctl --user restart api

# Stop everything
systemctl --user stop web api cache db

# Check dependencies
systemctl --user list-dependencies web

# View generated unit file
systemctl --user cat web
```

## Migration Script

Automate the file creation:

```bash
#!/bin/bash
# generate-quadlet.sh

QUADLET_DIR="${HOME}/.config/containers/systemd"
mkdir -p "${QUADLET_DIR}"

# Network
cat > "${QUADLET_DIR}/app.network" << 'EOF'
[Network]
NetworkName=app-network
Driver=bridge
EOF

# Volumes
cat > "${QUADLET_DIR}/pgdata.volume" << 'EOF'
[Volume]
VolumeName=pgdata
EOF

cat > "${QUADLET_DIR}/uploads.volume" << 'EOF'
[Volume]
VolumeName=uploads
EOF

cat > "${QUADLET_DIR}/redis-data.volume" << 'EOF'
[Volume]
VolumeName=redis-data
EOF

# Database
cat > "${QUADLET_DIR}/db.container" << 'EOF'
[Unit]
Description=PostgreSQL Database

[Container]
Image=docker.io/library/postgres:16-alpine
ContainerName=db
Network=app.network
Environment=POSTGRES_DB=appdb
Environment=POSTGRES_USER=appuser
Environment=POSTGRES_PASSWORD=apppass
Volume=pgdata.volume:/var/lib/postgresql/data:Z
AutoUpdate=registry

[Service]
Restart=always
TimeoutStartSec=60

[Install]
WantedBy=default.target
EOF

# Cache
cat > "${QUADLET_DIR}/cache.container" << 'EOF'
[Unit]
Description=Redis Cache

[Container]
Image=docker.io/library/redis:7-alpine
ContainerName=cache
Network=app.network
Volume=redis-data.volume:/data:Z
Exec=redis-server --appendonly yes
AutoUpdate=registry

[Service]
Restart=always
TimeoutStartSec=30

[Install]
WantedBy=default.target
EOF

# API
cat > "${QUADLET_DIR}/api.container" << 'EOF'
[Unit]
Description=Application API
Requires=db.service cache.service
After=db.service cache.service

[Container]
Image=my-api:latest
ContainerName=api
Network=app.network
Environment=DATABASE_URL=postgresql://appuser:apppass@db:5432/appdb
Environment=REDIS_URL=redis://cache:6379
Environment=LOG_LEVEL=info
Volume=uploads.volume:/app/uploads:Z
AutoUpdate=local

[Service]
Restart=always
TimeoutStartSec=30

[Install]
WantedBy=default.target
EOF

# Web
cat > "${QUADLET_DIR}/web.container" << 'EOF'
[Unit]
Description=Nginx Web Server
Requires=api.service
After=api.service

[Container]
Image=docker.io/library/nginx:stable-alpine
ContainerName=web
Network=app.network
PublishPort=8080:80
Volume=%h/myapp/nginx.conf:/etc/nginx/conf.d/default.conf:ro,Z
AutoUpdate=registry

[Service]
Restart=always
TimeoutStartSec=30

[Install]
WantedBy=default.target
EOF

echo "Quadlet files created in ${QUADLET_DIR}"
echo "Run: systemctl --user daemon-reload"
echo "Then: systemctl --user start db cache api web"
```

## Rollback Plan

If the migration encounters issues, your Docker Compose setup can be brought back immediately:

```bash
# Stop Quadlet services
systemctl --user stop web api cache db

# Start Docker Compose services
docker compose up -d
```

Keep your Docker Compose file until the Quadlet migration is fully validated.

## Conclusion

Migrating from Docker Compose to Quadlet converts your container definitions into native systemd services. The process involves creating `.container`, `.network`, and `.volume` files that map to your compose configuration, with dependency management handled through systemd's `Requires` and `After` directives. The result is deeper system integration, native logging through journald, and automatic boot management without an additional daemon. Plan the migration by mapping each compose directive to its Quadlet equivalent and testing services incrementally.
