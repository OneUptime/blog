# How to Configure Restart Policies in Quadlet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Quadlet, Systemd, Restart Policies

Description: Learn how to configure restart policies for Podman containers managed by Quadlet using systemd service directives.

---

> Ensure your containerized services automatically recover from failures by configuring systemd restart policies in Quadlet container files.

Since Quadlet containers are managed by systemd, restart behavior is controlled through systemd's `[Service]` section rather than Podman's built-in restart policy. This gives you access to systemd's mature and flexible restart mechanisms.

---

## Basic Restart on Failure

```ini
# ~/.config/containers/systemd/webapp.container

[Unit]
Description=Web application with restart policy

[Container]
Image=docker.io/myorg/webapp:latest
PublishPort=8080:80

[Service]
# Restart the container if it fails
Restart=on-failure
# Wait 5 seconds before restarting
RestartSec=5

[Install]
WantedBy=default.target
```

## Always Restart

```ini
[Service]
# Always restart regardless of exit status
Restart=always
RestartSec=3
```

## Restart with Rate Limits

Configure systemd to limit restart attempts:

```ini
[Unit]
# Limit to 5 restart attempts within a 60 second window
StartLimitIntervalSec=60
StartLimitBurst=5

[Service]
Restart=on-failure
RestartSec=5
```

## Restart Options Explained

| Policy | Behavior |
|--------|----------|
| `no` | Never restart (default) |
| `on-failure` | Restart on non-zero exit code, signal, timeout, or watchdog |
| `on-success` | Restart only on clean exit |
| `on-abnormal` | Restart on signal, timeout, or watchdog |
| `always` | Restart after clean or failed exits |

## Production-Ready Restart Configuration

```ini
# ~/.config/containers/systemd/production-api.container
[Unit]
Description=Production API server
StartLimitIntervalSec=300
StartLimitBurst=5

[Container]
Image=docker.io/myorg/api:latest
PublishPort=8080:8080
HealthCmd=curl -f http://localhost:8080/health || exit 1
HealthInterval=30s
HealthRetries=3
HealthOnFailure=kill

[Service]
Restart=on-failure
RestartSec=10
# Give the container time to shut down gracefully
TimeoutStopSec=30

[Install]
WantedBy=default.target
```

## Watching Restart Behavior

```bash
# Reload and start
systemctl --user daemon-reload
systemctl --user start webapp.service

# Watch restart count
systemctl --user show webapp.service --property=NRestarts

# View recent restart logs
journalctl --user -u webapp.service --since "10 minutes ago"

# Check if the service hit its restart limit
systemctl --user status webapp.service
```

## Summary

Quadlet uses systemd restart policies instead of Podman's native restart mechanism. Configure `Restart` and `RestartSec` in the `[Service]` section, and `StartLimitIntervalSec` and `StartLimitBurst` in the `[Unit]` section, to control how and when failed containers are restarted. This approach gives you systemd's mature restart logic including rate limiting.
