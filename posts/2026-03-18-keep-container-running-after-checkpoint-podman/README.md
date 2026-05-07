# How to Keep the Container Running After Checkpoint in Podman

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Podman, CRIU, Container, Checkpoint, Live Backup

Description: Learn to use Podman's --leave-running and --pre-checkpoint options to create container checkpoints without stopping workloads or causing downtime.

---

> Keeping a container running after a checkpoint means you can capture its state for backup, cloning, or migration without interrupting the service it provides.

In production environments, stopping a container to take a checkpoint is often unacceptable. Users experience downtime, requests are dropped, and dependent services may fail. Podman provides mechanisms to checkpoint a root container while it continues to serve traffic, making checkpoint/restore practical for production workloads that CRIU can handle.

---

## The --leave-running Flag

The primary mechanism for keeping a container running after a checkpoint is the `--leave-running` flag:

```bash
sudo podman container checkpoint my-container --leave-running
```

This creates the checkpoint data in Podman's internal storage without stopping the container. The container is briefly frozen (all processes paused) while CRIU captures the state, then immediately resumed.

Compare the two modes:

```bash
# Default: checkpoint and stop

sudo podman run -d --name stop-test docker.io/library/alpine sleep 3600
sudo podman container checkpoint stop-test
sudo podman ps --filter name=stop-test  # Not running

# Leave running: checkpoint and continue
sudo podman run -d --name run-test docker.io/library/alpine sleep 3600
sudo podman container checkpoint run-test --leave-running
sudo podman ps --filter name=run-test  # Still running
```

## Use Cases for Keep-Running Checkpoints

### Live Backup

Take periodic backups of a stateful container without downtime:

```bash
sudo podman container checkpoint stateful-app \
  --leave-running \
  --export=/backups/stateful-app-$(date +%Y%m%d%H%M).tar.gz
```

### Container Cloning

Create a copy of a running container that starts from the same state:

```bash
# Snapshot the running container
sudo podman container checkpoint original-app \
  --leave-running \
  --export=/tmp/clone-source.tar.gz

# Create a clone from the snapshot
sudo podman container restore \
  --import=/tmp/clone-source.tar.gz \
  --name=clone-app
```

Both `original-app` and `clone-app` are now running. The clone starts from the exact state the original was in at checkpoint time, then diverges.

### Pre-Migration Snapshot

Prepare for migration by creating a checkpoint while the container still serves traffic. The actual migration (stop, transfer, restore) can happen later during a maintenance window:

```bash
# During business hours: create the export
sudo podman container checkpoint production-app \
  --leave-running \
  --export=/shared/migration/production-app.tar.gz

# During maintenance window: stop and migrate
sudo podman stop production-app
# Transfer and restore on the new host
```

## Monitoring Service Impact

To understand the impact of a keep-running checkpoint on your service, monitor request latency during the checkpoint:

```bash
# In one terminal: continuous requests to the container
while true; do
  START=$(date +%s%N)
  curl -s -o /dev/null http://localhost:8080/health
  END=$(date +%s%N)
  LATENCY=$(( (END - START) / 1000000 ))
  echo "$(date +%H:%M:%S.%N) - ${LATENCY}ms"
  sleep 0.1
done

# In another terminal: trigger the checkpoint
sudo podman container checkpoint web-app --leave-running
```

You will see a spike in latency (or timeouts) during the freeze phase, followed by a return to normal. The spike duration corresponds to the CRIU dump time.

## Reducing Freeze Time with Pre-Checkpoint

For containers with large memory footprints, the freeze time can be significant. Podman supports a `--pre-checkpoint` (or `-P`) flag that dumps the container's memory information only while leaving the container running. A subsequent checkpoint using `--with-previous` then only needs to capture the memory pages that changed since the pre-checkpoint, resulting in a much shorter freeze:

```bash
# Step 1: Pre-checkpoint - copies memory pages while the container keeps running
sudo podman container checkpoint my-app \
  --pre-checkpoint \
  --export=/tmp/my-app-pre-checkpoint.tar.gz

# Step 2: Final checkpoint with reference to the pre-checkpoint - shorter freeze
sudo podman container checkpoint my-app \
  --with-previous \
  --leave-running \
  --export=/tmp/my-app-checkpoint.tar.gz
```

If you later restore the exported incremental checkpoint on another host, import both archives:

```bash
sudo podman container restore \
  --import-previous=/tmp/my-app-pre-checkpoint.tar.gz \
  --import=/tmp/my-app-checkpoint.tar.gz
```

The `--pre-checkpoint` flag relies on the Linux kernel's soft-dirty bit, which may not be available on all systems depending on the architecture and kernel configuration. Note that `--pre-checkpoint` and `--leave-running` cannot be used together on the same command, as `--pre-checkpoint` already implies the container keeps running.

## Building a Zero-Downtime Checkpoint Workflow

For services that cannot tolerate any request failures, combine checkpointing with a load balancer:

```bash
#!/bin/bash
set -euo pipefail

CONTAINER_NAME="$1"
EXPORT_PATH="$2"
LB_BACKEND="app-backend"

# Step 1: Remove container from load balancer rotation
echo "Draining connections..."
# Example with HAProxy via socket
# echo "set server ${LB_BACKEND}/server1 state drain" | socat stdio /var/run/haproxy/admin.sock

# Step 2: Wait for active connections to finish
sleep 5

# Step 3: Checkpoint with leave-running
echo "Checkpointing..."
sudo podman container checkpoint "${CONTAINER_NAME}" \
  --leave-running \
  --export="${EXPORT_PATH}"

# Step 4: Re-add to load balancer
echo "Restoring to rotation..."
# echo "set server ${LB_BACKEND}/server1 state ready" | socat stdio /var/run/haproxy/admin.sock

echo "Checkpoint complete, container still serving traffic"
```

This approach ensures no requests are lost during the freeze phase because the container is temporarily removed from the load balancer pool.

## Combining with Health Checks

If your container has a health check configured, be aware that the health check timer continues to run during the freeze. If the freeze takes longer than the health check interval, the container may be briefly marked as unhealthy:

```bash
# Start a container with a health check
sudo podman run -d --name health-test \
  --health-cmd="curl -f http://localhost:80/ || exit 1" \
  --health-interval=5s \
  --health-timeout=3s \
  --health-retries=3 \
  docker.io/library/nginx:alpine

# A long checkpoint freeze might trigger health check failures
sudo podman container checkpoint health-test --leave-running

# Check health status
sudo podman inspect health-test --format '{{.State.Health.Status}}'
```

For containers with tight health check intervals, consider temporarily relaxing the health check before checkpointing, or account for the health check recovery time.

## Sequential Checkpoints of the Same Container

You can take multiple checkpoints of the same running container over time:

```bash
# Take snapshots at different points
sudo podman container checkpoint my-app \
  --leave-running \
  --export=/tmp/snapshot-t1.tar.gz

sleep 60

sudo podman container checkpoint my-app \
  --leave-running \
  --export=/tmp/snapshot-t2.tar.gz

sleep 60

sudo podman container checkpoint my-app \
  --leave-running \
  --export=/tmp/snapshot-t3.tar.gz
```

Each snapshot captures the container's state at a different point in time. You can restore any of them independently:

```bash
# Restore from the second snapshot
sudo podman container restore \
  --import=/tmp/snapshot-t2.tar.gz \
  --name=from-t2
```

Resource Considerations

Keep-running checkpoints consume additional resources:

**Disk space**: Each checkpoint creates image files. Multiple checkpoints accumulate. Clean up old ones:

```bash
# Check disk usage of checkpoint storage
sudo du -sh /var/lib/containers/storage/overlay-containers/*/userdata/checkpoint/
```

**Memory**: During the freeze, CRIU reads all process memory. The kernel must keep these pages in the page cache temporarily, which can increase memory pressure on the host.

**CPU**: The checkpoint dump is CPU-intensive (serializing state, compressing data). This briefly competes with other workloads on the host.

**I/O**: Writing checkpoint data generates significant disk I/O, especially for memory-heavy containers. Use SSDs for checkpoint storage when possible.

## Error Recovery

If the keep-running checkpoint fails, the container should still be running. Verify:

```bash
# Attempt checkpoint
if sudo podman container checkpoint my-app --leave-running --export=/tmp/checkpoint.tar.gz; then
  echo "Checkpoint succeeded"
else
  echo "Checkpoint failed, checking container status..."
  sudo podman ps --filter name=my-app

  # If the container stopped due to the failure, restart it
  if ! sudo podman ps --filter name=my-app --format '{{.Names}}' | grep -q my-app; then
    echo "Container stopped, restarting..."
    sudo podman start my-app
  fi
fi
```

## Conclusion

Keeping a container running after a checkpoint is achieved with the `--leave-running` flag. The container experiences a brief freeze while CRIU captures its state, then resumes immediately. This enables live backups, container cloning, and pre-migration snapshots without fully stopping the container. The freeze duration depends on factors such as memory pages to dump, storage I/O, CPU, and CRIU/runtime behavior. For services that cannot tolerate any downtime, combine the checkpoint with load balancer draining. Multiple sequential checkpoints of the same running container create a time series of snapshots that can each be independently restored.
