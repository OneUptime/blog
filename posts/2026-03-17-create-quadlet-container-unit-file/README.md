# How to Create a Quadlet Container Unit File

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Quadlet, Systemd, Unit Files

Description: Learn how to create a Quadlet .container unit file to run Podman containers as systemd services with automatic startup and restart.

---

> Quadlet container unit files let you define Podman containers as systemd services using a simple INI-style syntax.

Quadlet is Podman's native integration with systemd. Instead of writing complex systemd unit files manually, you write a simple `.container` file and Quadlet generates the full systemd service. This gives you automatic container startup with systemd, restart on failure, and standard systemd management.

---

## Basic Container Unit File

```ini
# ~/.config/containers/systemd/webapp.container

[Container]
Image=docker.io/library/nginx:alpine
PublishPort=8080:80

[Service]
Restart=always

[Install]
WantedBy=default.target
```

```bash
# Reload systemd to pick up the new unit
systemctl --user daemon-reload

# Start the container service
systemctl --user start webapp

# Check the status
systemctl --user status webapp

# Enable auto-start on login
systemctl --user enable webapp
```

## Container with Environment Variables

```ini
# ~/.config/containers/systemd/postgres.container
[Container]
Image=docker.io/library/postgres:16-alpine
Environment=POSTGRES_PASSWORD=secret
Environment=POSTGRES_DB=myapp
PublishPort=5432:5432
Volume=pgdata:/var/lib/postgresql/data

[Service]
Restart=always
TimeoutStartSec=60

[Install]
WantedBy=default.target
```

## Container with Volume Mounts

```ini
# ~/.config/containers/systemd/app.container
[Container]
Image=docker.io/library/node:20-alpine
Volume=/home/user/project:/app:Z
PublishPort=3000:3000
WorkingDir=/app
Exec=node server.js

[Service]
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
```

## Container with Network

```ini
# ~/.config/containers/systemd/api.container
[Container]
Image=docker.io/library/python:3.12-slim
Network=bridge
PublishPort=5000:5000
Exec=python -m http.server 5000

[Service]
Restart=always

[Install]
WantedBy=default.target
```

## Health Check Configuration

```ini
# ~/.config/containers/systemd/redis.container
[Container]
Image=docker.io/library/redis:7-alpine
PublishPort=6379:6379
HealthCmd=redis-cli ping
HealthInterval=10s
HealthTimeout=5s
HealthRetries=3

[Service]
Restart=always

[Install]
WantedBy=default.target
```

Resource Limits

```ini
# ~/.config/containers/systemd/limited-app.container
[Container]
Image=docker.io/library/python:3.12-slim
PodmanArgs=--cpus=1.0 --memory=512m
Exec=python app.py

[Service]
Restart=always

[Install]
WantedBy=default.target
```

## Managing the Container Service

```bash
# Start the container
systemctl --user start webapp

# Stop the container
systemctl --user stop webapp

# Restart the container
systemctl --user restart webapp

# View logs
journalctl --user -u webapp -f

# Check if enabled for auto-start
systemctl --user is-enabled webapp
```

## Verifying Quadlet Generation

```bash
# Preview the generated systemd unit without installing
/usr/lib/systemd/system-generators/podman-system-generator --user --dryrun

# Check for errors in the unit file
systemctl --user status webapp
journalctl --user -u webapp --no-pager
```

## Summary

Quadlet `.container` files define Podman containers as systemd services using a simple INI format. Place them in `~/.config/containers/systemd/` for user services, run `daemon-reload`, and manage them with standard `systemctl` commands. Quadlet handles the translation to full systemd unit files automatically.
