# How to Run a Database with Quadlet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Quadlet, PostgreSQL, Database

Description: Learn how to deploy and manage a PostgreSQL database as a systemd service using Podman Quadlet with persistent storage.

---

> Run a production-grade PostgreSQL database managed by systemd through Quadlet with persistent volumes, health checks, and automatic restarts.

Databases require persistent storage, reliable startup, and health monitoring. Quadlet provides all of these through systemd integration, making it straightforward to run databases as system services.

---

## Create the Volume File

```ini
# ~/.config/containers/systemd/pgdata.volume

[Volume]
# Podman will create and manage this named volume
```

## Create the Database Container File

```ini
# ~/.config/containers/systemd/postgres.container
[Unit]
Description=PostgreSQL database server

[Container]
Image=docker.io/library/postgres:16
ContainerName=postgres
PublishPort=5432:5432

# Persistent data volume
Volume=pgdata.volume:/var/lib/postgresql/data

# Database configuration
Environment=POSTGRES_USER=appuser
Environment=POSTGRES_PASSWORD=secretpassword
Environment=POSTGRES_DB=appdb
Environment=PGDATA=/var/lib/postgresql/data/pgdata

# Health check
HealthCmd=pg_isready -U appuser -d appdb || exit 1
HealthInterval=15s
HealthTimeout=5s
HealthRetries=5
HealthStartPeriod=30s

# Readiness notification
Notify=healthy

[Service]
Type=notify
Restart=on-failure
RestartSec=10
TimeoutStartSec=120
TimeoutStopSec=30

[Install]
WantedBy=default.target
```

## Deploy and Start

```bash
# Create the Quadlet directory
mkdir -p ~/.config/containers/systemd/

# Reload systemd
systemctl --user daemon-reload

# Start the database
systemctl --user start postgres.service

# Enable for future user sessions
systemctl --user enable postgres.service

# Check status (will show "activating" until health check passes)
systemctl --user status postgres.service
```

## Verify the Database

```bash
# Wait for the service to become active
systemctl --user is-active postgres.service

# Connect to the database
podman exec -it postgres psql -U appuser -d appdb

# Or connect from the host
psql -h localhost -p 5432 -U appuser -d appdb
```

## Using Secrets for Credentials

For production, use Podman secrets instead of environment variables:

```bash
# Create secrets
echo -n "appuser" | podman secret create pg_user -
echo -n "secretpassword" | podman secret create pg_password -
```

```ini
[Container]
Image=docker.io/library/postgres:16
Volume=pgdata.volume:/var/lib/postgresql/data
Secret=pg_user,type=env,target=POSTGRES_USER
Secret=pg_password,type=env,target=POSTGRES_PASSWORD
Environment=POSTGRES_DB=appdb
```

## Backup the Database

```bash
# Create a backup
podman exec postgres pg_dump -U appuser appdb > backup.sql

# Verify the backup
head -20 backup.sql
```

## Summary

Quadlet is well suited for running databases like PostgreSQL. Use named volumes for persistent storage, health checks for readiness detection, and Notify=healthy so dependent services wait until the database is ready. For production deployments, use Podman secrets to manage credentials securely.
