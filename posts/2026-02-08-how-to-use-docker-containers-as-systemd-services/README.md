# How to Use Docker Containers as Systemd Services

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Systemd, Linux, Service Management, Production, DevOps

Description: Run Docker containers as native systemd services with proper lifecycle management, logging, and automatic startup on boot.

---

Most Docker tutorials show you `docker run -d` and call it a day. That works for development, but production servers need containers that start on boot, restart on failure, log to the system journal, and shut down cleanly when the server reboots. Systemd handles all of this. By wrapping your Docker containers in systemd unit files, you get the full power of Linux service management applied to your containerized applications.

This guide walks through creating, managing, and troubleshooting Docker containers as systemd services.

## Creating Your First Docker Systemd Service

A systemd unit file describes how to start, stop, and monitor a service. For Docker containers, the unit file wraps the `docker run` command.

Create a unit file for a web application:

```ini
# /etc/systemd/system/myapp.service
# Manages the main web application Docker container

[Unit]
Description=MyApp Web Application
Documentation=https://docs.myapp.com
After=docker.service
Requires=docker.service
Wants=network-online.target
After=network-online.target

[Service]
# Container lifecycle management
Type=simple
Restart=on-failure
RestartSec=15
StartLimitIntervalSec=300
StartLimitBurst=5

# Environment file for sensitive configuration
EnvironmentFile=/etc/myapp/env

# Clean up any leftover container from a previous run
ExecStartPre=-/usr/bin/docker stop myapp
ExecStartPre=-/usr/bin/docker rm myapp
ExecStartPre=/usr/bin/docker pull myapp:${VERSION}

# Run the container in the foreground
ExecStart=/usr/bin/docker run \
  --name myapp \
  --rm \
  -p 8080:8080 \
  --env-file /etc/myapp/env \
  --log-driver=journald \
  --log-opt tag=myapp \
  -v /data/myapp:/app/data \
  myapp:${VERSION}

# Stop the container gracefully
ExecStop=/usr/bin/docker stop -t 30 myapp

# How long to wait for the stop command
TimeoutStartSec=120
TimeoutStopSec=45

[Install]
WantedBy=multi-user.target
```

Create the environment file:

```bash
# /etc/myapp/env
# Configuration for the application container
VERSION=latest
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@db.example.com:5432/myapp
REDIS_URL=redis://cache.example.com:6379
SECRET_KEY=your-secret-key-here
```

Set proper permissions on the environment file:

```bash
# Restrict access to the environment file since it contains secrets
sudo chmod 600 /etc/myapp/env
sudo chown root:root /etc/myapp/env
```

Register and start the service:

```bash
# Reload systemd, enable on boot, and start the service
sudo systemctl daemon-reload
sudo systemctl enable myapp.service
sudo systemctl start myapp.service
```

## Understanding the Unit File Structure

Each section of the unit file serves a specific purpose.

The `[Unit]` section defines metadata and dependencies:

```ini
[Unit]
# Human-readable description shown in systemctl status
Description=MyApp Web Application

# Start ordering: this service starts AFTER docker.service
After=docker.service

# Hard dependency: if docker.service fails, this service fails too
Requires=docker.service

# Soft dependency: try to start network, but do not fail if it is slow
Wants=network-online.target
```

The `[Service]` section defines how the service runs:

```ini
[Service]
# "simple" means the ExecStart process IS the service
# Do not use "forking" - docker run without -d is not a forking process
Type=simple

# Restart on non-zero exit codes
Restart=on-failure

# Wait 15 seconds between restart attempts
RestartSec=15

# Allow at most 5 restarts within 300 seconds before giving up
StartLimitIntervalSec=300
StartLimitBurst=5
```

The `[Install]` section defines when the service starts during boot:

```ini
[Install]
# multi-user.target is the standard runlevel for servers
WantedBy=multi-user.target
```

## Managing Container Versions

Use environment variables in the unit file to make version updates straightforward:

```bash
# Update the version in the environment file
sudo sed -i 's/^VERSION=.*/VERSION=2.1.0/' /etc/myapp/env

# Restart the service to pick up the new version
# The ExecStartPre pulls the new image automatically
sudo systemctl restart myapp.service
```

Create a helper script for deployments:

```bash
#!/bin/bash
# deploy.sh - Deploy a new version of the application
# Usage: ./deploy.sh 2.1.0

VERSION=$1
SERVICE="myapp"

if [ -z "$VERSION" ]; then
    echo "Usage: $0 <version>"
    exit 1
fi

echo "Deploying $SERVICE version $VERSION..."

# Update the version
sudo sed -i "s/^VERSION=.*/VERSION=$VERSION/" /etc/$SERVICE/env

# Pull the image first to minimize downtime
sudo docker pull "$SERVICE:$VERSION"

# Restart the service
sudo systemctl restart "$SERVICE.service"

# Wait for it to start
sleep 10

# Check status
if sudo systemctl is-active --quiet "$SERVICE.service"; then
    echo "Deployment successful. $SERVICE is running version $VERSION."
else
    echo "ERROR: $SERVICE failed to start. Check logs with: journalctl -u $SERVICE.service"
    exit 1
fi
```

## Viewing Logs

With the `journald` log driver, container logs integrate with the system journal:

```bash
# Follow live logs
sudo journalctl -u myapp.service -f

# View the last 100 lines
sudo journalctl -u myapp.service -n 100

# View logs from the last boot
sudo journalctl -u myapp.service -b

# View logs between specific times
sudo journalctl -u myapp.service --since "2026-02-08 10:00" --until "2026-02-08 12:00"

# View only error-level messages
sudo journalctl -u myapp.service -p err

# Export logs to a file
sudo journalctl -u myapp.service --since today --no-pager > /tmp/myapp-logs.txt
```

## Multiple Related Services

For applications with multiple containers, create a target that groups them:

```ini
# /etc/systemd/system/myapp-stack.target
# Groups all MyApp-related services together

[Unit]
Description=MyApp Application Stack
Requires=myapp-redis.service myapp-postgres.service myapp.service
After=myapp-redis.service myapp-postgres.service myapp.service

[Install]
WantedBy=multi-user.target
```

Create each component service. Redis:

```ini
# /etc/systemd/system/myapp-redis.service
[Unit]
Description=MyApp Redis Cache
After=docker.service
Requires=docker.service

[Service]
Type=simple
Restart=always
RestartSec=10

ExecStartPre=-/usr/bin/docker rm -f myapp-redis
ExecStart=/usr/bin/docker run \
  --name myapp-redis \
  --rm \
  --log-driver=journald \
  --log-opt tag=myapp-redis \
  -v myapp-redis-data:/data \
  redis:7-alpine \
  redis-server --appendonly yes --maxmemory 512mb

ExecStop=/usr/bin/docker stop -t 10 myapp-redis
TimeoutStopSec=15

[Install]
WantedBy=myapp-stack.target
```

PostgreSQL:

```ini
# /etc/systemd/system/myapp-postgres.service
[Unit]
Description=MyApp PostgreSQL Database
After=docker.service
Requires=docker.service

[Service]
Type=simple
Restart=always
RestartSec=10

ExecStartPre=-/usr/bin/docker rm -f myapp-postgres
ExecStart=/usr/bin/docker run \
  --name myapp-postgres \
  --rm \
  --log-driver=journald \
  --log-opt tag=myapp-postgres \
  -v myapp-pg-data:/var/lib/postgresql/data \
  -e POSTGRES_PASSWORD=secretpass \
  -e POSTGRES_DB=myapp \
  postgres:16-alpine

ExecStop=/usr/bin/docker stop -t 30 myapp-postgres
TimeoutStopSec=35

[Install]
WantedBy=myapp-stack.target
```

The application service depends on both:

```ini
# /etc/systemd/system/myapp.service (updated)
[Unit]
Description=MyApp Web Application
After=docker.service myapp-redis.service myapp-postgres.service
Requires=docker.service myapp-redis.service myapp-postgres.service

[Service]
Type=simple
Restart=on-failure
RestartSec=15

ExecStartPre=-/usr/bin/docker rm -f myapp
# Wait for PostgreSQL to accept connections
ExecStartPre=/bin/bash -c 'for i in $(seq 1 30); do docker exec myapp-postgres pg_isready -U postgres && break; sleep 2; done'

ExecStart=/usr/bin/docker run \
  --name myapp \
  --rm \
  --log-driver=journald \
  --log-opt tag=myapp \
  --link myapp-redis:redis \
  --link myapp-postgres:postgres \
  -p 8080:8080 \
  -e DATABASE_URL=postgresql://postgres:secretpass@postgres:5432/myapp \
  -e REDIS_URL=redis://redis:6379 \
  myapp:latest

ExecStop=/usr/bin/docker stop -t 30 myapp
TimeoutStopSec=35

[Install]
WantedBy=myapp-stack.target
```

Manage the entire stack:

```bash
# Enable and start the full stack
sudo systemctl daemon-reload
sudo systemctl enable myapp-stack.target
sudo systemctl start myapp-stack.target

# Check status of all components
sudo systemctl status myapp-redis.service myapp-postgres.service myapp.service

# Stop the entire stack
sudo systemctl stop myapp-stack.target
```

## Health Check Integration

Add a health check to your service with a post-start verification:

```ini
[Service]
# ... other settings ...

ExecStart=/usr/bin/docker run \
  --name myapp \
  --rm \
  -p 8080:8080 \
  myapp:latest

# Post-start health verification
ExecStartPost=/bin/bash -c '\
  for i in $(seq 1 30); do \
    curl -sf http://localhost:8080/health && exit 0; \
    sleep 2; \
  done; \
  echo "Health check failed after 60 seconds"; \
  exit 1'
```

## Troubleshooting

When a service fails to start, use these commands to diagnose:

```bash
# See the most recent service events
sudo systemctl status myapp.service

# View detailed logs
sudo journalctl -u myapp.service -n 50 --no-pager

# Check if the service is enabled
sudo systemctl is-enabled myapp.service

# List all failed services
sudo systemctl list-units --state=failed

# Reset the failure counter if the service hit its restart limit
sudo systemctl reset-failed myapp.service
sudo systemctl start myapp.service

# Verify the unit file syntax
sudo systemd-analyze verify /etc/systemd/system/myapp.service
```

Common issues and solutions:

- **Service starts then immediately stops**: The Docker container is exiting. Check container logs with `journalctl -u myapp.service`.
- **Service fails with "start limit hit"**: Too many restarts in a short period. Use `reset-failed` and investigate the root cause.
- **Container name conflict**: The `ExecStartPre` cleanup commands did not run. Manually remove the container with `docker rm -f myapp`.
- **Permission denied on volumes**: The container user does not own the host directory. Fix ownership with `chown`.

Using systemd to manage Docker containers combines the portability of containers with the reliability of Linux service management. Your containers start on boot, restart on failure, log to the journal, and shut down gracefully, all controlled by the same tools you use for every other service on the system.
