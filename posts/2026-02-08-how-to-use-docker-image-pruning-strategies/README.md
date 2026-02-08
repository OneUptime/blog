# How to Use Docker Image Pruning Strategies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Images, Pruning, Cleanup, Disk Space, DevOps, Automation

Description: Master Docker image pruning with targeted strategies using filters, automation, and best practices to keep your systems lean.

---

Docker images pile up relentlessly. Every build, every pull, every experiment leaves layers behind. Without a pruning strategy, your build servers, CI runners, and development machines fill up until something breaks. A deliberate approach to image pruning keeps disk usage predictable and your Docker environment healthy.

This guide covers pruning strategies from simple one-liners to automated policies that run without intervention.

## Understanding What Gets Pruned

Docker distinguishes between several categories of images. Knowing the differences is essential before pruning anything.

**Dangling images** have no tag and no relationship to any tagged image. They result from rebuilding an image with the same tag, which orphans the previous version.

**Unused images** are tagged images not referenced by any container, running or stopped.

**Active images** are used by at least one container.

```bash
# See the breakdown of image categories
docker system df -v | head -40
```

## Strategy 1: Prune Dangling Images Only

This is the safest pruning operation. Dangling images serve no purpose and can always be removed.

```bash
# Remove all dangling images (safe operation)
docker image prune -f
```

The `-f` flag skips the confirmation prompt. This command removes only `<none>:<none>` images, leaving all tagged images intact.

Schedule this as a daily job on build servers:

```bash
# Add to crontab for daily dangling image cleanup
# Run at 2 AM every day
0 2 * * * /usr/bin/docker image prune -f >> /var/log/docker-prune.log 2>&1
```

## Strategy 2: Prune All Unused Images

When you want to reclaim more space, remove all images not associated with any container.

```bash
# Remove all images not used by existing containers
docker image prune -a -f
```

This is more aggressive. It removes every image that no running or stopped container references. The next time you need one of these images, Docker pulls it again.

Use this on CI runners where images are always pulled fresh:

```bash
# CI pipeline cleanup step
docker image prune -a -f
echo "Reclaimed space. Current usage:"
docker system df
```

## Strategy 3: Time-Based Pruning

Filter images by age to keep recent images while removing old ones.

```bash
# Remove unused images older than 7 days
docker image prune -a --filter "until=168h" -f

# Remove unused images older than 30 days
docker image prune -a --filter "until=720h" -f

# Remove unused images older than a specific date
docker image prune -a --filter "until=2025-12-01T00:00:00" -f
```

Time-based pruning strikes a balance. Recent images you might need again stay cached. Old images that have been replaced get cleaned up.

```bash
# Weekly cron job: remove unused images older than 14 days
0 3 * * 0 /usr/bin/docker image prune -a --filter "until=336h" -f >> /var/log/docker-prune.log 2>&1
```

## Strategy 4: Label-Based Pruning

Labels give you fine-grained control over which images to prune. Add labels during build, then filter by them during cleanup.

```dockerfile
# Add labels during build to categorize images
FROM node:20-alpine
LABEL environment="development"
LABEL team="backend"
LABEL prunable="true"
```

Then prune based on labels:

```bash
# Remove unused dev images
docker image prune -a --filter "label=environment=development" -f

# Remove images explicitly marked as prunable
docker image prune -a --filter "label=prunable=true" -f

# Keep production images, remove everything else
docker image prune -a --filter "label!=environment=production" -f
```

The `label!=` syntax keeps images that match and removes everything else.

## Strategy 5: Full System Prune

When disk space is critically low, a full system prune removes images, containers, networks, and optionally volumes.

```bash
# Nuclear option: remove everything unused
docker system prune -a -f

# Include volumes too (WARNING: this destroys data)
docker system prune -a --volumes -f
```

Reserve the system prune for emergencies or fresh starts. It removes stopped containers, unused networks, and all unused images in one sweep.

## Strategy 6: Registry-Aware Pruning

Keep only images that match your production registry. Remove everything else.

```bash
#!/bin/bash
# registry-prune.sh - Keep only images from your trusted registry
# Usage: ./registry-prune.sh myregistry.example.com

REGISTRY=$1

docker images --format '{{.Repository}}:{{.Tag}} {{.ID}}' | while read name id; do
    # Skip images from the trusted registry
    if [[ "$name" == "${REGISTRY}"* ]]; then
        echo "KEEP: $name"
        continue
    fi

    # Skip images used by running containers
    if docker ps --format '{{.Image}}' | grep -q "$name"; then
        echo "ACTIVE: $name"
        continue
    fi

    echo "REMOVE: $name"
    docker rmi "$id" 2>/dev/null
done
```

## Strategy 7: Keep N Most Recent Tags

For images where you build frequently with incrementing tags, keep only the last N versions.

```bash
#!/bin/bash
# keep-recent.sh - Keep only the N most recent tags for a repository
# Usage: ./keep-recent.sh myapp 5

REPO=$1
KEEP=$2

# Get all tags sorted by creation date (newest first)
TAGS=$(docker images --filter "reference=${REPO}" \
    --format '{{.CreatedAt}}\t{{.Repository}}:{{.Tag}}' | sort -r | awk '{print $NF}')

COUNT=0
while IFS= read -r tag; do
    COUNT=$((COUNT + 1))
    if [ "$COUNT" -gt "$KEEP" ]; then
        echo "Removing: $tag"
        docker rmi "$tag" 2>/dev/null
    else
        echo "Keeping: $tag"
    fi
done <<< "$TAGS"
```

## Strategy 8: Build Cache Pruning

Build cache can grow larger than the images themselves. Prune it separately.

```bash
# Show build cache usage
docker buildx du

# Remove all build cache
docker builder prune -f

# Remove build cache older than 7 days
docker builder prune --filter "until=168h" -f

# Remove only cache not used in the last 24 hours
docker builder prune --filter "until=24h" -f
```

## Automating Pruning with systemd

For Linux servers, create a systemd timer that runs pruning on a schedule.

```ini
# /etc/systemd/system/docker-prune.service
[Unit]
Description=Docker Image Pruning
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
ExecStart=/usr/bin/docker image prune -a --filter "until=336h" -f
ExecStart=/usr/bin/docker builder prune --filter "until=168h" -f
```

```ini
# /etc/systemd/system/docker-prune.timer
[Unit]
Description=Run Docker Pruning Weekly

[Timer]
OnCalendar=weekly
Persistent=true

[Install]
WantedBy=timers.target
```

Enable the timer:

```bash
# Enable and start the pruning timer
sudo systemctl enable docker-prune.timer
sudo systemctl start docker-prune.timer

# Check the timer status
systemctl list-timers docker-prune.timer
```

## Pruning in CI/CD Pipelines

CI runners need aggressive pruning since they build many images daily.

```yaml
# GitLab CI example: cleanup job that runs after deployments
cleanup:
  stage: cleanup
  script:
    - docker image prune -a --filter "until=48h" -f
    - docker builder prune --filter "until=24h" -f
    - docker system df
  only:
    - schedules
```

```yaml
# GitHub Actions: scheduled cleanup workflow
name: Docker Cleanup
on:
  schedule:
    - cron: '0 4 * * 0'  # Every Sunday at 4 AM
jobs:
  cleanup:
    runs-on: self-hosted
    steps:
      - name: Prune Docker images
        run: |
          docker image prune -a --filter "until=168h" -f
          docker builder prune -f
```

## Monitoring Before and After

Always measure the impact of your pruning strategy.

```bash
# Create a pruning report
echo "=== Before Pruning ==="
docker system df

docker image prune -a --filter "until=336h" -f
docker builder prune --filter "until=168h" -f

echo "=== After Pruning ==="
docker system df
```

## Choosing the Right Strategy

| Scenario | Recommended Strategy |
|----------|---------------------|
| Development machine | Dangling + time-based (7 days) |
| CI runner | All unused + build cache (48 hours) |
| Production server | Label-based, keep only production images |
| Shared build server | Registry-aware + keep N recent tags |

## Conclusion

Effective Docker pruning prevents disk space emergencies without disrupting workflows. Start with safe dangling image cleanup. Add time-based filters for a balanced approach. Use labels for precise control in multi-team environments. Automate everything with cron, systemd timers, or CI pipeline steps. The right strategy depends on your environment, but every environment needs one.
