# How to Remove All Stopped Containers in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Lifecycle, Cleanup

Description: Learn how to remove all stopped containers in Podman using prune and filtering to keep your system clean and free up disk space.

---

> Regularly pruning stopped containers prevents disk space bloat and keeps your container environment organized.

Stopped containers accumulate over time, consuming disk space with their writable layers and logs. Podman provides several methods to clean up these containers, from targeted removal to bulk pruning. This guide shows you every approach.

---

## Using podman container prune

The most straightforward way to remove all stopped containers.

```bash
# Remove all stopped containers

podman container prune

# Skip the confirmation prompt
podman container prune --force
```

This removes stopped containers, such as containers in `exited` and `created` states, but leaves running and paused containers untouched.

## Checking What Will Be Removed

Before pruning, see which containers will be affected.

```bash
# List all stopped containers
podman ps -a --size --filter status=exited --format "table {{.Names}}\t{{.Status}}\t{{.Size}}"

# Also check containers in "created" state (never started)
podman ps -a --size --filter status=created --format "table {{.Names}}\t{{.Status}}\t{{.Size}}"

# Count how many will be removed
echo "Exited: $(podman ps -a --filter status=exited -q | wc -l)"
echo "Created: $(podman ps -a --filter status=created -q | wc -l)"
```

## Using Filters with Prune

Prune supports filters to remove only specific stopped containers.

```bash
# Remove stopped containers older than 24 hours
podman container prune --force --filter until=24h

# Remove stopped containers older than 7 days
podman container prune --force --filter until=168h

# Remove stopped containers with a specific label
podman container prune --force --filter label=environment=development
```

## Manual Removal Using ps and xargs

For more control, combine `podman ps` filtering with `podman rm`.

```bash
# Remove all exited containers
podman ps -a --filter status=exited -q | xargs -r podman rm

# Remove all containers in "created" state
podman ps -a --filter status=created -q | xargs -r podman rm

# Remove both exited and created containers
podman ps -a --filter status=exited --filter status=created -q | xargs -r podman rm
```

## Removing Stopped Containers with Volumes

Include the `-v` flag to also remove anonymous volumes attached to the containers.

```bash
# Remove stopped containers and their anonymous volumes
podman ps -a --filter status=exited -q | xargs -r podman rm -v
```

## Selective Cleanup by Image

Remove stopped containers from a specific image.

```bash
# Remove all stopped alpine containers
podman ps -a --filter status=exited --filter ancestor=docker.io/library/alpine:latest -q | \
  xargs -r podman rm

# Remove all stopped containers from a custom image
podman ps -a --filter status=exited --filter ancestor=myapp:latest -q | \
  xargs -r podman rm
```

## Selective Cleanup by Name Pattern

```bash
# Remove stopped containers matching a name pattern
podman ps -a --filter status=exited --format "{{.Names}}" | \
  grep "^test-" | xargs -r podman rm

# Remove stopped containers with "temp" in the name
podman ps -a --filter status=exited --format "{{.Names}}" | \
  grep "temp" | xargs -r podman rm
```

## Full System Prune

For a comprehensive cleanup that includes containers, images, pods, networks, and optionally volumes:

```bash
# Remove stopped containers, unused networks, unused pods, and dangling images
podman system prune --force

# Include all unused images (not just dangling)
podman system prune --all --force

# Include volumes in the cleanup
podman system prune --all --volumes --force
```

## Automated Cleanup Script

```bash
#!/bin/bash
# auto-cleanup.sh - Automated container cleanup

echo "=== Container Cleanup Report ==="
echo "Date: $(date)"
echo ""

# Count containers by status
RUNNING=$(podman ps -q | wc -l)
EXITED=$(podman ps -a --filter status=exited -q | wc -l)
CREATED=$(podman ps -a --filter status=created -q | wc -l)

echo "Running containers: $RUNNING (will not be removed)"
echo "Exited containers: $EXITED"
echo "Created containers: $CREATED"
echo ""

TOTAL=$((EXITED + CREATED))
if [ "$TOTAL" -eq 0 ]; then
  echo "Nothing to clean up"
  exit 0
fi

echo "Removing $TOTAL stopped containers..."
podman container prune --force

echo ""
echo "Cleanup complete"
echo "Remaining containers:"
podman ps -a --format "table {{.Names}}\t{{.Status}}"
```

## Scheduling Automatic Cleanup

Use cron to run cleanup on a schedule.

```bash
# Add to crontab: clean up stopped containers daily at 3 AM
# crontab -e
# 0 3 * * * podman container prune --force >> /var/log/podman-cleanup.log 2>&1

# Or use a systemd timer for rootless Podman
mkdir -p ~/.config/systemd/user
cat > ~/.config/systemd/user/podman-cleanup.service << 'EOF'
[Unit]
Description=Podman container cleanup

[Service]
Type=oneshot
ExecStart=/usr/bin/podman container prune --force
EOF

cat > ~/.config/systemd/user/podman-cleanup.timer << 'EOF'
[Unit]
Description=Daily Podman cleanup

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
EOF

# Enable the timer
systemctl --user enable --now podman-cleanup.timer
```

## Checking Disk Space Before and After

```bash
# Check disk usage before cleanup
echo "Before cleanup:"
podman system df

# Run cleanup
podman container prune --force

# Check disk usage after cleanup
echo "After cleanup:"
podman system df
```

## Summary

Removing stopped containers in Podman is essential for disk space management. Use `podman container prune` for quick cleanup, add `--filter until=<duration>` for age-based removal, and combine `podman ps` filters with `podman rm` for selective cleanup. Set up automated cleanup with cron or systemd timers to keep your system clean without manual intervention.
