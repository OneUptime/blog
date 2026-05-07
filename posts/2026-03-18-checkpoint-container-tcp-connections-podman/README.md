# How to Checkpoint a Container with TCP Connections in Podman

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Podman, CRIU, Container, TCP, Networking

Description: A guide to checkpointing Podman containers that have active TCP connections, using the --tcp-established flag to preserve socket state across checkpoint and restore operations.

---

> Checkpointing a container with active TCP connections requires special handling because CRIU must save the state of each socket, including sequence numbers, window sizes, and buffered data, so connections can resume after restore.

By default, CRIU refuses to checkpoint processes that have established TCP connections. This is a safety measure because restoring TCP connections is inherently fragile. The remote endpoint does not know the connection was frozen, and if too much time passes, the connection will time out. Podman provides the `--tcp-established` flag to override this behavior and include TCP state in the checkpoint.

---

## Why TCP Connections Are Special

TCP is a stateful protocol. Each connection maintains state on both endpoints:

- Sequence numbers for reliable delivery
- Acknowledgment numbers for confirming receipt
- Window sizes for flow control
- Retransmission timers
- Buffered data waiting to be sent or acknowledged

When you checkpoint a container, you freeze one side of these connections. The remote endpoint continues running, potentially sending data, expecting acknowledgments, and eventually timing out if no response arrives.

CRIU can save the local side of the TCP state and restore it, but success depends on the remote endpoint not having given up on the connection during the checkpoint/restore window.

## Enabling TCP Connection Checkpointing

Use the `--tcp-established` flag to include TCP connections in the checkpoint:

```bash
sudo podman container checkpoint my-web-app --tcp-established
```

Without this flag, if the container has any established TCP connections, the checkpoint will fail:

```text
Error: checkpointing container: CRIU: TCP connection with established state found
```

## Setting Up a Test Scenario

Create a container with an active TCP connection to demonstrate the feature:

```bash
# Start a simple HTTP server container

sudo podman run -d --name tcp-server -p 8080:80 docker.io/library/nginx:alpine

# Verify it is serving requests
curl -s http://localhost:8080/ | head -3
```

Now create a long-lived TCP connection. In one terminal, open a socket and keep it idle:

```bash
# Keep a connection open (in a separate terminal)
bash -c 'exec 3<>/dev/tcp/127.0.0.1/8080; sleep 300' &
TCP_HOLDER_PID=$!
```

With an active connection, a standard checkpoint will fail:

```bash
# This will fail because of the established TCP connection
sudo podman container checkpoint tcp-server
# Error: TCP connection with established state found
```

Now use the `--tcp-established` flag:

```bash
sudo podman container checkpoint tcp-server --tcp-established
```

The checkpoint succeeds, capturing the TCP connection state.

## Restoring Containers with TCP State

Restore the container with TCP connection state:

```bash
sudo podman container restore tcp-server --tcp-established
```

The `--tcp-established` flag is needed on both checkpoint and restore. On restore, CRIU reconstructs the TCP sockets with the saved state, including sequence numbers and window sizes.

After restoring, the TCP connections may or may not work depending on:

- **Time elapsed**: If the remote endpoint timed out during the checkpoint/restore window, the connection is dead.
- **Network path**: If the container was restored on a different host, the remote endpoint may not be reachable.
- **Remote endpoint behavior**: Some applications aggressively close idle connections.

## TCP Connection State Details

When CRIU checkpoints a TCP connection, it saves:

```text
- Local and remote IP addresses and ports
- TCP state (ESTABLISHED, CLOSE_WAIT, etc.)
- Send and receive sequence numbers
- Send and receive window sizes
- TCP options (timestamps, SACK, window scaling)
- Data in the send buffer (not yet acknowledged)
- Data in the receive buffer (not yet read by the application)
- Connection timers (keepalive, retransmission)
```

You can inspect the saved TCP state using the `crit` tool:

```bash
# After a checkpoint with --tcp-established
sudo crit decode -i /path/to/checkpoint/tcp-stream-*.img 2>/dev/null
```

## Exporting Checkpoints with TCP State

Combine `--tcp-established` with `--export` for migration scenarios:

```bash
sudo podman container checkpoint tcp-server \
  --tcp-established \
  --export=/tmp/tcp-server-checkpoint.tar.zst
```

On the target host, restore with:

```bash
sudo podman container restore \
  --import=/tmp/tcp-server-checkpoint.tar.zst \
  --tcp-established
```

For successful TCP connection restoration after migration, the target host must:

- Have network connectivity to the remote TCP endpoints
- Use the same IP address as the source (or the connections will fail)
- Complete the restore before remote endpoints time out

## Handling Database Connections

Containers running application servers often maintain connection pools to databases. These are long-lived TCP connections that you may want to preserve:

```bash
# Application container with database connections
sudo podman run -d --name app-server \
  -e DB_HOST=db.example.com \
  -e DB_PORT=5432 \
  docker.io/library/python:3.11-slim \
  python3 -c "
import os, socket, time
# Simulate a persistent DB connection
db_host = os.environ.get('DB_HOST', 'db.example.com')
db_port = int(os.environ.get('DB_PORT', '5432'))
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.connect((db_host, db_port))
while True:
    time.sleep(1)
"

# Checkpoint with TCP state
sudo podman container checkpoint app-server --tcp-established
```

When restoring, the database connections will be in the state they were at checkpoint time. If the database server has not closed them, they may resume working. If the database server has closed them (due to timeout), the application will see connection errors and should reconnect.

## Best Practices for TCP Checkpoints

### Keep the Freeze Window Short

The shorter the time between checkpoint and restore, the more likely TCP connections will survive:

```bash
# Export, transfer, and restore as quickly as possible
sudo podman container checkpoint app \
  --tcp-established \
  --export=/tmp/app.tar.zst

# Immediately transfer and restore
scp /tmp/app.tar.zst target:/tmp/ && \
ssh target "sudo podman container restore --import=/tmp/app.tar.zst --tcp-established"
```

### Handle Connection Recovery in Your Application

Design applications to handle TCP connection failures gracefully:

```python
import psycopg2
import time

def get_connection():
    """Create a database connection with retry logic."""
    max_retries = 5
    for attempt in range(max_retries):
        try:
            conn = psycopg2.connect(
                host="db.example.com",
                port=5432,
                dbname="myapp",
                connect_timeout=5
            )
            return conn
        except psycopg2.OperationalError as e:
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)  # Exponential backoff
            else:
                raise
```

### Use TCP Keepalive Settings

Configure TCP keepalive to detect dead connections quickly after restore:

```bash
sudo podman run -d --name keepalive-app \
  --sysctl net.ipv4.tcp_keepalive_time=30 \
  --sysctl net.ipv4.tcp_keepalive_intvl=10 \
  --sysctl net.ipv4.tcp_keepalive_probes=3 \
  docker.io/library/alpine sleep 3600
```

For sockets with TCP keepalive enabled, these settings make the container detect dead TCP connections within about 60 seconds after restore, rather than the default Linux timeout of over 2 hours.

## Leave-Running with TCP Connections

You can combine `--tcp-established` with `--leave-running` to snapshot TCP connections without disrupting them:

```bash
sudo podman container checkpoint web-app \
  --tcp-established \
  --leave-running \
  --export=/tmp/web-app-live-snapshot.tar.zst
```

The running container's TCP connections continue uninterrupted. The snapshot contains the TCP state at the moment of the freeze. If you restore from this snapshot later, the connections in the restored container will likely be stale, but the running original is unaffected.

## Debugging TCP Checkpoint Issues

When TCP checkpointing fails, use verbose logging to understand what went wrong:

```bash
sudo podman --log-level=debug container checkpoint tcp-server --tcp-established 2>&1 | tee /tmp/tcp-checkpoint.log
```

Common issues:

**"TCP socket is in LISTEN state"**: Listening sockets are fine and do not require `--tcp-established`. This flag is only for established (connected) sockets.

**"Unsupported TCP socket state"**: Some TCP states (like SYN_SENT or TIME_WAIT) may not be fully supported. Wait for the connection to reach ESTABLISHED state or close cleanly.

**"Failed to dump TCP connection repair info"**: The kernel may not support TCP repair mode. Check your kernel version:

```bash
# TCP repair mode requires kernel 3.5+
uname -r
```

**"Connection reset by peer" after restore**: The remote endpoint closed the connection during the checkpoint/restore window. This is expected if the window was too long.

## Checking Active TCP Connections Before Checkpoint

Before checkpointing, inspect the container's TCP connections to understand what will be captured:

```bash
# List TCP connections in the container, if the image includes ss
sudo podman exec tcp-server ss -tnp

# Or using nsenter for more detail
CONTAINER_PID=$(sudo podman inspect tcp-server --format '{{.State.Pid}}')
sudo nsenter -t ${CONTAINER_PID} -n ss -tnp
```

This shows all TCP connections, their states, and which processes own them. Only ESTABLISHED connections require the `--tcp-established` flag.

## Conclusion

Checkpointing containers with active TCP connections requires the `--tcp-established` flag on both the checkpoint and restore commands. CRIU saves the complete TCP socket state, including sequence numbers, buffers, and options. The main challenge is that TCP connections are two-sided: the remote endpoint continues operating during the checkpoint/restore window. Connections survive if the window is short enough and the remote endpoint has not timed out. For production use, design applications with connection retry logic and use TCP keepalive settings to quickly detect dead connections after restore.
