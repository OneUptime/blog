# How to Checkpoint a Running Container with Podman

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Podman, CRIU, Container, Checkpointing, DevOps

Description: Learn how to use Podman to checkpoint a running container, freezing its entire runtime state to disk so it can be restored later for fast restarts, debugging, or migration.

---

> Checkpointing a container captures its complete runtime state, including memory, processes, and open files, so you can freeze it in place and bring it back exactly where it left off.

Podman's checkpoint feature lets you take a snapshot of a running container at any point in time. The container's processes, memory contents, file descriptors, and network state are all written to disk. The container is then stopped, and you can restore it later to resume execution from exactly the same point. This is useful for debugging, fast startup, pre-warming applications, and migrating workloads between hosts.

---

## Prerequisites

Before you can checkpoint a container, you need:

- Podman 3.0 or later installed
- CRIU 3.11 or later installed and passing `sudo criu check`
- Root access (checkpoint/restore requires elevated privileges)
- A running container to checkpoint

If you have not set up CRIU yet, see the guide on enabling CRIU for Podman first.

## Starting a Container for Checkpointing

Let us start a container that does some ongoing work so we can see the checkpoint in action. We will use a simple counter script:

```bash
sudo podman run -d --name counter docker.io/library/alpine \
  /bin/sh -c 'i=0; while true; do echo "Count: $i"; i=$((i+1)); sleep 1; done'
```

Check that it is running and producing output:

```bash
sudo podman logs counter
```

You should see incrementing count lines:

```text
Count: 0
Count: 1
Count: 2
Count: 3
```

Let the counter run for a while to build up some state, then proceed with the checkpoint.

## Performing the Checkpoint

The basic checkpoint command is straightforward:

```bash
sudo podman container checkpoint counter
```

This command does several things:

1. Freezes all processes inside the container
2. Writes the process memory, register state, and file descriptors to disk
3. Saves the container's filesystem state
4. Stops the container

After the checkpoint completes, verify the container is no longer running:

```bash
sudo podman ps
```

The container will not appear in the running list. Check its status:

```bash
sudo podman ps -a --filter name=counter
```

You will see the container listed with a status indicating it has been checkpointed.

## Understanding What Gets Saved

When Podman checkpoints a container, CRIU captures:

**Process state**: Every process in the container's PID namespace has its register state, signal handlers, and pending signals saved.

**Memory**: All memory pages belonging to the container's processes are written to image files. This includes heap, stack, shared memory segments, and memory-mapped files.

**File descriptors**: Open files, pipes, sockets, and eventfds are recorded. CRIU tracks the file position, flags, and lock state.

**Network state**: Network interfaces, routing tables, iptables rules within the container's network namespace, and optionally TCP connection state.

**IPC state**: Shared memory segments, semaphores, and message queues in the container's IPC namespace.

The checkpoint data is stored in Podman's internal storage, typically under `/var/lib/containers/storage/`.

## Checking the Checkpoint Data

You can inspect the checkpoint image files that CRIU created. Find the checkpoint directory:

```bash
sudo find /var/lib/containers/storage/ -name "checkpoint" -type d 2>/dev/null
```

Inside the checkpoint directory, you will find CRIU image files:

```bash
sudo ls /var/lib/containers/storage/overlay-containers/<container-id>/userdata/checkpoint/
```

The files include:

```text
core-*.img        # Process core state
mm-*.img          # Memory maps
pages-*.img       # Memory page contents
fdinfo-*.img      # File descriptor information
fs-*.img          # Filesystem state
pstree.img        # Process tree structure
stats-dump        # Checkpoint statistics
```

You can inspect these files with the `crit` tool (CRIU Image Tool):

```bash
sudo crit decode -i /path/to/checkpoint/pstree.img
```

This outputs a JSON representation of the process tree at the time of the checkpoint.

## Checkpoint with Verbose Output

For troubleshooting or understanding what happens during a checkpoint, capture the command output:

```bash
sudo podman container checkpoint counter 2>&1 | tee checkpoint.log
```

You can also increase Podman's log level:

```bash
sudo podman --log-level=debug container checkpoint counter
```

This will show detailed information about each step of the checkpoint process, including CRIU's internal operations.

## Timing the Checkpoint

For performance-critical applications, you may want to measure how long the checkpoint takes:

```bash
time sudo podman container checkpoint counter
```

The checkpoint duration depends on several factors:

- **Memory footprint**: More memory means more data to write to disk. A container using 1 GB of RAM will take significantly longer than one using 10 MB.
- **Number of processes**: Each process requires its own state capture.
- **Disk speed**: Checkpoint images are written to the local filesystem. SSD storage significantly reduces checkpoint time.
- **Number of open file descriptors**: Each fd must be recorded and validated.

For a simple Alpine container, checkpointing typically takes less than a second. For a large application server with gigabytes of heap, it may take several seconds.

## Checkpointing Containers with Volumes

Containers with mounted volumes checkpoint normally, but there is an important detail. The volume data itself is not included in the checkpoint image. Only the file descriptors pointing to volume-mounted files are saved.

```bash
sudo podman run -d --name vol-test \
  -v /tmp/mydata:/data \
  docker.io/library/alpine \
  /bin/sh -c 'while true; do date >> /data/log.txt; sleep 1; done'

# Let it run for a few seconds

sleep 5

sudo podman container checkpoint vol-test
```

When you restore this container, the volume mount must still be available at the same path. If the volume contents changed between checkpoint and restore, the container will see the new contents, which may cause inconsistencies.

## Checkpointing Containers with Environment Variables

Environment variables are part of the process state and are captured by CRIU automatically:

```bash
sudo podman run -d --name env-test \
  -e MY_VAR="checkpoint_value" \
  -e DB_HOST="db.example.com" \
  docker.io/library/alpine \
  /bin/sh -c 'while true; do echo "$MY_VAR - $DB_HOST"; sleep 2; done'

sudo podman container checkpoint env-test
```

When restored, the environment variables will have the same values they had at checkpoint time, regardless of what was specified in the original run command or any subsequent changes.

## Working with Multiple Containers

You can checkpoint multiple containers. Each must be checkpointed individually:

```bash
sudo podman run -d --name app1 docker.io/library/alpine sleep 3600
sudo podman run -d --name app2 docker.io/library/alpine sleep 3600
sudo podman run -d --name app3 docker.io/library/alpine sleep 3600

# Checkpoint all three
for c in app1 app2 app3; do
  sudo podman container checkpoint "$c"
  echo "Checkpointed $c"
done
```

You can also checkpoint all running containers with Podman's built-in `--all` option:

```bash
sudo podman container checkpoint --all
```

Be aware that checkpointing multiple containers is not atomic. There will be a time gap between each checkpoint, which matters if the containers are communicating with each other.

## Error Handling

Common checkpoint errors and their causes:

**"CRIU binary not found"**: CRIU is not installed or not in PATH. Install CRIU and verify with `which criu`.

**"checkpoint failed: unable to checkpoint"**: Usually a CRIU error. Run with `--log-level=debug` to see the underlying CRIU error message.

**"container is not running"**: You can only checkpoint running containers. Check the container status with `podman ps -a`.

**"not supported for rootless containers"**: Switch to rootful Podman with `sudo`.

```bash
# Check if a container is in a checkpointable state
sudo podman inspect counter --format '{{.State.Status}}'
```

The status must be "running" for a checkpoint to succeed.

## Conclusion

Checkpointing a running container with Podman is a single command that captures the complete runtime state of the container to disk. The process is transparent to the application inside the container. It does not know it was checkpointed. This frozen state can then be restored on the same host or exported for migration to another host. The key considerations are ensuring CRIU is properly installed, using root privileges, and understanding that volumes are not included in the checkpoint data.
