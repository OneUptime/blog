# How to Restore a Checkpointed Container with Podman

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Podman, CRIU, Container, Restore, DevOps

Description: A practical guide to restoring a previously checkpointed container with Podman, covering basic restore operations, verifying state continuity, and handling common restore scenarios.

---

> Restoring a checkpointed container brings it back to life at the exact point it was frozen, with all processes, memory, and file descriptors intact, as if nothing happened.

After you checkpoint a container, the next step is restoring it. Podman's restore command reads the saved checkpoint data, reconstructs the container's process tree, restores memory contents, reopens file descriptors, and resumes execution. The application inside the container continues running from the exact instruction where it was frozen.

---

## Prerequisites

Before restoring a container, you need:

- A previously checkpointed container (see the checkpointing guide)
- CRIU 3.11 or later installed
- Root access
- The same Podman host where the checkpoint was created (for local restore)

## Basic Restore Operation

If you have a checkpointed container named "counter", restore it with:

```bash
sudo podman container restore counter
```

The command reconstructs the container's state from the checkpoint data and resumes all processes. Verify it is running:

```bash
sudo podman ps
```

Check the logs to confirm the counter continued from where it left off:

```bash
sudo podman logs counter
```

If the container was counting to 42 when you checkpointed it, you should see it resume from 42 (or close to it, depending on timing).

## Verifying State Continuity

The most important aspect of a restore is that the application state is preserved. Let us create a more concrete example:

```bash
# Start a container that writes state to a file

sudo podman run -d --name state-test docker.io/library/alpine \
  /bin/sh -c '
    echo "Process started at $(date)" > /tmp/state.txt
    i=0
    while true; do
      i=$((i+1))
      echo "Iteration $i at $(date)" >> /tmp/state.txt
      sleep 1
    done
  '

# Let it accumulate some state
sleep 10

# Check current state
sudo podman exec state-test cat /tmp/state.txt

# Checkpoint
sudo podman container checkpoint state-test

# Restore
sudo podman container restore state-test

# Check state again - iterations should continue from where they left off
sleep 3
sudo podman exec state-test cat /tmp/state.txt
```

The restored container's `/tmp/state.txt` will show the iterations continuing from the checkpoint point, with new timestamps after the restore.

## Restore with Configuration Constraints

You cannot change most container parameters during a local restore. The container will be restored with the same configuration it had when checkpointed, including:

- Image and command
- Environment variables
- Network configuration
- Volume mounts
- Resource limits

When restoring from an exported checkpoint archive or checkpoint image, Podman supports a few restore-time changes, such as replacing published ports with `--publish`.

To see the full configuration of a checkpointed container:

```bash
sudo podman inspect state-test
```

## Understanding the Restore Process

When Podman restores a container, the following sequence occurs:

1. **Container setup**: Podman recreates the container's namespaces (PID, network, mount, IPC, UTS).

2. **Filesystem restoration**: The container's root filesystem is mounted and any overlay layers are reconstructed.

3. **CRIU restore**: CRIU reads the checkpoint image files and:
   - Creates the process tree matching the original structure
   - Maps memory pages back to the correct virtual addresses
   - Reopens file descriptors pointing to the same files
   - Restores signal handlers and pending signals
   - Restores timers and their remaining intervals

4. **Process resumption**: All processes are unfrozen and continue executing from their saved instruction pointer.

The entire restore typically takes a similar amount of time as the checkpoint, often less since memory pages can be demand-loaded.

## Restoring Multiple Containers

If you checkpointed several containers, restore them individually:

```bash
for c in app1 app2 app3; do
  sudo podman container restore "$c"
  echo "Restored $c"
done
```

If the containers depend on each other (for example, an application server connecting to a database), consider the restore order. Restore the database container first, then the application server, to avoid connection failures on resume.

```bash
# Restore in dependency order
sudo podman container restore database
sleep 2  # Give the database time to accept connections
sudo podman container restore app-server
sudo podman container restore web-frontend
```

## Restore and Immediate Exec

After restoring a container, you can immediately exec into it to inspect its state:

```bash
sudo podman container restore state-test
sudo podman exec state-test ps aux
```

This is useful for debugging. You can checkpoint a container that is exhibiting a problem, then restore it with `--keep` or use an exported checkpoint to inspect different aspects of its state without losing the problematic condition.

## Repeated Restore from the Same Checkpoint

By default, restoring a container consumes the checkpoint data. If you want to restore from the same checkpoint multiple times, use `--keep`, export the checkpoint first (covered in a separate guide), or re-checkpoint the container.

```bash
# Restore while keeping the checkpoint data
sudo podman container restore --keep counter

# Stop the restored container before restoring the same local checkpoint again
sudo podman stop counter
sudo podman container restore --keep counter

# Or checkpoint again to create a new restore point
sudo podman container checkpoint counter

# Second restore from the new checkpoint
sudo podman container restore counter
```

For repeated restores as separate containers from the same point, the export/import workflow is more appropriate.

## Checking Restore Timing

Measure how long the restore takes:

```bash
time sudo podman container restore counter
```

Restore time depends on:

- **Checkpoint image size**: Directly related to the container's memory footprint at checkpoint time.
- **Disk read speed**: The checkpoint images must be read from disk.
- **Process complexity**: More processes and file descriptors take longer to reconstruct.

For small containers, restore typically completes in under a second. This makes checkpoint/restore an effective strategy for fast container startup, since restoring a pre-warmed application is often faster than starting it from scratch.

## Handling Restore Failures

When a restore fails, Podman provides an error message. Common failures include:

**"no such container"**: The container was removed after checkpointing. The checkpoint data is associated with the container ID.

```bash
# Check if the container still exists
sudo podman ps -a --filter name=counter
```

**"container is running"**: You cannot restore a container that is already running. Stop it first or use a different name.

**"CRIU restore failed"**: The underlying CRIU operation failed. Get more details:

```bash
sudo podman --log-level=debug container restore counter 2>&1 | tail -20
```

**File or mount point missing**: If the container used volumes, they must be available at the same paths:

```bash
# Verify volume paths exist
sudo podman inspect counter --format '{{range .Mounts}}{{.Source}} -> {{.Destination}}{{"\n"}}{{end}}'
```

**Network conflicts**: If the original container used a static IP address and another container has taken the same IP address, the restore may fail. Check for conflicts:

```bash
sudo podman network inspect podman
```

## Restore After System Reboot

Checkpointed containers survive system reboots because the checkpoint data is stored on disk. After rebooting:

```bash
# List all containers, including checkpointed ones
sudo podman ps -a

# Restore the checkpointed container
sudo podman container restore counter
```

This makes checkpointing useful for preserving container state across planned maintenance windows. Checkpoint before the reboot, then restore after.

## Comparing Restore vs Cold Start

One practical use of checkpoint/restore is faster container startup. Compare the two approaches:

```bash
# Cold start timing
time sudo podman run -d --name cold-start docker.io/library/python:3.11 \
  python3 -c "import time; time.sleep(3600)"

sudo podman rm -f cold-start

# Warm start via restore
sudo podman run -d --name warm-start docker.io/library/python:3.11 \
  python3 -c "import time; time.sleep(3600)"
sudo podman container checkpoint warm-start
time sudo podman container restore warm-start

sudo podman rm -f warm-start
```

For applications with significant initialization time (JVM warmup, model loading, cache population), restoring from a checkpoint can reduce startup time from minutes to seconds.

## Conclusion

Restoring a checkpointed container with Podman is the complement to the checkpoint operation. The restore command reconstructs the container's complete runtime state and resumes all processes from exactly where they were frozen. Key considerations include ensuring volume mounts are available, restoring containers in dependency order, and understanding that the checkpoint data is consumed by default. For scenarios requiring repeated restores from the same state, the export/import workflow provides the needed flexibility.
