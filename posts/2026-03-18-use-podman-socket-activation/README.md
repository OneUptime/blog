# How to Use Podman for Socket Activation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Socket Activation, Systemd, Linux, Container

Description: Learn how to use systemd socket activation with Podman to start containers on demand, reducing resource usage and enabling zero-downtime container management.

---

> Socket activation lets systemd start containers when incoming connections arrive. Combined with Podman's systemd integration and a socket-aware workload, this creates efficient, on-demand container services.

Socket activation is a systemd feature that listens on a socket and starts the associated service only when a connection arrives. When paired with Podman and a workload that can accept inherited sockets, this means containers can stay stopped until they are actually needed, saving CPU and memory. This guide walks you through setting up socket-activated Podman containers from scratch.

---

## How Socket Activation Works

The flow of socket activation with Podman follows these steps:

1. Systemd creates a socket and listens for connections
2. When a client connects, systemd starts the associated service
3. Systemd passes the listening socket to the service, and Podman can forward that file descriptor into the container
4. The application inside the container accepts the connection from the inherited socket
5. When the container exits, systemd continues listening

This pattern is useful for services that receive intermittent traffic, development environments with socket-aware services, and reducing the footprint of microservice deployments.

## Prerequisites

Ensure you have Podman and systemd installed:

```bash
podman --version
systemctl --version
```

Socket activation works with both rootful and rootless Podman. This guide focuses on rootless operation for better security.

## Setting Up the Podman API Socket

Podman itself uses socket activation for its API service. Enable it:

```bash
# Enable the Podman API socket (rootless)

systemctl --user enable --now podman.socket

# Verify the socket is listening
systemctl --user status podman.socket

# Check the socket path
echo $XDG_RUNTIME_DIR/podman/podman.sock
```

Test the API through the socket:

```bash
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  http://localhost/v4.0.0/libpod/info | python3 -m json.tool | head -20
```

## Creating a Socket-Activated Container Service

### Step 1: Create the Socket Unit

Create a systemd socket unit file:

```bash
mkdir -p ~/.config/systemd/user/
```

```ini
# ~/.config/systemd/user/my-web.socket
[Unit]
Description=My Web Server Socket

[Socket]
ListenStream=8080
Accept=no

[Install]
WantedBy=sockets.target
```

### Step 2: Create the Service Unit

Create the corresponding service unit that starts a Podman container. The example below uses Podman's `--preserve-fds=1` option so the socket that systemd opened is available inside the container as file descriptor 3:

```ini
# ~/.config/systemd/user/my-web.service
[Unit]
Description=My Web Server Container
Requires=my-web.socket
After=my-web.socket

[Service]
Type=notify
ExecStartPre=-/usr/bin/podman rm -f my-web
ExecStart=/usr/bin/podman run \
    --name my-web \
    --rm \
    --network=none \
    --sdnotify=conmon \
    --preserve-fds=1 \
    docker.io/library/python:3.11-slim \
    python3 -c 'import socket; response=b"HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: 18\r\nConnection: close\r\n\r\nHello from Podman\n"; sock=socket.socket(fileno=3); conn, _ = sock.accept(); conn.sendall(response); conn.close()'
ExecStop=-/usr/bin/podman stop my-web
TimeoutStartSec=90
Restart=on-failure
```

### Step 3: Enable and Start

```bash
# Reload systemd to pick up new unit files
systemctl --user daemon-reload

# Enable the socket (not the service)
systemctl --user enable --now my-web.socket

# Verify the socket is listening
systemctl --user status my-web.socket
ss -tlnp | grep 8080
```

### Step 4: Test Socket Activation

The container is not running yet:

```bash
podman ps --filter name=my-web
```

Make a request to trigger activation:

```bash
curl -i http://localhost:8080
```

The request starts the container, which accepts the inherited socket and exits again:

```bash
systemctl --user status my-web.service
journalctl --user -u my-web.service -n 10 --no-pager
```

## Socket Activation with Quadlet

Podman Quadlet provides a simpler way to define container services. The same rule applies: the container must use the inherited socket, so do not combine a `.socket` unit with `PublishPort=` on the same port. Create Quadlet files in `~/.config/containers/systemd/`:

```bash
mkdir -p ~/.config/containers/systemd/
```

```ini
# ~/.config/containers/systemd/my-api.container
[Unit]
Description=My API Server

[Container]
Image=docker.io/library/python:3.11-slim
ContainerName=my-api
Network=none
PodmanArgs=--preserve-fds=1
Exec=python3 -c 'import socket; response=b"HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: 19\r\nConnection: close\r\n\r\nHello from Quadlet\n"; sock=socket.socket(fileno=3); conn, _ = sock.accept(); conn.sendall(response); conn.close()'

[Service]
Restart=on-failure
TimeoutStartSec=60
```

Create the socket file:

```ini
# ~/.config/containers/systemd/my-api.socket
[Unit]
Description=My API Server Socket

[Socket]
ListenStream=9090
Accept=no

[Install]
WantedBy=sockets.target
```

Activate:

```bash
systemctl --user daemon-reload
systemctl --user enable --now my-api.socket
```

## Advanced Socket Configuration

### Multiple Listening Ports

```ini
# ~/.config/systemd/user/multi-port.socket
[Unit]
Description=Multi-Port Service Socket

[Socket]
ListenStream=8080
ListenStream=8443
ListenStream=%t/my-service.sock

[Install]
WantedBy=sockets.target
```

With `Accept=no`, systemd passes all listed listening sockets to the service, so the workload must know how to handle more than one descriptor.

### Rate Limiting

Prevent abuse by limiting connection rates:

```ini
# ~/.config/systemd/user/rate-limited.socket
[Unit]
Description=Rate Limited Service Socket

[Socket]
ListenStream=8080
Accept=no
TriggerLimitIntervalSec=2s
TriggerLimitBurst=20

[Install]
WantedBy=sockets.target
```

`MaxConnections=` and `MaxConnectionsPerSource=` apply only to `Accept=yes` sockets.

### Socket Permissions

Control who can connect:

```ini
[Socket]
ListenStream=%t/my-service.sock
SocketUser=myuser
SocketGroup=mygroup
SocketMode=0660
```

## Generating Systemd Units from Containers

Note: The `podman generate systemd` command is deprecated as of Podman 4.4. Use Quadlet files (shown above) instead for new deployments. The command below still works but will not receive new features:

```bash
# Create and configure a container first
podman create --name my-service \
  -p 8080:80 \
  nginx:latest

# Generate systemd unit files (DEPRECATED - use Quadlet instead)
podman generate systemd --new --name my-service \
  --files \
  --restart-policy=on-failure
```

This creates service files you can use as a starting point for systemd-managed containers. Socket activation still requires the workload to handle inherited sockets; adding a `.socket` unit to a container that only uses `-p`/`--publish` is not enough. For new projects, prefer writing Quadlet `.container` files directly.

## Monitoring Socket-Activated Services

### Checking Socket Status

```bash
# List all sockets
systemctl --user list-sockets

# Check specific socket status
systemctl --user status my-web.socket

# See socket connections
systemctl --user show my-web.socket -p ActiveState -p SubState -p NAccepted -p NConnections
```

### Viewing Activation Logs

```bash
# See when the service was socket-activated
journalctl --user -u my-web.service --since "1 hour ago"

# See socket events
journalctl --user -u my-web.socket --since "1 hour ago"
```

### Automation Script for Monitoring

```python
#!/usr/bin/env python3
"""Monitor socket-activated Podman services."""

import subprocess

PROPERTIES = ["ActiveState", "SubState", "NAccepted", "NConnections"]

def get_socket_status(unit_name):
    """Get the status of a systemd socket unit."""
    result = subprocess.run(
        [
            "systemctl",
            "--user",
            "show",
            unit_name,
            *[f"--property={name}" for name in PROPERTIES],
        ],
        capture_output=True, text=True
    )

    if result.returncode != 0:
        return None

    lines = result.stdout.strip().split("\n")
    status = {}
    for line in lines:
        if "=" in line:
            key, _, value = line.partition("=")
            status[key] = value

    return status

def monitor_sockets(socket_names):
    """Monitor multiple socket units."""
    for name in socket_names:
        status = get_socket_status(name)
        if status:
            active = status.get("ActiveState", "unknown")
            sub = status.get("SubState", "unknown")
            accepted = status.get("NAccepted", "0")
            connected = status.get("NConnections", "0")

            print(f"Socket: {name}")
            print(f"  State: {active} ({sub})")
            print(f"  Accepted: {accepted}")
            print(f"  Current connections: {connected}")
            print()

monitor_sockets(["my-web.socket", "my-api.socket"])
```

## Idle Timeout and Auto-Stop

A generic systemd service cannot be stopped after "no connections" with `TimeoutIdleSec=`; that directive applies to `automount` units, not `service` units. For Podman-managed workloads, idle shutdown usually has to be implemented by the application itself or by a wrapper process that exits after an inactivity timeout.

Podman's own API service is the built-in example of this pattern:

```bash
podman system service --time 300
```

When started from `podman.socket`, that command exits after 5 minutes of inactivity and systemd starts it again on the next connection.

## Socket Activation for Development

Socket activation is most useful in development when the service inside the container can accept inherited sockets. Pairing a `.socket` unit with a normal container port publish such as `-p 5432:5432` is not enough, because systemd is already bound to that port.

For common development services such as PostgreSQL, Redis, and MailHog, use regular Quadlet or systemd service units unless you add a proxy layer or the service explicitly supports socket activation.

## Conclusion

Socket activation with Podman can create efficient, on-demand container services that start only when they are first accessed. This approach is ideal for socket-aware workloads with intermittent traffic and systems where resource efficiency matters. Combined with Podman's rootless operation and Quadlet integration, socket activation provides a solid pattern for systemd-managed container services that are designed to consume inherited sockets.
