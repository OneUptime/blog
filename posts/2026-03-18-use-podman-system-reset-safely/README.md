# How to Use podman system reset Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Podman, System Reset, Cleanup, Storage, DevOps

Description: A guide to using podman system reset without losing important data, covering pre-reset backups, understanding what gets deleted, and safer cleanup alternatives.

---

> The `podman system reset` command is the nuclear option for Podman storage. Learn when to use it, what it destroys, and how to protect your data before pressing the button.

Every Podman user eventually encounters a situation where the local storage is corrupted, disk space is exhausted, or things are just broken in a way that no amount of pruning will fix. That is when `podman system reset` enters the conversation. It wipes everything: pods, containers, images, volumes, networks, build cache, and even Podman machines. It solves the problem by destroying everything and starting fresh. This guide explains when that is appropriate, how to do it safely, and what alternatives exist for less drastic cleanup.

---

## What podman system reset Actually Does

The `podman system reset` command removes all Podman-managed data:

- **All containers** (running, stopped, and paused) are removed.
- **All images** (pulled, built, and cached) are deleted.
- **All volumes** (named volumes and their data) are destroyed.
- **All networks** (custom networks) are removed.
- **All build cache** is cleared.
- **All pods** are removed.
- **All Podman machines** are removed.
- **The configured storage directories** (`graphRoot` and `runRoot`) are removed.

By default, rootless Podman stores images under `~/.local/share/containers/storage`, while rootful Podman uses `/var/lib/containers/storage`. `podman system reset` also removes the configured `runRoot`, so check your actual paths before resetting:

```bash
# See the storage paths that will be removed

podman info --format 'graphRoot={{.Store.GraphRoot}}'
podman info --format 'runRoot={{.Store.RunRoot}}'
```

**This operation is irreversible.** There is no undo. Once you run it, the data is gone.

## When to Use podman system reset

There are legitimate reasons to reset:

1. **Severe storage problems**: When Podman reports storage errors and you truly need to reinitialize the local store.
2. **Storage driver change**: When switching between overlay, vfs, or other storage drivers.
3. **Storage path changes**: Before changing `static_dir`, `tmp_dir`, or `volume_path` in `containers.conf` or `storage.conf`.
4. **Complete environment rebuild**: When you want to start from a known clean state.
5. **Development cleanup**: When your development machine is cluttered with old containers and images consuming too much disk space.

## Before You Reset: Create a Pre-Reset Backup

Never run `podman system reset` without backing up first. Here is a pre-reset backup procedure that saves tagged images, volumes, container filesystems, and metadata:

```bash
#!/bin/bash
# /usr/local/bin/podman-pre-reset-backup.sh
# Run this BEFORE podman system reset

set -euo pipefail

BACKUP_DIR="/backups/podman-pre-reset-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"/{images,volumes,containers}

echo "=== Pre-Reset Backup ==="
echo "Backup directory: $BACKUP_DIR"
echo ""

# Backup tagged images
echo "Saving tagged images..."
podman images --format "{{.Repository}}:{{.Tag}}" | while read -r image; do
    [ "$image" = "<none>:<none>" ] && continue
    SAFE_NAME=$(echo "$image" | tr '/:' '_')
    echo "  $image"
    podman save "$image" | gzip > "$BACKUP_DIR/images/${SAFE_NAME}.tar.gz"
done

# Backup all volumes
echo ""
echo "Saving volumes..."
for volume in $(podman volume ls -q); do
    echo "  $volume"
    podman volume export "$volume" | gzip > "$BACKUP_DIR/volumes/${volume}.tar.gz"
    podman volume inspect "$volume" > "$BACKUP_DIR/volumes/${volume}-metadata.json"
done

# Backup container metadata
echo ""
echo "Saving container metadata..."
for container in $(podman ps -a --format "{{.Names}}"); do
    echo "  $container"
    podman inspect "$container" > "$BACKUP_DIR/containers/${container}-inspect.json"
    podman export "$container" | gzip > "$BACKUP_DIR/containers/${container}.tar.gz"
done

# Save network configuration
echo ""
echo "Saving network configuration..."
podman network ls --format "{{.Name}}" | while read -r network; do
    podman network inspect "$network" > "$BACKUP_DIR/${network}-network.json" 2>/dev/null
done

# Save a complete system info dump
podman system info > "$BACKUP_DIR/system-info.txt"
podman images --format json > "$BACKUP_DIR/images-list.json"
podman ps -a --format json > "$BACKUP_DIR/containers-list.json"
podman pod ps --format json > "$BACKUP_DIR/pods-list.json"
podman volume ls --format json > "$BACKUP_DIR/volumes-list.json"

TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
echo ""
echo "=== Backup Complete ==="
echo "Location: $BACKUP_DIR"
echo "Total size: $TOTAL_SIZE"
echo ""
echo "You can now safely run: podman system reset"
```

If you use `podman machine`, back that up separately. `podman system reset` removes machines, and the shell script above does not export VM disk images or machine configuration.

## Running the Reset

After backing up, run the reset:

```bash
# Interactive (asks for confirmation)
podman system reset

# Non-interactive (skips confirmation prompt)
podman system reset --force
```

For rootful Podman:

```bash
sudo podman system reset
```

If you use `podman.service` or `podman.socket`, restart them manually after the reset. `podman system reset` does not restart those systemd units for you.

Verify the reset was complete:

```bash
podman images    # Should show nothing
podman ps -a     # Should show nothing
podman volume ls # Should show nothing
podman network ls # Should show the default network, usually "podman"
```

## After the Reset

Reinitialize Podman and verify it is working:

```bash
# Check Podman is functional
podman info

# Run a test container
podman run --rm docker.io/library/alpine:latest echo "Podman is working"

# Check storage configuration
podman info --format '{{.Store.GraphDriverName}}'
podman info --format '{{.Store.GraphRoot}}'
```

## Restoring After Reset

If you need to restore your environment after the reset:

```bash
#!/bin/bash
# Restore from pre-reset backup

set -euo pipefail
shopt -s nullglob

BACKUP_DIR="$1"

if [ -z "$BACKUP_DIR" ]; then
    echo "Usage: $0 <backup-directory>"
    exit 1
fi

# Restore images
echo "Loading images..."
for img in "$BACKUP_DIR"/images/*.tar.gz; do
    gunzip -c "$img" | podman load
done

# Restore networks
echo "Recreating network names..."
for netconf in "$BACKUP_DIR"/*-network.json; do
    NETWORK_NAME=$(basename "$netconf" -network.json)
    if [ "$NETWORK_NAME" != "podman" ] && [ "$NETWORK_NAME" != "bridge" ]; then
        podman network create "$NETWORK_NAME" 2>/dev/null || true
    fi
done

# Restore volumes
echo "Restoring volumes..."
for archive in "$BACKUP_DIR"/volumes/*.tar.gz; do
    VOLUME_NAME=$(basename "$archive" .tar.gz)
    podman volume create "$VOLUME_NAME"
    gunzip -c "$archive" | podman volume import "$VOLUME_NAME" -
done

echo "Restore complete. Recreate containers using saved metadata and reapply any custom network settings from the saved inspect JSON."
```

## Safer Alternatives to System Reset

Before reaching for `podman system reset`, consider these less destructive options:

### podman system prune

Removes unused data without touching running containers or used images:

```bash
# Remove stopped containers, unused networks, dangling images, and dangling build cache
podman system prune

# Also remove unused images (not just dangling ones)
podman system prune --all

# Remove everything including volumes (still safer than reset)
podman system prune --all --volumes

# Force without confirmation
podman system prune --all --force
```

### Selective cleanup

Target specific resource types:

```bash
# Remove only stopped containers
podman container prune

# Remove only unused images
podman image prune --all

# Remove only unused volumes
podman volume prune

# Remove only unused networks
podman network prune

# Also remove build containers left behind by interrupted builds
podman system prune --build
```

### Size-aware cleanup

Check what is consuming space before deciding what to remove:

```bash
# Show disk usage by resource type
podman system df

# Show detailed usage
podman system df -v
```

Example output:

```text
TYPE           TOTAL  ACTIVE  SIZE     RECLAIMABLE
Images         15     5       4.2GB    2.8GB (66%)
Containers     8      3       512MB    256MB (50%)
Local Volumes  6      4       1.8GB    400MB (22%)
```

This gives you a quick summary of where the space is going. Keep in mind that reclaimable image size can be an overestimate when images share layers.

### Fix storage issues without reset

For Podman version migrations, runtime changes, or rootless ID-mapping changes, try `podman system migrate` first:

```bash
podman system migrate
```

This migrates existing containers to the current Podman version. It is also the documented way to stop the rootless pause process before changing `/etc/subuid` or `/etc/subgid`, and it can switch existing containers to a new OCI runtime with `--new-runtime`.

## Comparison: Reset vs Prune vs Migrate

| Command | Scope | Data Loss | When to Use |
|---------|-------|-----------|-------------|
| `podman system migrate` | Existing containers and rootless pause process | None | After Podman upgrade, OCI runtime change, or `/etc/subuid`/`/etc/subgid` changes |
| `podman container prune` | Stopped containers | Minimal | Routine cleanup |
| `podman system prune` | Unused resources | Moderate | Disk space recovery |
| `podman system prune --all --volumes` | All unused resources | Significant | Aggressive disk recovery |
| `podman system reset` | Everything | Total | Corrupted storage, driver change |

Always start with the least destructive option and escalate only if needed.

## Automating Safe Resets

If you need to reset regularly (for example, in CI/CD environments), wrap the reset in a safety script:

```bash
#!/bin/bash
# safe-reset.sh - Reset with automatic backup

set -euo pipefail

echo "This will reset ALL Podman data."
echo "A backup will be created first."
echo ""

# Check current state before backing up
CONTAINER_COUNT=$(podman ps -aq | wc -l)
IMAGE_COUNT=$(podman images -q | wc -l)
VOLUME_COUNT=$(podman volume ls -q | wc -l)

echo "Current state:"
echo "  Containers: $CONTAINER_COUNT"
echo "  Images: $IMAGE_COUNT"
echo "  Volumes: $VOLUME_COUNT"
echo ""

read -p "Create backup and reset? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Aborted."
    exit 0
fi

# Create backup
/usr/local/bin/podman-pre-reset-backup.sh

# Perform reset
podman system reset --force

echo ""
echo "Reset complete. Podman storage is now empty."
echo "Use the backup directory to restore if needed."
```

## Conclusion

The `podman system reset` command is a useful tool when you genuinely need to start from scratch, but it should be a last resort, not a first response. Always back up before resetting, always try less destructive alternatives first, and always verify that Podman is functional after the reset. Understanding the difference between `prune`, `migrate`, and `reset` gives you the right tool for each situation. Use `migrate` for Podman version or rootless user-namespace migration tasks, `prune` for space recovery, and `reset` only when you truly need to reinitialize Podman storage.
