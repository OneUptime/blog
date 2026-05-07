# How to Use sdnotify with Podman Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Systemd, sdnotify, Readiness

Description: Learn how to use sd_notify with Podman containers to signal service readiness and status to systemd.

---

> Use sd_notify integration in Podman containers to tell systemd exactly when your application is ready to serve requests, enabling accurate dependency management.

The sd_notify protocol allows a service to notify systemd about its startup status. Podman supports proxying sd_notify messages from inside a container to systemd, enabling containers to signal when they are actually ready.

---

## How sdnotify Works with Podman

Podman's `--sdnotify` option supports four modes:

- **container** - The container process sends sd_notify messages (Podman proxies them). This is the default.
- **conmon** - The conmon process sends READY when the container starts.
- **healthy** - Podman sends READY when the container's health check passes.
- **ignore** - No notification is sent.

In Quadlet `.container` files, the `Notify=` setting maps this behavior for systemd-managed containers: `Notify=true` passes the notification socket into the container, `Notify=healthy` waits for a passing health check, and the default `Notify=false` lets the container runtime report startup when it starts the container process.

## Using sdnotify=container

For applications that natively support sd_notify:

```ini
# ~/.config/containers/systemd/sd-app.container

[Unit]
Description=Application with sd_notify support

[Container]
Image=docker.io/myorg/sd-aware-app:latest
PublishPort=3000:3000
# Proxy sd_notify messages from the container
Notify=true

[Service]
Type=notify
Restart=on-failure
# Give the application time to send READY
TimeoutStartSec=90

[Install]
WantedBy=default.target
```

The application inside the container must send the `READY=1` notification:

```python
# Example Python application using systemd notification
import socket
import os

def notify_ready():
    sock_path = os.environ.get('NOTIFY_SOCKET')
    if sock_path:
        if sock_path[0] == '@':
            sock_path = '\0' + sock_path[1:]

        with socket.socket(socket.AF_UNIX, socket.SOCK_DGRAM) as sock:
            sock.connect(sock_path)
            sock.sendall(b'READY=1')

# Application initialization code here
# ...

# Signal that the application is ready
notify_ready()
```

## Using Health Check Based Notification

The simplest approach for most applications:

```ini
# ~/.config/containers/systemd/webapp.container
[Unit]
Description=Web app with health-based readiness

[Container]
Image=docker.io/myorg/webapp:latest
PublishPort=8080:80

# Health check that determines readiness
HealthCmd=curl -f http://localhost:80/ || exit 1
HealthInterval=5s
HealthStartPeriod=30s
HealthRetries=3

# Signal readiness when healthy
Notify=healthy

[Service]
Type=notify
Restart=on-failure

[Install]
WantedBy=default.target
```

## Status Updates

Applications can also send status updates:

```python
import socket
import os

def notify(message):
    sock_path = os.environ.get('NOTIFY_SOCKET')
    if sock_path:
        if sock_path[0] == '@':
            sock_path = '\0' + sock_path[1:]

        with socket.socket(socket.AF_UNIX, socket.SOCK_DGRAM) as sock:
            sock.connect(sock_path)
            sock.sendall(message)

# Send status messages
notify(b'STATUS=Accepting connections on port 3000')

# Send watchdog keepalive
notify(b'WATCHDOG=1')
```

## Using the Quadlet Default

Without explicit Notify configuration in a Quadlet `.container` file, the container runtime handles startup notification:

```ini
[Container]
Image=docker.io/myorg/myapp:latest
# No Notify directive - the runtime reports startup when the container process starts

[Service]
Type=notify
Restart=on-failure
```

This signals ready as soon as the container process starts, which may be before the application is actually accepting connections.

## Verifying Notification

```bash
# Start the service and watch the status
systemctl --user start sd-app.service

# Check if it is in "activating" (waiting for READY) or "active" (READY received)
systemctl --user status sd-app.service

# View notification-related journal entries
journalctl --user -u sd-app.service | grep -i notify
```

## Summary

Podman's sdnotify support lets containers signal their readiness to systemd. Use `Notify=healthy` with health checks for the simplest approach, or `Notify=true` for applications that natively support sd_notify. This ensures dependent services wait for actual readiness rather than just process startup, improving reliability of multi-service deployments.
