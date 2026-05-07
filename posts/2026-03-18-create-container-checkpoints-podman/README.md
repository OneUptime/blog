# How to Create Container Checkpoints with Podman

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Podman, Checkpoint, CRIU, Container State, DevOps

Description: Learn how to use Podman container checkpointing to capture the complete runtime state of a container, including memory, processes, and network connections.

---

> Container exports capture the filesystem. Checkpoints capture everything: memory, running processes, open files, and network state. Learn how to freeze a container in time with Podman checkpointing.

Standard container backups with `podman export` only capture the filesystem. They do not preserve what is happening inside the container: running processes, in-memory data, open network connections, or pending I/O operations. Checkpointing goes further. Using CRIU (Checkpoint/Restore in Userspace), Podman can freeze the entire runtime state of a container and save it to disk. When you restore the checkpoint, the container resumes exactly where it left off, as if nothing happened.

---

## What Is Container Checkpointing

Checkpointing is the process of serializing the complete state of a running container to disk. This includes:

- **Process memory** for every running process in the container.
- **CPU register state** so processes resume execution at the exact instruction.
- **Open file descriptors** including their positions.
- **Network connections** including TCP state and buffers.
- **Pending signals and timers**.
- **The container filesystem** (writable layer changes).

Think of it as hibernation for containers. When you close a laptop lid, the OS saves everything to disk and powers off. Checkpointing does the same thing for a container.

## Prerequisites

Container checkpointing requires CRIU 3.11 or later, which must be installed on the host:

```bash
# Fedora/RHEL/CentOS

sudo dnf install criu

# Ubuntu/Debian
sudo apt-get install criu

# Verify installation
criu --version
```

Podman checkpointing currently works with root containers only, so run the container and checkpoint commands with `sudo`.

Check that your Podman build includes CRIU support:

```bash
sudo podman info | grep -i criu
```

## Creating a Basic Checkpoint

Start with a simple example. Run a container and checkpoint it:

```bash
# Start a container running a long process
sudo podman run -d --name counter alpine sh -c '
    i=0
    while true; do
        echo "Count: $i"
        i=$((i + 1))
        sleep 1
    done
'

# Let it run for a few seconds
sleep 5

# Check its output
sudo podman logs counter | tail -5

# Create a checkpoint
sudo podman container checkpoint counter
```

After checkpointing, the container is stopped and its state is saved. The container will show as "Exited" in `podman ps -a`.

## Checkpoint Options

### Keep the container running after checkpoint

By default, checkpointing stops the container. To checkpoint without stopping:

```bash
sudo podman container checkpoint counter --leave-running
```

This creates a snapshot of the state while the container continues to run. Use this carefully: restoring a checkpoint taken with `--leave-running` can fail or restore stale state if the running container changes files or TCP connection state after the checkpoint is written.

### Export checkpoint to a tar archive

To save the checkpoint as a portable file:

```bash
sudo podman container checkpoint counter \
    --compress=gzip \
    --export /tmp/counter-checkpoint.tar.gz
```

This creates a self-contained archive that includes the checkpoint data and the container filesystem. You can move this file to another machine and restore it there.

### Checkpoint with TCP connections

By default, CRIU cannot checkpoint established TCP connections. To include them:

```bash
sudo podman container checkpoint web-server --tcp-established
```

This is essential for checkpointing web servers, database clients, or any container with active network connections.

### Checkpoint with file locks

If the application running in the container uses file locks, you must include them in the checkpoint. Without this flag, checkpointing a container that holds file locks will fail:

```bash
sudo podman container checkpoint my-app --file-locks
```

## Checkpointing a Real Application

Here is a practical example with a Python web application:

```bash
# Run a Flask application
sudo podman run -d \
    --name flask-app \
    -p 5000:5000 \
    docker.io/library/python:3.12-slim \
    bash -c '
        pip install flask &&
        python3 -c "
from flask import Flask
import time

app = Flask(__name__)
request_count = 0
start_time = time.time()

@app.route(\"/\")
def hello():
    global request_count
    request_count += 1
    uptime = int(time.time() - start_time)
    return f\"Requests: {request_count}, Uptime: {uptime}s\"

app.run(host=\"0.0.0.0\", port=5000)
"'

# Wait for it to start
sleep 10

# Send some requests to build up state
for i in $(seq 1 50); do
    curl -s http://localhost:5000/ > /dev/null
done

# Check the state
curl http://localhost:5000/
# Output: Requests: 51, Uptime: 15s

# Checkpoint the container with TCP connections
sudo podman container checkpoint flask-app \
    --compress=gzip \
    --tcp-established \
    --export /tmp/flask-checkpoint.tar.gz

echo "Checkpoint created"
```

When restored, this container will resume with request_count at 51 and the uptime continuing from where it was checkpointed.

## Examining Checkpoint Contents

You can inspect what is inside a checkpoint archive:

```bash
# List the contents
tar tzf /tmp/flask-checkpoint.tar.gz

# Extract and examine
mkdir /tmp/checkpoint-inspect
tar xzf /tmp/flask-checkpoint.tar.gz -C /tmp/checkpoint-inspect
ls /tmp/checkpoint-inspect/
```

The checkpoint archive typically contains:

- `checkpoint/` - CRIU checkpoint data (process memory, state)
- `config.dump` - Container configuration at checkpoint time
- `spec.dump` - OCI runtime spec
- `network.status` - Network configuration
- `rootfs-diff.tar` - Filesystem changes since the container started

## Checkpoint Strategies

### Pre-deployment checkpoints

Before deploying an update, checkpoint the running container. If the update fails, restore the checkpoint to roll back instantly:

```bash
# Checkpoint before update
sudo podman container checkpoint production-app \
    --compress=gzip \
    --export /backups/pre-update-$(date +%Y%m%d-%H%M%S).tar.gz \
    --leave-running

# Deploy update
sudo podman stop production-app
sudo podman rm production-app
sudo podman run -d --name production-app new-image:v2

# If something goes wrong, restore
sudo podman container restore --import /backups/pre-update-20260318-120000.tar.gz
```

### Periodic state snapshots

Create periodic checkpoints of long-running processes:

```bash
#!/bin/bash

CONTAINER="$1"
BACKUP_DIR="/backups/checkpoints/$CONTAINER"
mkdir -p "$BACKUP_DIR"

CHECKPOINT_FILE="$BACKUP_DIR/$(date +%Y%m%d-%H%M%S).tar.gz"

sudo podman container checkpoint "$CONTAINER" \
    --leave-running \
    --compress=gzip \
    --export "$CHECKPOINT_FILE"

echo "Checkpoint saved: $CHECKPOINT_FILE"

# Keep only the last 5 checkpoints
ls -t "$BACKUP_DIR"/*.tar.gz | tail -n +6 | xargs rm -f
```

### Debugging checkpoints

Capture the state of a misbehaving container for later analysis:

```bash
# Capture state without stopping
sudo podman container checkpoint buggy-app \
    --leave-running \
    --compress=gzip \
    --export /tmp/debug-snapshot.tar.gz

# Later, restore on a debug machine and attach
sudo podman container restore \
    --import /tmp/debug-snapshot.tar.gz \
    --name debug-session

sudo podman exec -it debug-session /bin/bash
```

## Common Errors and Solutions

### "CRIU not installed"

Install CRIU with your package manager. See the Prerequisites section.

### "Checkpointing not supported for rootless containers"

Run with `sudo`. Full checkpointing requires root privileges.

### "Error checkpointing container: failed to checkpoint"

Keep CRIU's temporary files and inspect the generated logs:

```bash
sudo podman container checkpoint buggy-app --keep
sudo find /var/lib/containers/storage -name dump.log -o -name restore.log
```

Common causes include unsupported kernel features, containers using device files, or containers with complex namespace configurations.

### "TCP connections present but --tcp-established not set"

Add the `--tcp-established` flag when the container has active network connections.

## Conclusion

Container checkpointing with Podman and CRIU captures the complete runtime state of a container, not just its filesystem. This enables fast rollbacks, container migration, and precise debugging of production issues. While it requires rootful Podman and CRIU, the capability to freeze and resume containers exactly where they left off is powerful for any environment where continuity matters.
