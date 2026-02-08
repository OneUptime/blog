# How to Remove All Stopped Docker Containers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Containers, Cleanup, Remove, Prune, DevOps, Disk Space

Description: Learn multiple methods to remove all stopped Docker containers, reclaim disk space, and keep your Docker environment clean and organized.

---

Stopped containers accumulate like old mail. Every `docker run` that finishes leaves a stopped container behind. Each one consumes disk space for its writable layer, logs, and metadata. Over time, hundreds of these dead containers pile up, cluttering your `docker ps -a` output and wasting storage.

This guide covers every practical method for cleaning up stopped containers, from simple one-liners to selective approaches that protect specific containers from removal.

## Understanding Stopped Containers

When a container's main process exits, the container enters the "Exited" state. It is no longer running, but Docker retains it so you can inspect its logs, filesystem, and exit code.

```bash
# See all stopped containers
docker ps -a --filter "status=exited"

# Count how many stopped containers exist
docker ps -a --filter "status=exited" -q | wc -l

# Check the total disk space consumed by stopped containers
docker system df
```

## Method 1: docker container prune

The most straightforward approach. Docker's built-in prune command removes all stopped containers.

```bash
# Remove all stopped containers
docker container prune -f
```

The `-f` flag skips the confirmation prompt. Without it, Docker asks:

```
WARNING! This will remove all stopped containers.
Are you sure you want to continue? [y/N]
```

The prune command also shows how much space was reclaimed:

```
Deleted Containers:
a1b2c3d4e5f6...
b2c3d4e5f6a7...
Total reclaimed space: 234.5MB
```

## Method 2: docker rm with Filtering

For more control, combine `docker rm` with `docker ps` filtering.

```bash
# Remove all stopped containers using ps and rm
docker rm $(docker ps -aq --filter "status=exited")
```

This approach lets you add additional filters:

```bash
# Remove stopped containers based on a specific image
docker rm $(docker ps -aq --filter "status=exited" --filter "ancestor=nginx")

# Remove stopped containers with a specific exit code
docker rm $(docker ps -aq --filter "exited=0")       # Clean exits only
docker rm $(docker ps -aq --filter "exited=1")       # Error exits only
docker rm $(docker ps -aq --filter "exited=137")     # Killed containers
```

## Method 3: Remove All Non-Running Containers

This removes containers in any non-running state, including exited, created, and dead containers.

```bash
# Remove all containers that are not currently running
docker rm $(docker ps -aq --filter "status=exited" --filter "status=created" --filter "status=dead")
```

Or more aggressively:

```bash
# Get all container IDs, then remove them (running containers will produce errors but be skipped)
docker rm $(docker ps -aq) 2>/dev/null
```

The `2>/dev/null` suppresses error messages for running containers that cannot be removed without the force flag.

## Method 4: xargs Approach

The `xargs` approach handles the empty list case gracefully and offers parallel removal.

```bash
# Remove stopped containers using xargs (handles empty list)
docker ps -aq --filter "status=exited" | xargs -r docker rm

# Remove in parallel for faster cleanup (process 10 at a time)
docker ps -aq --filter "status=exited" | xargs -r -P 10 -n 1 docker rm
```

## Method 5: Prune with Filters

Docker container prune supports filters for selective cleanup.

```bash
# Remove stopped containers older than 24 hours
docker container prune --filter "until=24h" -f

# Remove stopped containers older than 7 days
docker container prune --filter "until=168h" -f

# Remove stopped containers with a specific label
docker container prune --filter "label=environment=dev" -f

# Remove stopped containers without a specific label
docker container prune --filter "label!=environment=production" -f
```

## Preventing Accumulation with --rm

The best way to handle stopped containers is to prevent them from accumulating in the first place. The `--rm` flag automatically removes a container when it exits.

```bash
# Run a container that cleans up after itself
docker run --rm -it ubuntu:22.04 bash

# Works with detached containers too
docker run --rm -d --name temp-worker myapp-worker:latest
```

Use `--rm` for:
- One-off commands and scripts
- Build containers
- Test runs
- Any container you do not need to inspect after it exits

Do not use `--rm` for:
- Containers whose exit logs you might need
- Debugging scenarios where you want to inspect the stopped container

## Selective Removal: Protect Important Containers

Sometimes you want to clean up most stopped containers but keep a few.

```bash
#!/bin/bash
# selective-cleanup.sh - Remove stopped containers except those matching patterns
# Usage: ./selective-cleanup.sh "keep-pattern1" "keep-pattern2"

KEEP_PATTERNS=("$@")

docker ps -aq --filter "status=exited" | while read container_id; do
    NAME=$(docker inspect --format '{{.Name}}' "$container_id" | sed 's/\///')
    IMAGE=$(docker inspect --format '{{.Config.Image}}' "$container_id")

    SKIP=false
    for pattern in "${KEEP_PATTERNS[@]}"; do
        if [[ "$NAME" == *"$pattern"* ]] || [[ "$IMAGE" == *"$pattern"* ]]; then
            SKIP=true
            break
        fi
    done

    if [ "$SKIP" = true ]; then
        echo "KEEP: $NAME ($IMAGE)"
    else
        echo "REMOVE: $NAME ($IMAGE)"
        docker rm "$container_id"
    fi
done
```

```bash
# Remove all stopped containers except those related to postgres or redis
./selective-cleanup.sh "postgres" "redis"
```

## Inspecting Before Removing

Before bulk removal, review what you are about to delete.

```bash
# Preview what would be removed (like a dry run)
echo "The following stopped containers would be removed:"
docker ps -a --filter "status=exited" --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Size}}"
echo ""
echo "Total: $(docker ps -aq --filter "status=exited" | wc -l) containers"
echo ""
read -p "Proceed with removal? (y/n) " confirm
if [ "$confirm" = "y" ]; then
    docker container prune -f
fi
```

## Saving Logs Before Cleanup

If you might need the logs from stopped containers, save them before removing.

```bash
#!/bin/bash
# save-and-remove.sh - Save logs from stopped containers then remove them
# Usage: ./save-and-remove.sh [log-directory]

LOG_DIR=${1:-"./container-logs-$(date +%Y%m%d)"}
mkdir -p "$LOG_DIR"

docker ps -aq --filter "status=exited" | while read container_id; do
    NAME=$(docker inspect --format '{{.Name}}' "$container_id" | sed 's/\///')
    EXIT_CODE=$(docker inspect --format '{{.State.ExitCode}}' "$container_id")

    # Save logs
    docker logs "$container_id" > "$LOG_DIR/${NAME}_exit${EXIT_CODE}.log" 2>&1
    echo "Saved logs for $NAME (exit code: $EXIT_CODE)"
done

echo "Logs saved to $LOG_DIR"
echo "Removing stopped containers..."
docker container prune -f
```

## Automating Cleanup

Set up automatic cleanup to prevent stopped containers from accumulating.

```bash
# Cron job: Remove stopped containers older than 48 hours, daily at 3 AM
# crontab -e
0 3 * * * /usr/bin/docker container prune --filter "until=48h" -f >> /var/log/docker-cleanup.log 2>&1
```

For systemd-based automation:

```ini
# /etc/systemd/system/docker-container-cleanup.service
[Unit]
Description=Remove old stopped Docker containers
After=docker.service

[Service]
Type=oneshot
ExecStart=/usr/bin/docker container prune --filter "until=48h" -f
```

```ini
# /etc/systemd/system/docker-container-cleanup.timer
[Unit]
Description=Daily Docker container cleanup

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
# Enable the timer
sudo systemctl enable --now docker-container-cleanup.timer
```

## Full System Cleanup

When you want to clean up stopped containers along with other unused Docker resources:

```bash
# Remove stopped containers, unused networks, dangling images, and build cache
docker system prune -f

# Also remove unused volumes (WARNING: may delete data)
docker system prune --volumes -f

# Preview what would be cleaned up
docker system df
```

## Checking Results

After cleanup, verify the state of your system.

```bash
# Confirm no stopped containers remain
docker ps -a --filter "status=exited"

# Check disk space recovered
docker system df

# Show remaining containers
docker ps -a --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
```

## Common Issues

**Cannot remove a container**: If a container is referenced by another, you need to remove the dependent first or use `--force`.

```bash
# Force remove a container that will not delete normally
docker rm -f stubborn-container
```

**Volume data loss**: Removing a container does not remove its named volumes, but anonymous volumes are deleted. If you need the data, commit or copy it first.

```bash
# Copy data out before removing the container
docker cp my-stopped-container:/data ./backup/

# Then safely remove
docker rm my-stopped-container
```

## Conclusion

Stopped Docker containers consume disk space and clutter your environment. Use `docker container prune` for quick bulk cleanup. Add `--filter` flags for selective removal. Use `--rm` on ephemeral containers to prevent accumulation. Automate cleanup with cron or systemd timers. Save logs before removing containers you might need for debugging. A clean Docker environment is easier to manage and less likely to run out of disk space when you need it most.
