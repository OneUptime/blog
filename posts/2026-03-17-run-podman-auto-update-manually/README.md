# How to Run podman auto-update Manually

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Auto-Update, Maintenance

Description: Learn how to manually run podman auto-update to check for and apply container image updates on demand.

---

> Run podman auto-update manually to check for container image updates and apply them immediately without waiting for the systemd timer.

While the auto-update timer handles scheduled checks, you can run `podman auto-update` manually whenever you want to check for updates immediately. This is useful after pushing a new image or during maintenance windows.

---

## Dry Run: Check Without Updating

Preview which containers have updates available:

```bash
# Check for available updates without applying them

podman auto-update --dry-run
```

Example output:

```text
UNIT                    CONTAINER       IMAGE                              POLICY      UPDATED
webapp.service          abc123def456 (webapp)    docker.io/myorg/webapp:latest      registry    pending
api.service             def456abc789 (api)       docker.io/myorg/api:latest         registry    false
database.service        789abc123def (database)  docker.io/library/postgres:16      registry    false
```

- **pending** means an update is available.
- **false** means the container is up to date.

## Apply Updates

Run auto-update to pull new images and restart containers:

```bash
# Apply all available updates
podman auto-update
```

Example output:

```text
UNIT                    CONTAINER       IMAGE                              POLICY      UPDATED
webapp.service          abc123def456 (webapp)    docker.io/myorg/webapp:latest      registry    true
api.service             def456abc789 (api)       docker.io/myorg/api:latest         registry    false
database.service        789abc123def (database)  docker.io/library/postgres:16      registry    false
```

- **true** means the container was updated and restarted.

## Format Output

Get output in different formats for scripting:

```bash
# JSON output
podman auto-update --format json

# Custom format
podman auto-update --dry-run --format "{{.Unit}} {{.Image}} {{.Updated}}"
```

## Auto-Update Specific Containers

Auto-update only runs on containers with the auto-update label. To limit which containers get checked, only label the ones you want:

```bash
# Only containers with this label are checked
podman inspect webapp --format '{{index .Config.Labels "io.containers.autoupdate"}}'
```

## Scripting Auto-Update

```bash
#!/bin/bash
# manual-update.sh - Check and apply updates with logging

echo "=== Checking for container updates ==="
echo "Date: $(date)"

# Dry run first
echo "Available updates:"
podman auto-update --dry-run

# Apply updates
echo "Applying updates..."
result=$(podman auto-update --format json)

# Log the result
echo "$result" >> /var/log/container-updates.log

echo "=== Update complete ==="
```

## Verify After Update

```bash
# Check the container is running with the new image
podman inspect webapp --format '{{.ImageName}}'

# Check the service status
systemctl --user status webapp.service

# View recent logs for errors after update
journalctl --user -u webapp.service --since "5 minutes ago"
```

## Summary

Running `podman auto-update` manually lets you apply container image updates on demand. Use `--dry-run` to preview changes, the default command to apply updates, and `--format json` for scripting. Always verify containers are healthy after updates by checking service status and logs.
