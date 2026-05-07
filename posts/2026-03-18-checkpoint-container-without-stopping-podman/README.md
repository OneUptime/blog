# How to Checkpoint a Container Without Stopping It in Podman

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Podman, CRIU, Container, Live Checkpoint, DevOps

Description: Learn how to create a checkpoint of a running Podman container without stopping it, enabling live snapshots for backup, debugging, and state preservation while the container keeps serving traffic.

---

> Taking a checkpoint without stopping the container lets you snapshot its state for backup or debugging while the application continues to run and serve requests with minimal interruption.

The default checkpoint behavior in Podman stops the container after capturing its state. But there are many scenarios where you want to take a snapshot without interrupting the workload. Podman supports this with the `--leave-running` flag, which briefly freezes the container to capture its state, then immediately resumes it.

---

## The Default Behavior

By default, `podman container checkpoint` stops the container after the checkpoint completes:

```bash
sudo podman run -d --name default-test docker.io/library/alpine sleep 3600
sudo podman container checkpoint default-test

# Container is now stopped

sudo podman ps  # default-test will not appear
```

This is the correct behavior when you intend to migrate or fully restore the container later. But it is not acceptable when you need the container to keep running.

## Using --leave-running

The `--leave-running` flag tells Podman to resume the container after the checkpoint:

```bash
sudo podman run -d --name live-app docker.io/library/nginx:alpine
sleep 2

# Checkpoint without stopping
sudo podman container checkpoint live-app --leave-running

# Container is still running
sudo podman ps --filter name=live-app
```

The container will still appear in `podman ps` as running. The nginx process inside continues to accept connections.

## How It Works Internally

When you use `--leave-running`, the following sequence occurs:

1. **Freeze**: All processes in the container are frozen, typically by CRIU using ptrace or the freezer cgroup. No code executes during this phase.

2. **Dump**: CRIU reads the process state, memory pages, file descriptors, and other state from the frozen processes. It writes this data to checkpoint image files.

3. **Resume**: Instead of killing the processes (the default), Podman tells the runtime to resume them. All processes resume execution.

The freeze duration depends on the container's memory footprint and the number of processes. For a typical web application using a few hundred megabytes of RAM, the freeze lasts a few hundred milliseconds to a few seconds.

## Measuring the Freeze Duration

You can measure how long the container is frozen:

```bash
# Start a container that logs timestamps every 100ms
sudo podman run -d --name timing-test docker.io/library/alpine \
  /bin/sh -c 'while true; do date +%H:%M:%S.%N; sleep 0.1; done'

sleep 5

# Checkpoint without stopping
sudo podman container checkpoint timing-test --leave-running

# Check the logs for a gap in timestamps
sudo podman logs timing-test | tail -30
```

You will see a gap in the timestamps corresponding to the freeze duration. Before the gap, timestamps increment by ~100ms. The gap shows how long the container was frozen.

## Combining with Export

You can combine `--leave-running` with `--export` to create a portable checkpoint file without stopping the container:

```bash
sudo podman container checkpoint live-app \
  --leave-running \
  --export=/tmp/live-app-snapshot.tar.gz
```

This is the foundation of a live backup strategy. The container keeps running while you get a portable snapshot of its state.

## Taking Periodic Snapshots

Create a script that takes periodic snapshots of a running container:

```bash
#!/bin/bash
set -euo pipefail

CONTAINER_NAME="$1"
SNAPSHOT_DIR="/backups/snapshots/${CONTAINER_NAME}"
INTERVAL_SECONDS="${2:-300}"  # Default: every 5 minutes
MAX_SNAPSHOTS="${3:-12}"       # Default: keep 12 snapshots

mkdir -p "${SNAPSHOT_DIR}"

while true; do
  TIMESTAMP=$(date +%Y%m%d-%H%M%S)
  SNAPSHOT_FILE="${SNAPSHOT_DIR}/${TIMESTAMP}.tar.gz"

  echo "[$(date)] Taking snapshot of ${CONTAINER_NAME}..."

  if sudo podman container checkpoint "${CONTAINER_NAME}" \
    --leave-running \
    --export="${SNAPSHOT_FILE}" 2>/dev/null; then
    SIZE=$(du -h "${SNAPSHOT_FILE}" | cut -f1)
    echo "[$(date)] Snapshot saved: ${SNAPSHOT_FILE} (${SIZE})"
  else
    echo "[$(date)] Error: Snapshot failed"
  fi

  # Rotate old snapshots
  ls -t "${SNAPSHOT_DIR}"/*.tar.gz 2>/dev/null | tail -n +$((MAX_SNAPSHOTS+1)) | xargs rm -f 2>/dev/null

  sleep "${INTERVAL_SECONDS}"
done
```

Usage:

```bash
# Snapshot every 10 minutes, keep last 6
./snapshot.sh my-app 600 6
```

## Live Checkpoint for Debugging

One powerful use case is capturing the state of a misbehaving container without stopping it:

```bash
# Container is showing unusual behavior
# Take a snapshot for later analysis
sudo podman container checkpoint problematic-app \
  --leave-running \
  --export=/tmp/debug-snapshot-$(date +%s).tar.gz

# The container keeps running, serving users
# Later, import the snapshot on a debug machine
sudo podman container restore \
  --import=/tmp/debug-snapshot-*.tar.gz \
  --name=debug-instance
```

You can then inspect the debug instance without affecting the production container. Examine memory, process state, file contents, and environment variables at the exact moment the snapshot was taken.

## Impact on Container Performance

The `--leave-running` checkpoint has a brief but measurable impact on the container:

**During freeze**: Zero throughput. All processes are stopped. Incoming network packets are queued by the kernel's network stack.

**Memory overhead**: CRIU identifies memory mappings through `/proc/[pid]/smaps`, `/proc/[pid]/map_files`, and `/proc/[pid]/pagemap`, then extracts the required pages from the process. For large containers, this means reading potentially gigabytes of memory data.

**Disk I/O**: The checkpoint data is written to disk during the freeze. This competes with other I/O on the system.

**After resume**: The container returns to normal performance immediately. There is no application startup warmup because processes resume from their existing state, although CPU cache contents are not guaranteed to be preserved.

To minimize impact:

```bash
# Use fast storage for the checkpoint output
sudo podman container checkpoint my-app \
  --leave-running \
  --export=/dev/shm/checkpoint.tar.gz  # tmpfs for speed

# Move to permanent storage after
mv /dev/shm/checkpoint.tar.gz /backups/
```

## Limitations of Leave-Running Checkpoints

There are some important limitations to understand:

**The checkpoint data is a point-in-time snapshot**. The container continues running and changing state after the checkpoint. If you restore from this snapshot, the restored container will be in the state it was at checkpoint time, not at restore time.

**TCP connections**: Active TCP connections in the running container will continue normally, but Podman does not checkpoint established TCP connections by default. If you need to include them, use `--tcp-established` during checkpoint and restore, and test the workflow carefully because leaving tasks running can make TCP state inconsistent by the time you restore.

**File-based state**: Files that the container modifies after the checkpoint will not be in the snapshot. If the container writes critical data to its filesystem, the snapshot will have the pre-write state.

**Consistency**: For databases and other transactional systems, the snapshot captures whatever state the processes were in at freeze time. This is similar to a crash-consistent backup, not an application-consistent one. The database's crash recovery mechanisms will handle any in-flight transactions upon restore.

## Verifying the Snapshot Is Valid

After taking a live snapshot, verify it can actually be restored:

```bash
# Take the snapshot
sudo podman container checkpoint live-app \
  --leave-running \
  --export=/tmp/snapshot.tar.gz

# Restore to a different name to verify
sudo podman container restore \
  --import=/tmp/snapshot.tar.gz \
  --name=snapshot-verify

# Check the restored container
sudo podman ps --filter name=snapshot-verify
sudo podman exec snapshot-verify ps aux

# Clean up the verification container
sudo podman rm -f snapshot-verify
```

This confirms the snapshot is valid without affecting the running container.

## Conclusion

Checkpointing a container without stopping it is done by adding `--leave-running` to the checkpoint command. The container is briefly frozen while CRIU captures its state, then immediately resumed. This enables live backups, periodic snapshots, and debugging captures without taking the workload offline. The freeze duration is proportional to the container's memory footprint, typically ranging from milliseconds for small containers to a few seconds for large ones. The main limitations are around consistency: the snapshot is crash-consistent, not application-consistent, and any state changes after the snapshot are not captured.
