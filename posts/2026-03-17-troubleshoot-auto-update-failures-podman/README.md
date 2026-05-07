# How to Troubleshoot Auto-Update Failures in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Auto-Update, Troubleshooting

Description: Learn how to diagnose and fix common Podman auto-update failures including registry errors, health check issues, and rollback problems.

---

> Quickly diagnose auto-update failures by checking registry connectivity, image labels, health check configuration, and systemd service logs.

Auto-update failures can be caused by registry issues, incorrect configuration, failed health checks, or permission problems. This guide walks through the most common issues and their solutions.

---

## Step 1: Check the Auto-Update Service Status

```bash
# Check if the last auto-update run failed

systemctl --user status podman-auto-update.service

# View detailed logs
journalctl --user -u podman-auto-update.service --since "1 hour ago" --no-pager
```

## Step 2: Check the Timer

```bash
# Verify the timer is running
systemctl --user status podman-auto-update.timer

# Check when the last run was
systemctl --user list-timers podman-auto-update.timer
```

If the timer is not active:

```bash
# Re-enable the timer
systemctl --user enable --now podman-auto-update.timer
```

## Common Failures and Solutions

### Registry Connection Failed

```bash
# Test registry connectivity
podman pull docker.io/myorg/webapp:latest

# If this fails, check:
# - Network connectivity
# - Registry credentials
podman login docker.io
# - DNS resolution
```

### Container Not Listed in Auto-Update

```bash
# Check the auto-update label
podman inspect webapp --format '{{index .Config.Labels "io.containers.autoupdate"}}'

# If empty, add AutoUpdate to the Quadlet file:
# AutoUpdate=registry
```

### Image Tag Not Updating

```bash
# Verify the tag is mutable in the registry
podman pull docker.io/myorg/webapp:latest
podman inspect docker.io/myorg/webapp:latest --format '{{.Digest}}'

# Compare with the running container
podman inspect webapp --format '{{.ImageDigest}}'
```

If the digests are the same, there is no update available.

### Health Check Failure After Update

```bash
# Check the container health status
podman healthcheck run webapp

# View health check logs
podman inspect webapp --format '{{json .State.Healthcheck}}' | python3 -m json.tool

# Check the container logs for application errors
podman logs webapp --since "10 minutes ago"
```

### Rollback Occurred

```bash
# Check if a rollback happened
journalctl --user -u webapp.service | grep -i "rollback\|failed\|timeout"

# Check the current image (might be the old one after rollback)
podman inspect webapp --format '{{.ImageDigest}}'
```

### Permission Denied

```bash
# For rootless, check XDG_RUNTIME_DIR
echo $XDG_RUNTIME_DIR

# Check if linger is enabled
loginctl show-user $(whoami) --property=Linger

# Verify the user systemd manager is running
systemctl --user status
```

## Step 3: Run Auto-Update with Verbose Output

```bash
# Run manually to see detailed output
podman auto-update 2>&1

# Or use Podman debug logging
podman --log-level=debug auto-update 2>&1 | head -100
```

## Step 4: Verify the Container Configuration

```bash
# Check the generated systemd unit
systemctl --user cat webapp.service

# Verify the image reference is fully qualified
# Good: docker.io/myorg/webapp:latest
# Bad: webapp:latest (may not work with registry checks)
```

## Reset and Retry

```bash
# If a service is stuck in a failed state
systemctl --user reset-failed webapp.service

# Restart the service
systemctl --user restart webapp.service

# Re-run auto-update
podman auto-update
```

## Summary

Troubleshoot auto-update failures by checking the timer status, service logs, registry connectivity, and container labels. Common issues include missing auto-update labels, registry authentication failures, health check problems, and image tags that are not being updated. Use `podman auto-update --dry-run` and `journalctl` to diagnose issues, and `--log-level=debug` for verbose output.
