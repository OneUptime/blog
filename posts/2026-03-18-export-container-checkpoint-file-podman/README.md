# How to Export a Container Checkpoint to a File with Podman

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Podman, CRIU, Container, Checkpoint Export, DevOps

Description: Learn how to export a Podman container checkpoint to a portable tar archive for migration, backup, or repeated restore operations.

---

> Exporting a container checkpoint to a file creates a portable snapshot of your container's complete runtime state that you can transfer, archive, or restore multiple times.

By default, Podman stores checkpoint data internally, tied to the specific container on the local host. Exporting the checkpoint to a file decouples it from the local Podman storage, making it portable. You can copy the file to another host for migration, store it for disaster recovery, or use it to restore the same container state repeatedly.

---

## Why Export Instead of Just Checkpoint

The standard `podman container checkpoint` command saves the checkpoint data in Podman's internal storage. This has limitations:

- The checkpoint data cannot be moved to another host
- Restoring the container consumes the checkpoint, so you can only restore once
- If you remove the container, the checkpoint data is lost

Exporting solves all three problems. The exported file is a self-contained tar archive that includes everything needed to restore the container on any compatible host.

## Basic Export

Export a checkpoint with the `--export` flag:

```bash
# Start a container

sudo podman run -d --name web-app docker.io/library/nginx:alpine

# Wait for nginx to fully start
sleep 3

# Checkpoint and export to a file
sudo podman container checkpoint web-app --compress=gzip --export=/tmp/web-app-checkpoint.tar.gz
```

The command checkpoints the container and writes the archive to the specified path. The container is stopped after the export completes.

Verify the file:

```bash
ls -lh /tmp/web-app-checkpoint.tar.gz
```

## Understanding the Archive Contents

The exported archive contains several components. Examine its structure:

```bash
tar tzf /tmp/web-app-checkpoint.tar.gz
```

The archive includes:

```text
checkpoint/          # CRIU image files
  core-1.img         # Process core state
  mm-1.img           # Memory maps
  pages-1.img        # Memory page data
  fdinfo-2.img       # File descriptor info
  pstree.img         # Process tree
  ...
config.dump          # Container configuration at checkpoint time
spec.dump            # OCI runtime spec
network.status       # Network configuration
rootfs-diff.tar      # Filesystem changes since container creation
```

**checkpoint/**: Contains all CRIU image files with the process state, memory, and file descriptors.

**config.dump**: The container's Podman configuration, including image, command, environment variables, labels, and resource limits.

**spec.dump**: The OCI runtime specification that was used to create the container.

**network.status**: The container's network namespace configuration, IP addresses, and DNS settings.

**rootfs-diff.tar**: Any files that were created or modified inside the container since it was started. This captures log files, temp files, and any runtime artifacts.

## Controlling the Export Path

You can export to any writable location:

```bash
# Export to a specific directory
sudo podman container checkpoint my-app --compress=gzip --export=/backups/checkpoints/my-app-$(date +%Y%m%d-%H%M%S).tar.gz

# Export to a shared filesystem
sudo podman container checkpoint my-app --compress=gzip --export=/nfs/shared/checkpoints/my-app.tar.gz

# Export to a temporary directory
sudo podman container checkpoint my-app --compress=gzip --export=$(mktemp /tmp/checkpoint-XXXXXX.tar.gz)
```

The directory must exist and be writable by root. The file extension does not matter to Podman. Current Podman versions use zstd compression by default, so use `--compress=gzip` when you want a gzipped `.tar.gz` archive.

## Exporting Without Stopping the Container

By default, the checkpoint operation stops the container. If you want to export a checkpoint while keeping the container running, use the `--leave-running` flag:

```bash
sudo podman container checkpoint web-app --compress=gzip --export=/tmp/web-app-snapshot.tar.gz --leave-running
```

This creates the export file but the container continues running after the checkpoint. The container is briefly frozen during the state capture but resumes immediately. This is covered in more detail in the guide on checkpointing without stopping.

## Exporting with TCP Connection State

If your container has active TCP connections that you want to preserve across the export/import cycle, add the `--tcp-established` flag:

```bash
sudo podman container checkpoint web-app --compress=gzip --export=/tmp/web-app-tcp.tar.gz --tcp-established
```

This tells CRIU to include TCP socket state in the checkpoint. The connections can be restored on the target host, though the remote endpoints must still be reachable.

## Export File Size Considerations

The checkpoint file size is primarily determined by:

**Memory usage**: The largest contributor. Each page of process memory is written to the archive. A container using 500 MB of RAM will produce at least a 500 MB checkpoint file (before compression).

**Filesystem diff**: Any files created or modified inside the container add to the archive size. Log files, caches, and temporary files all count.

**Compression**: With `--compress=gzip`, the archive is gzipped, so the actual file size depends on how compressible the data is. Random data (encryption keys, compressed images) does not compress well. Text-heavy memory content compresses significantly.

Check memory usage before exporting to estimate the file size:

```bash
sudo podman stats --no-stream web-app
```

For very large containers, ensure you have enough disk space for the export file:

```bash
# Check available disk space
df -h /tmp
```

## Archiving Checkpoints for Backup

Exported checkpoints make excellent backups for stateful containers. Create a backup strategy:

```bash
#!/bin/bash
# Backup script for stateful containers
BACKUP_DIR="/backups/container-checkpoints"
CONTAINER_NAME="$1"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${CONTAINER_NAME}-${TIMESTAMP}.tar.gz"

mkdir -p "${BACKUP_DIR}"

# Export checkpoint without stopping the container
sudo podman container checkpoint "${CONTAINER_NAME}" \
  --compress=gzip \
  --export="${BACKUP_FILE}" \
  --leave-running

echo "Checkpoint exported to: ${BACKUP_FILE}"
echo "File size: $(du -h "${BACKUP_FILE}" | cut -f1)"

# Clean up old backups (keep last 5)
ls -t "${BACKUP_DIR}/${CONTAINER_NAME}-"*.tar.gz | tail -n +6 | xargs rm -f
```

This script creates timestamped checkpoints without stopping the container and keeps the five most recent backups.

## Verifying Export Integrity

After exporting, verify the archive is valid:

```bash
# Check the archive is a valid gzip file
file /tmp/web-app-checkpoint.tar.gz

# Verify the archive can be read
tar tzf /tmp/web-app-checkpoint.tar.gz > /dev/null && echo "Archive is valid" || echo "Archive is corrupted"

# Check that critical files are present
tar tzf /tmp/web-app-checkpoint.tar.gz | grep -E "config.dump|spec.dump|checkpoint/"
```

For long-term storage, generate a checksum:

```bash
sha256sum /tmp/web-app-checkpoint.tar.gz > /tmp/web-app-checkpoint.tar.gz.sha256

# Verify later
sha256sum -c /tmp/web-app-checkpoint.tar.gz.sha256
```

## Exporting Multiple Containers

When exporting checkpoints for several related containers, organize them together:

```bash
#!/bin/bash
EXPORT_DIR="/tmp/stack-checkpoint-$(date +%Y%m%d)"
mkdir -p "${EXPORT_DIR}"

CONTAINERS=("database" "app-server" "cache" "web-frontend")

for container in "${CONTAINERS[@]}"; do
  echo "Exporting ${container}..."
  sudo podman container checkpoint "${container}" \
    --compress=gzip \
    --export="${EXPORT_DIR}/${container}.tar.gz"
done

# Create a manifest
echo "Checkpoint manifest - $(date)" > "${EXPORT_DIR}/manifest.txt"
for f in "${EXPORT_DIR}"/*.tar.gz; do
  echo "$(basename "$f"): $(du -h "$f" | cut -f1) - $(sha256sum "$f" | cut -d' ' -f1)" >> "${EXPORT_DIR}/manifest.txt"
done

# Package everything together
tar czf "/tmp/full-stack-checkpoint.tar.gz" -C "$(dirname "${EXPORT_DIR}")" "$(basename "${EXPORT_DIR}")"
echo "Full stack checkpoint: /tmp/full-stack-checkpoint.tar.gz"
```

## Common Export Errors

**"checkpoint failed: no such container"**: Verify the container name with `sudo podman ps`.

**"permission denied" on export path**: The export path must be writable by root. Check directory permissions.

**"no space left on device"**: The disk is full. Free space or export to a different filesystem.

**Slow export for large containers**: This is normal. The memory dump and compression take time proportional to the container's memory usage. Monitor progress with `--log-level=debug`.

## Conclusion

Exporting a container checkpoint to a file creates a portable, self-contained snapshot of the container's runtime state. The exported archive includes CRIU process images, container configuration, network state, filesystem changes, and associated volume contents unless you use `--ignore-volumes`. This file can be transferred to another host for migration, stored for backup purposes, or used for repeated restores from the same state. Key considerations are disk space for large containers, archive integrity verification, and understanding whether you want to include or exclude volumes.
