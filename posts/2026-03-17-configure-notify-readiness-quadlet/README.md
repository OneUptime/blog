# How to Configure Notify and Readiness in Quadlet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Quadlet, Systemd, Readiness, sdnotify

Description: Learn how to configure systemd readiness notifications in Quadlet so dependent services start only after a container is truly ready.

---

> Use the Notify directive in Quadlet to tell systemd when your container is actually ready to serve requests, not just when the process has started.

By default, systemd considers a service started as soon as the process launches. For containers that need time to initialize, you can use readiness notifications so that dependent services wait until the container is truly ready.

---

## Understanding Notify Modes

Quadlet supports these Notify values:

- **false** (default) - No readiness notification; service is ready when the process starts.
- **healthy** - Service is ready when the container's health check first passes.
- **true** - The container application sends sd_notify readiness messages directly.

## Using Health Check Readiness

The simplest approach is to use the `healthy` mode with a health check:

```ini
# ~/.config/containers/systemd/api.container

[Unit]
Description=API server with health-based readiness

[Container]
Image=docker.io/myorg/api:latest
PublishPort=3000:3000

# Define a health check
HealthCmd=curl -f http://localhost:3000/health || exit 1
HealthInterval=5s
HealthTimeout=3s
HealthRetries=3
HealthStartPeriod=30s

# systemd considers the service ready when the health check passes
Notify=healthy

[Service]
Type=notify
Restart=on-failure

[Install]
WantedBy=default.target
```

## Using sd_notify from the Container

For applications that support systemd notification:

```ini
# ~/.config/containers/systemd/app.container
[Unit]
Description=Application with native sd_notify support

[Container]
Image=docker.io/myorg/sd-aware-app:latest
# Forward sd_notify messages from the container to systemd
Notify=true

[Service]
Type=notify
Restart=on-failure
# Give the application time to start
TimeoutStartSec=90

[Install]
WantedBy=default.target
```

## Dependent Services Waiting for Readiness

When you set up readiness notification, dependent services will wait:

```ini
# ~/.config/containers/systemd/mynet.network
[Network]
```

```ini
# ~/.config/containers/systemd/database.container
[Unit]
Description=PostgreSQL database

[Container]
Image=docker.io/library/postgres:16
Volume=pgdata:/var/lib/postgresql/data
Environment=POSTGRES_PASSWORD=secret
Network=mynet.network
NetworkAlias=database
HealthCmd=pg_isready -U postgres || exit 1
HealthInterval=5s
HealthStartPeriod=30s
Notify=healthy

[Service]
Type=notify
Restart=on-failure

[Install]
WantedBy=default.target
```

```ini
# ~/.config/containers/systemd/webapp.container
[Unit]
Description=Web app that depends on database
# This will wait for the database health check to pass
After=database.service
Requires=database.service

[Container]
Image=docker.io/myorg/webapp:latest
Network=mynet.network
Environment=DATABASE_URL=postgresql://postgres:secret@database:5432/postgres
PublishPort=8080:80

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

## Verify Readiness Behavior

```bash
# Reload systemd
systemctl --user daemon-reload

# Start the service and watch readiness
systemctl --user start api.service

# Check if the service is in the "activating" state (waiting for readiness)
systemctl --user status api.service

# View notification messages in the journal
journalctl --user -u api.service | grep -i notify
```

## Summary

The `Notify` directive in Quadlet controls when systemd considers a container service ready. Use `healthy` to tie readiness to health check results, or `true` for applications that send sd_notify messages directly. This ensures dependent services start only after their dependencies are genuinely ready to accept connections.
