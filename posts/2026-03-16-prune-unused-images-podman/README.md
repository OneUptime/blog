# How to Prune Unused Images with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Image, Prune, Cleanup, Disk Space

Description: Learn how to reclaim disk space by pruning unused container images with Podman, including dangling images, unused images, and filtered cleanup strategies.

---

> Regular image pruning prevents disk space exhaustion on container hosts and keeps your image store clean.

Container images accumulate quickly during development and deployment cycles. Old builds, dangling layers, and unused base images consume disk space that can eventually cause problems. Podman provides `podman image prune` and related commands to clean up efficiently. This guide covers all pruning strategies and automation approaches.

---

## Understanding Image Types

Before pruning, understand the different types of images in your local store.

```bash
# List all images including intermediate layers

podman images -a

# List only dangling images (no tag, not referenced)
podman images -f dangling=true

# Show image disk usage
podman system df
# TYPE           TOTAL   ACTIVE  SIZE     RECLAIMABLE
# Images         25      8       4.2GB    2.8GB (66%)
# Containers     8       3       150MB    100MB (66%)
# Local Volumes  5       3       500MB    200MB (40%)
```

Dangling images are layers that are no longer tagged and are not referenced by any other image. They typically result from rebuilding images with the same tag.

## Pruning Dangling Images

The default prune command removes only dangling images.

```bash
# Remove dangling images
podman image prune

# You will be prompted for confirmation:
# WARNING! This will remove all dangling images.
# Are you sure you want to continue? [y/N] y

# Skip the confirmation prompt
podman image prune -f
```

## Pruning All Unused Images

To remove all images not associated with any container, use the `--all` flag.

```bash
# Remove all unused images (not just dangling ones)
podman image prune -a

# Skip confirmation
podman image prune -a -f
```

This removes images that are not referenced by any container. Be careful in production environments.

## Filtering What Gets Pruned

Use the `--filter` flag to control which images are pruned based on age or labels.

```bash
# Remove dangling images older than 24 hours
podman image prune -f --filter "until=24h"

# Remove unused images older than 7 days
podman image prune -a -f --filter "until=168h"

# Remove images older than a specific date
podman image prune -a -f --filter "until=2026-03-01"

# Remove images with a specific label
podman image prune -f --filter "label=environment=staging"

# Combine filters: unused images older than 48 hours with a specific label
podman image prune -a -f \
  --filter "until=48h" \
  --filter "label=temporary=true"
```

## Using podman system prune

For a broader cleanup that can cover images, containers, and volumes, use `podman system prune`.

```bash
# Prune stopped containers, unused pods and networks, and dangling images
podman system prune -f

# Prune everything including unused images and volumes
podman system prune -a -f --volumes

# Check space before and after
podman system df
podman system prune -a -f
podman system df
```

## Selective Removal with podman rmi

When you need fine-grained control, use `podman rmi` to remove specific images.

```bash
# Remove a specific image
podman rmi docker.io/library/nginx:1.25

# Remove multiple specific images
podman rmi myapp:v1.0 myapp:v1.1 myapp:v1.2

# Force removal even if a container is using the image
podman rmi -f docker.io/library/nginx:latest

# Remove all images (nuclear option)
podman rmi -a -f
```

## Checking What Will Be Pruned

Before pruning, you can preview what will be removed.

```bash
# List dangling images that would be pruned
podman images -f dangling=true --format "{{.ID}} {{.Repository}}:{{.Tag}} {{.Size}}"

# List unused images (not used by any container)
podman images --format "{{.ID}} {{.Repository}}:{{.Tag}} {{.Size}}" | while read id name size; do
  if ! podman ps -a --format "{{.ImageID}}" | grep -Fq "$id"; then
    echo "Unused: $name ($size)"
  fi
done
```

## Automating Image Cleanup

Set up automatic cleanup to prevent disk exhaustion.

```bash
# Create a systemd timer for daily cleanup (rootless)
mkdir -p ~/.config/systemd/user

# Create the service file
cat > ~/.config/systemd/user/podman-image-prune.service << 'EOF'
[Unit]
Description=Prune old Podman images

[Service]
Type=oneshot
ExecStart=/usr/bin/podman image prune -a -f --filter "until=168h"
EOF

# Create the timer file
cat > ~/.config/systemd/user/podman-image-prune.timer << 'EOF'
[Unit]
Description=Run Podman image prune daily

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
EOF

# Enable and start the timer
systemctl --user enable --now podman-image-prune.timer

# Verify the timer is active
systemctl --user list-timers | grep podman
```

## Cron-Based Cleanup

If you prefer cron over systemd timers, set up a cron job.

```bash
# Add a daily cleanup cron job
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/bin/podman image prune -a -f --filter 'until=168h' >> /var/log/podman-prune.log 2>&1") | crontab -

# Verify the cron entry
crontab -l
```

## Monitoring Disk Usage

Keep an eye on disk usage to know when pruning is needed.

```bash
# Quick overview of Podman disk usage
podman system df

# Detailed breakdown by image
podman system df -v

# Check the rootless container storage directory size
du -sh ~/.local/share/containers/storage/

# Alert script: warn when usage exceeds threshold
#!/bin/bash
THRESHOLD=80
USAGE=$(df /var/lib/containers --output=pcent | tail -1 | tr -d '% ')
if [ "$USAGE" -gt "$THRESHOLD" ]; then
  echo "Container storage at ${USAGE}% - running prune"
  podman image prune -a -f --filter "until=48h"
fi
```

## Summary

Regular pruning of unused images is essential for maintaining healthy container hosts. Use `podman image prune` for targeted cleanup of dangling images, add the `--all` flag for broader cleanup, and apply filters to protect recent images. Automate the process with systemd timers or cron jobs to prevent disk space issues before they occur. Always check `podman system df` to understand your current disk usage before and after cleanup operations.
