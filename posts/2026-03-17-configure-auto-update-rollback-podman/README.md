# How to Configure Auto-Update Rollback in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Auto-Update, Rollback, Health Check

Description: Learn how to configure Podman auto-update with rollback so containers automatically revert to the previous image if the new one fails health checks.

---

> Protect your services from broken updates by configuring auto-update rollback, which automatically reverts to the previous image when a new image fails health checks.

Auto-update is powerful, but deploying a broken image can take down your service. Podman supports rollback by combining auto-update with health checks and sd_notify. If the updated container fails to become healthy, Podman restores the previous image.

---

## How Rollback Works

1. Auto-update detects a new image and pulls it.
2. The container is restarted with the new image.
3. Podman waits for the container to report readiness (via health check or sd_notify).
4. If readiness is not achieved within the timeout, Podman:
   - Stops the new container
   - Restores the previous image
   - Restarts with the old image

## Configure Rollback-Enabled Auto-Update

```ini
# ~/.config/containers/systemd/webapp.container

[Unit]
Description=Web app with auto-update rollback

[Container]
Image=docker.io/myorg/webapp:latest
ContainerName=webapp
PublishPort=8080:80

# Enable auto-update
AutoUpdate=registry

# Health check for rollback detection
HealthCmd=curl -f http://localhost:80/ || exit 1
HealthInterval=10s
HealthTimeout=5s
HealthRetries=3
HealthStartPeriod=30s

# Tie readiness to health check
Notify=healthy

[Service]
Type=notify
Restart=on-failure
# Time to wait for the container to become ready
TimeoutStartSec=90

[Install]
WantedBy=default.target
```

## Key Configuration for Rollback

The rollback mechanism requires:

1. **AutoUpdate=registry** (or local) - Enables auto-update
2. **HealthCmd** - Defines how to check if the container is working
3. **Notify=healthy** - Ties systemd readiness to the health check
4. **Type=notify** - Tells systemd to wait for readiness notification

## Testing Rollback

Simulate a failed update:

```bash
# Check current image
podman inspect webapp --format '{{.ImageDigest}}'

# Run auto-update (if a bad image is pushed to the registry)
podman auto-update

# If the new image fails health checks, Podman rolls back
# Check that the old image is restored
podman inspect webapp --format '{{.ImageDigest}}'

# View the rollback in logs
journalctl --user -u podman-auto-update.service --since "10 minutes ago"
```

## Adjusting Rollback Timing

The `TimeoutStartSec` in the `[Service]` section controls how long Podman waits before deciding the update failed:

```ini
[Service]
Type=notify
# Wait up to 2 minutes for the new image to become healthy
TimeoutStartSec=120
```

Set this long enough for your application to initialize but short enough to detect failures quickly.

## Monitoring Rollback Events

```bash
# Check for rollback events in logs
journalctl --user -u webapp.service | grep -i "rollback\|revert\|failed"

# Check auto-update service logs
journalctl --user -u podman-auto-update.service --since "1 day ago"
```

## Summary

Auto-update rollback protects your services from broken images. Configure health checks with `HealthCmd`, tie readiness to health with `Notify=healthy`, and set `Type=notify` with an appropriate `TimeoutStartSec`. If the updated container fails to become healthy, Podman automatically restores the previous working image.
