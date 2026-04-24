# How to Back Up Portainer Database Before Major Changes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Backup, Safety, Upgrade, Administration, BoltDB

Description: Learn how to create a point-in-time backup of the Portainer database before performing major changes like upgrades, bulk deletions, or configuration overhauls.

---

Taking a backup before any major change to Portainer gives you a fast rollback path if something goes wrong. This should be a standard step before upgrades, bulk stack changes, or team restructuring.

## Quick Pre-Change Backup (30 Seconds)

```bash
#!/bin/bash
# Quick backup before any major change

BACKUP_FILE="/tmp/portainer-pre-change-$(date +%Y%m%d-%H%M%S).tar.gz"
IMAGE_FILE="/tmp/portainer-pre-change.image.txt"
docker inspect --format '{{.Config.Image}}' portainer > "$IMAGE_FILE"

# Stop Portainer so the BoltDB file is copied consistently
docker stop portainer
docker run --rm \
  -v portainer_data:/data:ro \
  alpine \
  tar -czf - /data > "$BACKUP_FILE"
docker start portainer

echo "Backup saved to: $BACKUP_FILE"
echo "Current image saved to: $IMAGE_FILE"
echo "Size: $(du -sh "$BACKUP_FILE" | cut -f1)"
echo "To restore: see portainer-restore guide"
```

## Before Upgrading Portainer

Always backup before upgrading, as newer Portainer databases cannot be used on older Portainer versions:

```bash
# 1. Record the current image and create a consistent backup
IMAGE_FILE="/tmp/portainer-pre-change.image.txt"
BACKUP_FILE="/tmp/portainer-pre-upgrade-$(date +%Y%m%d-%H%M%S).tar.gz"
docker inspect --format '{{.Config.Image}}' portainer > "$IMAGE_FILE"
docker stop portainer
docker run --rm -v portainer_data:/data:ro alpine tar -czf - /data > \
  "$BACKUP_FILE"

# 2. Pull the current LTS image
docker pull portainer/portainer-ce:lts

# 3. Upgrade
docker rm portainer
docker run -d -p 8000:8000 -p 9443:9443 --name=portainer --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts
```

## Before Bulk Stack Operations

When deleting or modifying many stacks at once:

```bash
# Backup before bulk delete
docker inspect --format '{{.Config.Image}}' portainer > /tmp/portainer-pre-change.image.txt
docker stop portainer
docker run --rm -v portainer_data:/data:ro alpine tar -czf - /data > \
  /tmp/portainer-pre-bulkdelete.tar.gz
docker start portainer

# Proceed with the bulk operation in Portainer UI
```

## Verifying the Backup Before Proceeding

Always verify the backup is complete and readable before making changes:

```bash
BACKUP_FILE="/tmp/portainer-pre-change-20260320.tar.gz"

# Check the file is not corrupted
tar -tzf "$BACKUP_FILE" > /dev/null && echo "Backup OK" || echo "BACKUP CORRUPTED - do not proceed"

# Verify the database file is present
tar -tzf "$BACKUP_FILE" | grep "portainer.db" || echo "WARNING: portainer.db not in backup"

# Check file size is non-zero
[ -s "$BACKUP_FILE" ] && echo "Backup has content" || echo "BACKUP IS EMPTY"
```

## Rolling Back if Something Goes Wrong

```bash
# If the major change caused problems:
# 1. Stop Portainer
IMAGE_FILE="/tmp/portainer-pre-change.image.txt"
PREVIOUS_IMAGE="$(cat "$IMAGE_FILE")"
docker stop portainer && docker rm portainer

# 2. Remove the (now broken) data volume
docker volume rm portainer_data

# 3. Restore from backup
docker volume create portainer_data
docker run --rm \
  -v portainer_data:/data \
  -v /tmp:/backup \
  alpine tar -xzf /backup/portainer-pre-change-20260320.tar.gz -C /

# 4. Start the Portainer image that was running before the change
docker run -d -p 8000:8000 -p 9443:9443 --name=portainer --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  "$PREVIOUS_IMAGE"
```
