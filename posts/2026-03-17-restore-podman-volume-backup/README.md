# How to Restore a Podman Volume from Backup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Volumes, Backup, Restore

Description: Learn how to restore Podman volumes from tar backups using podman volume import and temporary containers.

---

> Restoring volumes from backup is essential for disaster recovery. Podman provides straightforward methods to import data back into named volumes.

After creating volume backups, you need a reliable restore process. This guide covers restoring Podman volumes from tar archives using both built-in import commands and temporary containers.

---

## Restore Using podman volume import

The simplest restore method uses the built-in import command:

```bash
# Create a fresh volume

podman volume create appdata-restored

# Import from a tar archive
podman volume import appdata-restored /home/user/backups/appdata-backup.tar

# Import from a gzipped archive
gunzip -c /home/user/backups/appdata-backup.tar.gz | podman volume import appdata-restored -

# Verify the restored contents
podman run --rm -v appdata-restored:/data:ro \
  docker.io/library/alpine:latest ls -la /data
```

## Restore Using a Temporary Container

For more control over the restore process, use a temporary container:

```bash
# Create the target volume
podman volume create appdata-restored

# Restore from a tar.gz backup
podman run --rm \
  -v appdata-restored:/target \
  -v /home/user/backups:/backup:ro \
  docker.io/library/alpine:latest \
  sh -c "tar xzf /backup/appdata-backup.tar.gz -C /target"

# Verify the restoration
podman run --rm -v appdata-restored:/data:ro \
  docker.io/library/alpine:latest ls -la /data
```

## Restore to the Original Volume

To restore in place, remove the old volume and recreate it:

```bash
# Stop any containers using the volume
podman stop myapp

# Remove the container (but not the volume yet)
podman rm myapp

# Remove the old volume
podman volume rm appdata

# Recreate and import
podman volume create appdata
podman volume import appdata /home/user/backups/appdata-backup.tar

# Restart the container
podman run -d --name myapp -v appdata:/app/data docker.io/library/node:20
```

## Restore a Database Volume

```bash
# Option 1: Restore the raw volume data
podman stop postgres-db
podman rm postgres-db
podman volume rm dbdata
podman volume create dbdata
podman volume import dbdata /home/user/backups/dbdata-backup.tar

# Restart the database
podman run -d --name postgres-db \
  -v dbdata:/var/lib/postgresql/data \
  -e POSTGRES_PASSWORD=secret \
  docker.io/library/postgres:16

# Option 2: Restore from a SQL dump
podman run -d --name postgres-db \
  -v dbdata:/var/lib/postgresql/data \
  -e POSTGRES_PASSWORD=secret \
  docker.io/library/postgres:16

# Wait for the database to be ready
sleep 5
podman exec -i postgres-db psql -U postgres < /home/user/backups/myapp-db.sql
```

## Restore with Permission and Ownership Preservation

```bash
# Ensure file modes and numeric ownership are preserved during restore
podman run --rm \
  -v appdata-restored:/target \
  -v /home/user/backups:/backup:ro \
  docker.io/library/alpine:latest \
  sh -c "tar xzf /backup/appdata-backup.tar.gz --numeric-owner -C /target"

# Verify permissions and ownership
podman run --rm -v appdata-restored:/data:ro \
  docker.io/library/alpine:latest ls -la /data
```

## Restore All Volumes from a Backup Directory

```bash
# Restore all volumes from a dated backup directory
BACKUP_DIR="/home/user/backups/20260317"

for archive in "$BACKUP_DIR"/*.tar.gz; do
  vol_name=$(basename "$archive" .tar.gz)
  echo "Restoring volume: $vol_name"
  podman volume create "$vol_name" 2>/dev/null || true
  gunzip -c "$archive" | podman volume import "$vol_name" -
done

echo "All volumes restored from $BACKUP_DIR"
```

## Summary

Restore Podman volumes using `podman volume import` for tar archives or a temporary container with `tar` for compressed backups. Always stop containers before restoring their volumes, and verify the restored data afterward. For databases, consider using application-level restore tools like `psql` for SQL dumps alongside raw volume restoration.
