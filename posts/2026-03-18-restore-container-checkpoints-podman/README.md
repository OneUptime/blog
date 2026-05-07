# How to Restore Container Checkpoints with Podman

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Podman, Checkpoint, CRIU, Container Restore, DevOps

Description: A guide to restoring Podman container checkpoints, covering local restore, cross-host restore, conflict resolution, and validation of restored containers.

---

> A checkpoint is only valuable if you can restore it. Learn how to bring checkpointed Podman containers back to life with their full runtime state intact.

Creating checkpoints is half the story. The real value comes from restoring them: bringing a container back to life with its memory, processes, and supported network state as they were at checkpoint time. This guide covers the restore process in detail, including local restores, cross-host restores, handling conflicts, and verifying that the restored container is working correctly.

---

## Basic Restore from a Local Checkpoint

If you checkpointed a container without exporting it, the checkpoint data is stored locally. Restore it with:

```bash
sudo podman container restore counter
```

The container resumes execution from exactly where it was checkpointed. Processes continue running, in-memory variables retain their values, and the filesystem is in the same state.

Verify the restore worked:

```bash
sudo podman ps
sudo podman logs counter | tail -10
```

You should see the counter continuing from where it left off, not starting over from zero.

## Restoring from an Exported Checkpoint

When you exported a checkpoint to a tar archive, restore it with the `--import` flag:

```bash
sudo podman container restore --import /backups/counter-checkpoint.tar.gz
```

This recreates the container with its original name, configuration, and runtime state.

## Restore Options

### Restore with a Different Name

If a container with the original name already exists, or you want to run the restored container alongside the original:

```bash
sudo podman container restore \
    --import /backups/app-checkpoint.tar.gz \
    --name app-restored
```

Do not use `--name` when restoring a checkpoint that needs `--tcp-established`; Podman cannot assign a new name and preserve the original TCP connection state at the same time.

### Restore While Ignoring Static IP or MAC

If the original container was created with a static IP or MAC address and that address is already in use on the restore host, tell Podman not to reuse it:

```bash
sudo podman container restore \
    --import /backups/app-checkpoint.tar.gz \
    --ignore-static-ip \
    --ignore-static-mac
```

### Restore with TCP Connections

If the checkpoint was created with `--tcp-established`, use the same flag on restore:

```bash
sudo podman container restore \
    --import /backups/web-server-checkpoint.tar.gz \
    --tcp-established
```

Note that restored TCP connections will only work if the remote endpoints are still available and expecting the connection. In practice, the remote side may have timed out and closed the connection.

### Restore with Different Port Mappings

You can change port mappings during restore:

```bash
sudo podman container restore \
    --import /backups/app-checkpoint.tar.gz \
    --publish 9090:8080
```

This is useful when the original port is already in use on the restore target.

## Cross-Host Restore

One of the most powerful use cases for checkpointing is migrating a running container from one host to another. The process is:

### On the source host

```bash
# Checkpoint and export

sudo podman container checkpoint production-app \
    --export /tmp/production-app-checkpoint.tar.gz \
    --compress=gzip \
    --tcp-established

# Transfer to destination
scp /tmp/production-app-checkpoint.tar.gz user@new-host:/tmp/
```

### On the destination host

```bash
# Restore the container
sudo podman container restore \
    --import /tmp/production-app-checkpoint.tar.gz \
    --tcp-established

# Verify it is running
sudo podman ps
sudo podman logs production-app | tail -5
```

### Requirements for Cross-Host Restore

Cross-host restore works reliably when:

- Both hosts run the same CPU architecture (x86_64 to x86_64, not x86_64 to ARM).
- Both hosts run compatible kernel versions. The destination kernel should be the same version or newer.
- CRIU versions are compatible on both hosts.
- The destination host has the same or similar Podman version.
- Network configuration (bridges, DNS) is compatible.

Check compatibility before attempting:

```bash
# On both hosts, compare
uname -r          # Kernel version
criu --version    # CRIU version
podman --version  # Podman version
```

## Handling Restore Conflicts

### Container Name Conflict

If a container with the same name exists:

```bash
# Option 1: Remove the existing container
sudo podman rm -f existing-container
sudo podman container restore --import /backups/checkpoint.tar.gz

# Option 2: Use a different name
sudo podman container restore \
    --import /backups/checkpoint.tar.gz \
    --name restored-app
```

Remember that `--name` cannot be combined with `--tcp-established`.

### Port Conflict

If the port is already in use:

```bash
# Check what is using the port
sudo ss -tlnp | grep :8080

# Restore with a different port
sudo podman container restore \
    --import /backups/checkpoint.tar.gz \
    --publish 8081:80
```

### Volume Conflicts

If the checkpoint includes named volumes, Podman restores their contents by default and the destination host must not already have volumes with the same names. Remove or rename conflicting destination volumes first, or use `--ignore-volumes` if you want to attach existing volumes without restoring the checkpointed volume contents.

Bind-mount source paths are different: those paths must exist on the destination host before restore.

```bash
# Check named volumes and bind mounts the checkpoint expects
TMPDIR=$(mktemp -d)
tar xzf /backups/checkpoint.tar.gz -C "$TMPDIR" config.dump spec.dump
python3 - "$TMPDIR" <<'PY'
import json, pathlib, sys

checkpoint = pathlib.Path(sys.argv[1])
config = json.loads((checkpoint / "config.dump").read_text())
spec = json.loads((checkpoint / "spec.dump").read_text())

for volume in config.get("namedVolumes", []):
    print(f"Named volume: {volume['volumeName']} -> {volume['dest']}")

for mount in spec.get("mounts", []):
    if mount.get("type") == "bind":
        print(f"Bind mount: {mount.get('source')} -> {mount.get('destination')}")
PY
rm -rf "$TMPDIR"

# If an existing named volume conflicts and you do not need its contents
sudo podman volume rm app-data

# Or keep existing destination volumes and skip restoring checkpointed volume data
sudo podman container restore \
    --import /backups/checkpoint.tar.gz \
    --ignore-volumes
```

## Validating a Restored Container

After restoring, verify the container is functioning correctly:

```bash
#!/bin/bash

CONTAINER="$1"

echo "Validating restored container: $CONTAINER"

# Check container is running
STATUS=$(sudo podman inspect "$CONTAINER" --format '{{.State.Status}}')
if [ "$STATUS" != "running" ]; then
    echo "FAIL: Container is not running (status: $STATUS)"
    exit 1
fi
echo "Status: running"

# Check processes are active
PIDS=$(sudo podman top "$CONTAINER" pid | tail -n +2 | wc -l)
echo "Active processes: $PIDS"

# Check network connectivity
sudo podman exec "$CONTAINER" ping -c 1 -W 2 8.8.8.8 > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "Network: OK"
else
    echo "Network: No external connectivity (may be expected)"
fi

# Check logs for errors since restore
ERRORS=$(sudo podman logs "$CONTAINER" 2>&1 | tail -20 | grep -ci "error\|fatal\|panic")
if [ "$ERRORS" -gt 0 ]; then
    echo "WARNING: Found $ERRORS error messages in recent logs"
    sudo podman logs "$CONTAINER" 2>&1 | tail -20 | grep -i "error\|fatal\|panic"
else
    echo "Logs: No errors detected"
fi

echo "Validation complete"
```

## Restoring Multiple Containers

When restoring an entire application stack, order matters. Restore dependencies first:

```bash
#!/bin/bash

CHECKPOINT_DIR="/backups/full-stack-checkpoint"

# Restore in dependency order
echo "Restoring database..."
sudo podman container restore \
    --import "$CHECKPOINT_DIR/postgres-db.tar.gz"

echo "Waiting for database to be ready..."
sleep 5

echo "Restoring cache..."
sudo podman container restore \
    --import "$CHECKPOINT_DIR/redis-cache.tar.gz"

echo "Restoring application..."
sudo podman container restore \
    --import "$CHECKPOINT_DIR/web-app.tar.gz" \
    --tcp-established

echo "Restoring reverse proxy..."
sudo podman container restore \
    --import "$CHECKPOINT_DIR/nginx-proxy.tar.gz" \
    --tcp-established

# Verify all containers
echo ""
echo "Restored containers:"
sudo podman ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

## Rollback with Checkpoints

Use checkpoints as rollback points during deployments:

```bash
#!/bin/bash

APP_NAME="$1"
NEW_IMAGE="$2"

CHECKPOINT="/tmp/${APP_NAME}-rollback.tar.gz"

echo "Creating rollback checkpoint..."
sudo podman container checkpoint "$APP_NAME" \
    --export "$CHECKPOINT" \
    --compress=gzip \
    --leave-running

echo "Deploying new version..."
sudo podman stop "$APP_NAME"
sudo podman rm "$APP_NAME"
sudo podman run -d --name "$APP_NAME" $NEW_IMAGE

echo "Waiting for container start..."
sleep 10

# Check if the new version is running
HEALTHY=$(sudo podman inspect "$APP_NAME" --format '{{.State.Running}}')

if [ "$HEALTHY" = "true" ]; then
    echo "Deployment successful. Removing rollback checkpoint."
    rm "$CHECKPOINT"
else
    echo "Deployment FAILED. Rolling back..."
    sudo podman rm -f "$APP_NAME"
    sudo podman container restore --import "$CHECKPOINT"
    echo "Rollback complete."
fi
```

## Troubleshooting Restore Failures

### "Error: container already exists"

Remove or rename the existing container, or use `--name` to restore with a different name.

### "Error: failed to restore: criu failed"

Check CRIU compatibility. The most common cause is a kernel version mismatch between the checkpoint host and restore host.

```bash
# Re-run with Podman debug logging and keep CRIU artifacts for inspection
sudo podman --log-level=debug container restore \
    --keep \
    --import /backups/checkpoint.tar.gz
```

### "Error: restoring file locks failed"

If the checkpoint was created with file locks that conflict:

```bash
sudo podman container restore \
    --import /backups/checkpoint.tar.gz \
    --file-locks
```

### Restore takes a long time

Large checkpoints (containers with lots of memory) take longer to restore because all the process memory must be loaded back. Monitor progress with:

```bash
# In another terminal
watch -n 1 'sudo podman ps -a --format "table {{.Names}}\t{{.Status}}"'
```

## Conclusion

Restoring checkpoints gives you the ability to resume containers exactly where they left off, whether on the same host or a different one. This is invaluable for low-downtime migrations, faster rollbacks, and debugging. Always validate restored containers, handle conflicts with naming and port remapping, and remember that cross-host restores require compatible kernel and CRIU versions. The investment in understanding checkpoint restore pays off the first time you need to roll back a failed deployment in seconds instead of minutes.
