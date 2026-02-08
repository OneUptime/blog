# How to Use docker system prune Effectively and Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Cleanup, Disk Space, System Maintenance, DevOps, Docker Prune

Description: Learn how to use docker system prune to reclaim disk space safely without accidentally deleting important containers and data.

---

Docker is a disk space hoarder. Every image pull, every build, every stopped container, and every unused network accumulates. After a few weeks of active development, it is not unusual to find Docker consuming 50GB or more of disk space. The `docker system prune` command is your cleanup tool, but it needs to be used carefully. Delete the wrong thing, and you lose data or break running services.

## Understanding What Docker Stores

Before pruning, understand what consumes disk space.

```bash
# See a summary of Docker disk usage
docker system df

# Detailed breakdown with individual items
docker system df -v
```

Typical output shows four categories:

```
TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE
Images          45        12        12.4GB    8.2GB (66%)
Containers      28        5         2.1GB     1.8GB (85%)
Local Volumes   15        8         5.3GB     2.1GB (39%)
Build Cache     -         -         4.7GB     4.7GB
```

Each category accumulates waste in different ways:

- **Images** - Old versions, untagged builds, intermediate layers
- **Containers** - Stopped containers sitting idle
- **Volumes** - Orphaned volumes from deleted containers
- **Build Cache** - Cached layers from previous builds

## The Basic Prune Command

The simplest form removes stopped containers, unused networks, dangling images, and the build cache.

```bash
# Basic prune - removes unused data (asks for confirmation)
docker system prune
```

Docker will show you what it plans to remove and ask for confirmation:

```
WARNING! This will remove:
  - all stopped containers
  - all networks not used by at least one container
  - all dangling images
  - unused build cache

Are you sure you want to continue? [y/N]
```

Notice what this does NOT remove: tagged images that are not in use, and volumes. This makes the basic prune relatively safe.

## The Nuclear Option: prune -a

Adding `-a` (or `--all`) removes all unused images, not just dangling ones. A dangling image has no tag. An unused image has a tag but is not referenced by any container.

```bash
# Remove everything including unused tagged images
docker system prune -a
```

This is significantly more aggressive. It removes images like `postgres:16` and `redis:7-alpine` if no container is currently using them. You will need to re-pull these images the next time you start your services.

```bash
# Remove everything including unused images, skip confirmation
docker system prune -a -f
```

The `-f` flag skips the confirmation prompt. Use this in scripts, but think twice before using it interactively.

## Including Volumes: prune --volumes

Volumes are excluded from prune by default because they typically contain data you want to keep (databases, uploads, etc.). To include them, add the `--volumes` flag.

```bash
# WARNING: This also removes unused volumes (potential data loss)
docker system prune --volumes
```

```bash
# The most aggressive prune possible
docker system prune -a --volumes -f
```

This is the "delete everything" command. It removes all stopped containers, all unused networks, all unused images (including tagged ones), all unused volumes, and all build cache. Only use this when you are certain you do not need any of that data.

## Targeted Pruning

Instead of the all-in-one `system prune`, you can clean up each resource type individually. This gives you more control.

### Prune Containers Only

```bash
# Remove all stopped containers
docker container prune

# With confirmation skip
docker container prune -f
```

### Prune Images Only

```bash
# Remove dangling images (untagged, unused layers)
docker image prune

# Remove all unused images
docker image prune -a

# Remove images older than 24 hours
docker image prune -a --filter "until=24h"
```

### Prune Volumes Only

```bash
# Remove unused volumes (DATA LOSS WARNING)
docker volume prune

# With force flag
docker volume prune -f
```

### Prune Networks Only

```bash
# Remove unused networks
docker network prune

# Remove networks created more than 12 hours ago
docker network prune --filter "until=12h"
```

### Prune Build Cache Only

```bash
# Remove build cache
docker builder prune

# Remove all build cache (including in-use layers)
docker builder prune -a

# Keep only the last 5GB of cache
docker builder prune --keep-storage 5g
```

## Using Filters for Selective Cleanup

Filters let you target specific resources for cleanup, leaving others untouched.

### Filter by Age

```bash
# Remove images not used in the last 7 days
docker image prune -a --filter "until=168h"

# Remove containers stopped more than 1 day ago
docker container prune --filter "until=24h"

# System prune for resources older than 48 hours
docker system prune --filter "until=48h"
```

### Filter by Label

Labels let you protect important resources from pruning.

```bash
# Only prune resources with a specific label
docker system prune --filter "label=environment=dev"

# Prune everything EXCEPT resources with a specific label
docker system prune --filter "label!=keep=true"
```

To protect a container or image from pruning, add a label when creating it.

```yaml
# docker-compose.yml - Add labels to protect from pruning
services:
  important-db:
    image: postgres:16
    labels:
      keep: "true"
    volumes:
      - pgdata:/var/lib/postgresql/data
```

## Automating Cleanup

### Cron Job

Set up a regular cleanup schedule to prevent disk space from growing unbounded.

```bash
# Add to crontab: clean up every Sunday at 3 AM
# crontab -e
0 3 * * 0 /usr/bin/docker system prune -f --filter "until=168h" >> /var/log/docker-prune.log 2>&1
```

### Systemd Timer

A more robust approach for servers uses a systemd timer.

```ini
# /etc/systemd/system/docker-prune.service
[Unit]
Description=Docker system prune
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
ExecStart=/usr/bin/docker system prune -a -f --filter "until=168h"
```

```ini
# /etc/systemd/system/docker-prune.timer
[Unit]
Description=Run Docker prune weekly

[Timer]
OnCalendar=weekly
Persistent=true
RandomizedDelaySec=3600

[Install]
WantedBy=timers.target
```

```bash
# Enable and start the timer
sudo systemctl enable docker-prune.timer
sudo systemctl start docker-prune.timer

# Check timer status
sudo systemctl list-timers docker-prune.timer
```

## Safe Pruning Workflow

Here is a step-by-step workflow for safely reclaiming disk space.

```bash
# Step 1: See what is consuming space
docker system df -v

# Step 2: Check what is running (don't remove things that are active)
docker ps

# Step 3: Check what is stopped but might be needed
docker ps -a --filter "status=exited" --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"

# Step 4: Start with the safest cleanup (stopped containers)
docker container prune -f

# Step 5: Remove dangling images (safe - these are unused)
docker image prune -f

# Step 6: Remove build cache older than a week
docker builder prune --filter "until=168h" -f

# Step 7: Check how much space you recovered
docker system df
```

## What to Never Prune

Some things should be protected:

**Named volumes with data.** If you have a PostgreSQL volume with production data, do not include `--volumes` in your prune. Name your volumes explicitly and back them up before any cleanup.

```bash
# List volumes and check which are in use
docker volume ls
docker volume inspect my-important-volume
```

**Images you will need again soon.** Pruning all unused images means re-pulling them, which takes time and bandwidth. On slow connections or in air-gapped environments, this can be costly.

**Stopped containers you might need to inspect.** If a container crashed and you need the logs or filesystem state for debugging, do not prune it.

```bash
# Check logs of a stopped container before pruning
docker logs my-crashed-container

# Copy files from a stopped container
docker cp my-crashed-container:/app/logs ./debug-logs
```

## Monitoring Disk Usage

Set up monitoring to catch disk space issues before they become emergencies.

```bash
# Quick check script - add to monitoring
#!/bin/bash
DOCKER_DISK=$(docker system df --format '{{.Size}}' | head -1)
DOCKER_RECLAIMABLE=$(docker system df --format '{{.Reclaimable}}' | head -1)
echo "Docker disk usage: $DOCKER_DISK (Reclaimable: $DOCKER_RECLAIMABLE)"

# Alert if /var/lib/docker is above 80% full
USAGE=$(df /var/lib/docker --output=pcent | tail -1 | tr -d ' %')
if [ "$USAGE" -gt 80 ]; then
  echo "WARNING: Docker storage at ${USAGE}% capacity"
fi
```

## Docker Desktop vs Docker Engine

Docker Desktop (Mac and Windows) stores everything in a virtual disk image. Even after pruning, the virtual disk might not shrink automatically.

```bash
# On Docker Desktop, check the virtual disk size
# Mac: ~/Library/Containers/com.docker.docker/Data/vms/0/data/Docker.raw
# Windows: C:\Users\<user>\AppData\Local\Docker\wsl\data\ext4.vhdx

# Reset Docker Desktop disk (loses all data)
# Docker Desktop > Settings > Resources > Disk image size > Reset
```

Regular pruning prevents the virtual disk from growing out of control. Docker Desktop does reclaim some space during prune operations, but the virtual disk file might not shrink to match.

`docker system prune` is a powerful maintenance tool. Use it regularly with appropriate filters, protect your important data with labels and careful volume management, and automate the cleanup so you never have to deal with a full disk at 2 AM.
