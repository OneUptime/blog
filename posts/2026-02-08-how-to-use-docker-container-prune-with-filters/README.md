# How to Use Docker Container Prune with Filters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, docker prune, containers, cleanup, filters, disk space, maintenance

Description: Learn how to selectively remove stopped Docker containers using docker container prune with label and time filters.

---

Stopped containers accumulate silently. Every `docker run` that finishes, every crashed service, every completed one-off task leaves behind a stopped container. These containers consume disk space for their writable layers and clutter your `docker ps -a` output. The `docker container prune` command removes all stopped containers, but the real power comes from its filter options that let you selectively prune based on age, labels, and other criteria.

This guide shows you how to use `docker container prune` with filters to keep your Docker environment clean without accidentally removing containers you still need.

## The Basic Prune Command

Without any filters, `docker container prune` removes every stopped container:

```bash
# Remove all stopped containers
docker container prune
```

Docker asks for confirmation:

```
WARNING! This will remove all stopped containers.
Are you sure you want to continue? [y/N]
```

Skip the confirmation prompt with `-f`:

```bash
# Remove all stopped containers without asking for confirmation
docker container prune -f
```

Check what would be removed before running prune:

```bash
# List all stopped containers to see what prune would remove
docker ps -a --filter status=exited --filter status=created
```

## Filtering by Time with "until"

The `until` filter removes only containers that were stopped before a certain time. This is the most useful filter for maintenance scripts because it preserves recently stopped containers that you might still want to inspect.

Remove containers stopped more than 24 hours ago:

```bash
# Prune containers that have been stopped for more than 24 hours
docker container prune -f --filter "until=24h"
```

Remove containers stopped more than 7 days ago:

```bash
# Prune containers older than 7 days
docker container prune -f --filter "until=168h"
```

The time format uses Go duration strings: `h` for hours, `m` for minutes, `s` for seconds. You can combine them: `72h30m` means 72 hours and 30 minutes.

Remove containers stopped before a specific date:

```bash
# Prune containers stopped before January 1, 2026
docker container prune -f --filter "until=2026-01-01T00:00:00"
```

## Filtering by Labels

Labels give you fine-grained control over which containers to prune. You can keep important containers safe while cleaning up the rest.

### Prune Containers with a Specific Label

Remove only containers that have a particular label:

```bash
# Prune only containers labeled as temporary
docker container prune -f --filter "label=temporary"

# Prune containers with a specific label value
docker container prune -f --filter "label=environment=staging"
```

### Prune Containers Without a Specific Label

Keep containers that have a "keep" label and remove everything else:

```bash
# Prune containers that do NOT have the "keep" label
docker container prune -f --filter "label!=keep"
```

This is a safety mechanism. Tag containers you want to preserve:

```bash
# Start a container with the "keep" label so prune skips it
docker run -d --name important-data --label keep alpine sleep infinity

# Start temporary containers without the label
docker run --name temp-job-1 alpine echo "done"
docker run --name temp-job-2 alpine echo "done"

# Prune removes temp-job-1 and temp-job-2, but not important-data
docker container prune -f --filter "label!=keep"
```

## Combining Multiple Filters

You can use multiple `--filter` flags. When you specify multiple filters, Docker applies all of them (AND logic).

Remove containers that are older than 48 hours AND have the staging label:

```bash
# Prune old staging containers
docker container prune -f \
  --filter "until=48h" \
  --filter "label=environment=staging"
```

Remove containers older than 7 days that do not have the "persist" label:

```bash
# Prune old containers except those marked for persistence
docker container prune -f \
  --filter "until=168h" \
  --filter "label!=persist"
```

## Building a Cleanup Script

Here is a practical cleanup script for a development machine:

```bash
#!/bin/bash
# docker-cleanup.sh - Smart Docker container cleanup

echo "=== Docker Container Cleanup ==="
echo ""

# Show current state
STOPPED=$(docker ps -a --filter status=exited -q | wc -l | tr -d ' ')
echo "Stopped containers: $STOPPED"

if [ "$STOPPED" -eq 0 ]; then
  echo "Nothing to clean up."
  exit 0
fi

# Step 1: Remove containers stopped more than 7 days ago
echo ""
echo "Removing containers older than 7 days..."
docker container prune -f --filter "until=168h"

# Step 2: Remove containers labeled as temporary regardless of age
echo ""
echo "Removing temporary containers..."
docker container prune -f --filter "label=temporary"

# Step 3: Show remaining stopped containers
REMAINING=$(docker ps -a --filter status=exited -q | wc -l | tr -d ' ')
echo ""
echo "Remaining stopped containers: $REMAINING"

# Show disk space reclaimed
echo ""
docker system df
```

## Scheduled Cleanup with Cron

Run cleanup automatically to prevent container buildup:

```bash
# Add to crontab: clean up containers daily at 3 AM
# Run 'crontab -e' and add this line
0 3 * * * /usr/local/bin/docker-cleanup.sh >> /var/log/docker-cleanup.log 2>&1
```

For production servers, be more conservative:

```bash
#!/bin/bash
# production-cleanup.sh - Conservative cleanup for production

# Only remove containers stopped more than 30 days ago
docker container prune -f --filter "until=720h"

# Log the action
echo "$(date): Container prune completed" >> /var/log/docker-maintenance.log
```

## Labeling Strategies for Prune Control

Design your labeling strategy around cleanup needs:

```bash
# Containers that should never be auto-pruned
docker run -d --label prune=never --name critical-sidecar ...

# Containers that can be pruned after 24 hours
docker run -d --label prune=daily --name batch-job ...

# Containers that can be pruned immediately after stopping
docker run --label prune=immediate --name one-off-task ...
```

Then prune by label:

```bash
# Prune only containers marked for immediate cleanup
docker container prune -f --filter "label=prune=immediate"

# Prune daily containers that are more than 24 hours old
docker container prune -f --filter "label=prune=daily" --filter "until=24h"
```

In Docker Compose, apply labels in the service definition:

```yaml
# docker-compose.yml - Label services for cleanup management
services:
  web:
    image: nginx
    labels:
      # This service should not be auto-pruned
      prune: "never"

  migration:
    image: my-app
    command: python manage.py migrate
    labels:
      # This service can be pruned immediately after it finishes
      prune: "immediate"

  test-runner:
    image: my-app
    command: pytest
    labels:
      # Test containers can be pruned after a day
      prune: "daily"
```

## Checking Disk Space Before and After

See how much space containers use before and after pruning:

```bash
# Check disk usage by Docker resources
docker system df

# More detailed breakdown
docker system df -v
```

Output:

```
TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE
Images          15        5         4.2GB     2.1GB (50%)
Containers      23        3         1.8GB     1.6GB (88%)
Local Volumes   8         4         3.5GB     1.2GB (34%)
Build Cache     42        0         890MB     890MB
```

The "Containers" line shows how much space stopped containers consume. After pruning:

```bash
# Prune and check the difference
docker container prune -f --filter "until=72h"
docker system df
```

## What Prune Does NOT Remove

`docker container prune` only removes stopped containers. It does not touch:

- Running containers
- Paused containers
- Images (use `docker image prune`)
- Volumes (use `docker volume prune`)
- Networks (use `docker network prune`)
- Build cache (use `docker builder prune`)

For a complete system cleanup, use the system-level prune:

```bash
# Remove all unused containers, images, networks, and optionally volumes
docker system prune -f

# Include volumes in the cleanup (be careful with data!)
docker system prune -f --volumes
```

But `docker system prune` does not support the same fine-grained filters as `docker container prune`, which is why the container-specific command is preferred for targeted cleanup.

## Dry Run Approach

Docker prune does not have a built-in dry-run flag, but you can simulate it:

```bash
# Preview what would be pruned - list containers matching the filter criteria
docker ps -a \
  --filter status=exited \
  --filter status=created \
  --format "table {{.Names}}\t{{.Status}}\t{{.Size}}" | head -20
```

For time-based filtering, check container creation and stop times:

```bash
# Show when each stopped container was last active
docker ps -a \
  --filter status=exited \
  --format "{{.Names}}\t{{.Status}}\t{{.CreatedAt}}"
```

## Summary

`docker container prune` with filters is the right way to manage stopped container cleanup. The `until` filter protects recently stopped containers that you might still need for debugging. Label filters give you category-based control over what gets pruned and what stays. Combine both in automated scripts to keep your Docker environment clean without manual intervention. Always check `docker system df` before and after pruning to understand the disk space impact. For production systems, use conservative time-based filters (7 or 30 days) and run cleanup on a cron schedule.
