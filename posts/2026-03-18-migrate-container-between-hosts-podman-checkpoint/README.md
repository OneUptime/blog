# How to Migrate a Container Between Hosts with Podman Checkpoint

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Podman, CRIU, Container, Migration, DevOps

Description: A complete walkthrough of migrating a running container from one host to another using Podman's checkpoint and restore features, including state export, transfer, and restoration on the target host.

---

> Live container migration with Podman lets you move a running application from one host to another without losing its in-memory state or accumulated runtime data.

Moving containers between hosts normally means stopping the application, recreating it on the new host, and losing all runtime state. With Podman's checkpoint/restore and export/import workflow, you can capture the state of a running container, transfer it to another machine, and resume it there. The application continues from exactly where it left off.

---

## Migration Overview

The migration process has four steps:

1. Checkpoint the container on the source host and export to a file
2. Transfer the checkpoint file to the target host
3. Import and restore the container on the target host
4. Verify the migrated container is running correctly

Both hosts need Podman and CRIU installed. The target host needs to have a compatible kernel, CPU architecture, and container runtime.

## Preparing Both Hosts

On both the source and target hosts, verify Podman and CRIU are installed and working:

```bash
# Run on both hosts

podman --version
criu --version
sudo criu check
```

The CRIU versions should be the same or very close on both hosts. Significant version mismatches can cause restore failures because the checkpoint image format may differ.

Check kernel compatibility:

```bash
# Run on both hosts
uname -r
uname -m
```

The CPU architecture must match. You cannot migrate a checkpoint from an x86_64 host to an aarch64 host. The kernel versions should be close, though exact matches are not required.

## Setting Up the Source Container

Create a container with meaningful state that we can verify after migration:

```bash
# On the source host
sudo podman run -d --name migrate-demo docker.io/library/alpine \
  /bin/sh -c '
    hostname > /tmp/migration-state.txt
    echo "Started at: $(date)" >> /tmp/migration-state.txt
    counter=0
    while true; do
      counter=$((counter+1))
      echo "Processed $counter items at $(date)" >> /tmp/migration-state.txt
      echo "Item count: $counter"
      sleep 1
    done
  '
```

Let the container accumulate state:

```bash
sleep 15
sudo podman exec migrate-demo cat /tmp/migration-state.txt
sudo podman logs --tail 5 migrate-demo
```

Note the counter value. After migration, it should continue from this number.

## Checkpointing and Exporting

Checkpoint the container and export it to a tar archive in a single command:

```bash
# On the source host
sudo podman container checkpoint migrate-demo --export=/tmp/migrate-demo.tar.gz \
  --compress=gzip
```

This command:

1. Freezes all processes in the container
2. Dumps the process state via CRIU
3. Packages the checkpoint data along with the container's filesystem changes into a gzip-compressed tar archive
4. Stops the container

Verify the export file was created:

```bash
ls -lh /tmp/migrate-demo.tar.gz
```

The file size depends on the container's memory usage and filesystem changes. For our simple Alpine container, it should be relatively small.

You can inspect the contents of the archive:

```bash
tar tzf /tmp/migrate-demo.tar.gz | head -20
```

The archive contains checkpoint image files, container configuration, and filesystem diffs.

## Transferring the Checkpoint

Transfer the checkpoint file to the target host. Use whatever method suits your infrastructure:

**Using scp:**

```bash
scp /tmp/migrate-demo.tar.gz user@target-host:/tmp/
```

**Using rsync for large checkpoints:**

```bash
rsync -avz --progress /tmp/migrate-demo.tar.gz user@target-host:/tmp/
```

**Using a shared filesystem (NFS, GlusterFS):**

```bash
cp /tmp/migrate-demo.tar.gz /shared-storage/checkpoints/
# On the target host, access it from the same shared mount
```

For production migrations, consider the transfer time. A container with a large memory footprint will produce a large checkpoint file. A 2 GB checkpoint over a 1 Gbps network takes about 16 seconds to transfer, during which the container is not running on either host.

## Restoring on the Target Host

On the target host, import and restore the container:

```bash
# On the target host
sudo podman container restore --import=/tmp/migrate-demo.tar.gz --name=migrate-demo
```

The `--name` flag sets the container name on the target host. Without it, Podman uses the original container name.

Verify the container is running:

```bash
sudo podman ps
```

Check that the state was preserved:

```bash
sudo podman exec migrate-demo cat /tmp/migration-state.txt
sudo podman logs --tail 5 migrate-demo
```

The counter should continue from where it was when the checkpoint happened. The migration-state.txt file should contain all entries from the source host plus new entries being added on the target host.

## Handling Container Images

The checkpoint archive includes the container's filesystem diffs but not the base image. The target host must have the same container image available:

```bash
# On the target host, pull the image before restoring
sudo podman pull docker.io/library/alpine
```

If the image is not available, the restore will fail with an error about missing layers. For custom images, push them to a registry that both hosts can access:

```bash
# On the source host
sudo podman push my-app:latest registry.example.com/my-app:latest

# On the target host
sudo podman pull registry.example.com/my-app:latest
```

## Migration with Network Considerations

Network configuration is one of the trickiest parts of container migration. The restored container generally tries to use the same network settings it had on the source host.

If both hosts use the same network configuration (same subnet, same bridge network), the migration is straightforward. If the network topology differs, you may need to adjust published ports or ignore static addressing from the original container:

```bash
# Restore with a different published port and ignore a static IP from the source
sudo podman container restore --import=/tmp/migrate-demo.tar.gz \
  --name=migrate-demo \
  --publish=8081:8080 \
  --ignore-static-ip
```

For containers that had port mappings on the source host, the same ports must be available on the target host unless you replace them with `--publish`. If port 8080 was mapped on the source and you keep the same mapping, it cannot be in use on the target.

## Migration with Volumes

Volumes present a challenge for migration because checkpoint archives include named volume data by default. For large volumes, shared storage, or volume data you want to transfer separately, exclude the volume contents from the checkpoint and handle them with Podman's volume export and import commands:

```bash
# On the source host - container with a volume
sudo podman run -d --name app-with-data \
  -v app-data:/data \
  docker.io/library/alpine \
  /bin/sh -c 'while true; do date >> /data/log.txt; sleep 1; done'

# Before checkpointing, export the volume data
sudo podman volume export app-data --output /tmp/app-data-volume.tar

# Checkpoint and export without embedding volume contents
sudo podman container checkpoint app-with-data \
  --export=/tmp/app-with-data.tar.gz \
  --compress=gzip \
  --ignore-volumes

# Transfer both files to the target host
scp /tmp/app-with-data.tar.gz /tmp/app-data-volume.tar user@target-host:/tmp/
```

On the target host:

```bash
# Create the volume and populate it
sudo podman volume create app-data
sudo podman volume import app-data /tmp/app-data-volume.tar

# Restore the container
sudo podman container restore --import=/tmp/app-with-data.tar.gz \
  --name=app-with-data \
  --ignore-volumes
```

## Scripting the Migration

For repeated migrations, wrap the process in a script:

```bash
#!/bin/bash
set -euo pipefail

CONTAINER_NAME="$1"
TARGET_HOST="$2"
CHECKPOINT_FILE="/tmp/${CONTAINER_NAME}-checkpoint.tar.gz"

echo "Checkpointing ${CONTAINER_NAME}..."
sudo podman container checkpoint "${CONTAINER_NAME}" --export="${CHECKPOINT_FILE}" --compress=gzip

echo "Transferring checkpoint to ${TARGET_HOST}..."
scp "${CHECKPOINT_FILE}" "${TARGET_HOST}:${CHECKPOINT_FILE}"

echo "Restoring on ${TARGET_HOST}..."
ssh "${TARGET_HOST}" "sudo podman container restore --import=${CHECKPOINT_FILE} --name=${CONTAINER_NAME}"

echo "Verifying..."
ssh "${TARGET_HOST}" "sudo podman ps --filter name=${CONTAINER_NAME}"

echo "Migration complete. Cleaning up local checkpoint file..."
rm -f "${CHECKPOINT_FILE}"
```

Usage:

```bash
chmod +x migrate-container.sh
./migrate-container.sh my-app target-host.example.com
```

## Measuring Migration Downtime

The total migration downtime is the sum of checkpoint time, transfer time, and restore time. Measure each phase:

```bash
echo "Checkpoint phase:"
time sudo podman container checkpoint migrate-demo --export=/tmp/migrate-demo.tar.gz --compress=gzip

echo "Transfer phase:"
time scp /tmp/migrate-demo.tar.gz target-host:/tmp/

echo "Restore phase (run on target):"
# ssh target-host "time sudo podman container restore --import=/tmp/migrate-demo.tar.gz"
```

For a small container, total downtime can be under 5 seconds. For larger containers, the memory dump and transfer phases dominate the downtime.

## Conclusion

Migrating a container between hosts with Podman checkpoint/restore involves exporting the checkpoint to a file, transferring it, and importing it on the target host. The key requirements are matching CPU architectures, compatible CRIU versions, compatible container runtimes, and the same container image on both hosts. Volume data may need to be handled separately for large volumes or shared storage. The total downtime equals the sum of checkpoint, transfer, and restore times, making this approach suitable for workloads that need minimal interruption during host maintenance or load rebalancing.
