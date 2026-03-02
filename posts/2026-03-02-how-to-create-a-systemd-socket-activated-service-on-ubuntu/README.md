# How to Create a systemd Socket-Activated Service on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, systemd, Services, Linux, Networking

Description: Configure systemd socket activation on Ubuntu to start services on demand when connections arrive, reducing resource usage and improving boot time for network services.

---

Socket activation is a systemd feature where a service does not start at boot. Instead, systemd listens on the service's socket. When the first connection arrives, systemd passes the socket to the service and starts it. This reduces boot time (services are not started until needed), reduces resource usage (idle services do not consume memory), and enables zero-downtime restarts (connections queue while the service restarts).

## How Socket Activation Works

Without socket activation, a typical network service:
1. Starts at boot
2. Creates a socket, binds to a port
3. Listens for connections
4. Sits idle using memory even when no clients connect

With socket activation:
1. systemd creates the socket and listens on the port (systemd is already running)
2. Incoming connections queue in the kernel
3. On first connection, systemd starts the service
4. Systemd hands the already-listening socket to the service
5. The service accepts the queued connection

The service must support receiving a socket from systemd (using `sd_listen_fds()` from libsystemd or equivalent), or you can use `inetd`-style activation where systemd connects stdin/stdout to the socket.

## Creating a Socket Unit

Every socket-activated service needs two unit files:

1. A `.socket` unit that defines the listening endpoint
2. A `.service` unit that handles the actual connections

The naming matters: `myapp.socket` automatically activates `myapp.service` when a connection arrives (the names must match).

### The Socket Unit

```bash
sudo nano /etc/systemd/system/myapp.socket
```

```ini
[Unit]
Description=MyApp Socket
Documentation=https://docs.myapp.example.com

[Socket]
# Listen on TCP port 8080
ListenStream=8080

# Or listen on a Unix domain socket
# ListenStream=/run/myapp/myapp.sock

# Or listen on a UDP port
# ListenDatagram=514

# Run as a specific user (for Unix socket ownership)
# SocketUser=myapp
# SocketGroup=myapp
# SocketMode=0660

# Accept connections without activating the service for each one
# (the service handles connections itself)
Accept=false

# How many connections can queue before the service is started
Backlog=128

# The maximum number of simultaneous connections (0 = unlimited)
MaxConnections=256

# Keep the socket open even if the service fails
KeepAlive=yes

[Install]
WantedBy=sockets.target
```

### The Service Unit

```bash
sudo nano /etc/systemd/system/myapp.service
```

```ini
[Unit]
Description=MyApp Service
# The socket unit must be started first
Requires=myapp.socket

[Service]
Type=simple

# The service receives the socket via sd_listen_fds()
ExecStart=/usr/bin/myapp --systemd-socket

# The service runs as this user
User=myapp
Group=myapp

# Security settings
PrivateTmp=yes
NoNewPrivileges=yes

# Restart on failure, but not when stopped manually
Restart=on-failure
RestartSec=5s

[Install]
# Do NOT add WantedBy here - the socket unit handles activation
# WantedBy is only needed if you also want to start the service at boot
# without requiring a connection
```

## Enabling and Testing Socket Activation

```bash
# Enable and start the socket (NOT the service)
sudo systemctl enable myapp.socket
sudo systemctl start myapp.socket

# Check the socket is listening
sudo systemctl status myapp.socket
ss -tlnp | grep 8080

# The service should NOT be running yet
sudo systemctl status myapp.service
# Should show: inactive (dead)

# Trigger activation by making a connection
curl http://localhost:8080/

# Now the service should be active
sudo systemctl status myapp.service
```

## Practical Example: Socket-Activated Netcat Service

This example uses `netcat` to demonstrate socket activation with a simple service that does not require libsystemd support.

### Accept Mode vs Non-Accept Mode

For services that do not natively support `sd_listen_fds()`, use `Accept=true`. In this mode, systemd accepts the connection and passes stdin/stdout to a new instance of the service for each connection (like inetd).

```bash
sudo nano /etc/systemd/system/echo.socket
```

```ini
[Unit]
Description=Echo Server Socket

[Socket]
ListenStream=9000
Accept=true

[Install]
WantedBy=sockets.target
```

```bash
sudo nano /etc/systemd/system/echo@.service
```

Note: When `Accept=true`, the service unit must be a template (using `@`):

```ini
[Unit]
Description=Echo Service Instance
After=echo.socket

[Service]
Type=simple
ExecStart=/bin/cat
StandardInput=socket
StandardOutput=socket
StandardError=journal
# Timeout for idle connections
TimeoutStopSec=10
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable echo.socket
sudo systemctl start echo.socket

# Test with netcat
echo "hello world" | nc localhost 9000
# Should receive "hello world" back
```

## Unix Domain Socket Activation

Socket activation works equally well with Unix domain sockets, which are commonly used for local inter-process communication:

```bash
sudo nano /etc/systemd/system/localapp.socket
```

```ini
[Unit]
Description=LocalApp Unix Socket

[Socket]
# Unix domain socket path
ListenStream=/run/localapp/localapp.sock

# Create the socket directory if needed
RuntimeDirectory=localapp
RuntimeDirectoryMode=0755

# Socket permissions
SocketMode=0660
SocketUser=localapp
SocketGroup=localapp

Accept=false

[Install]
WantedBy=sockets.target
```

```bash
sudo nano /etc/systemd/system/localapp.service
```

```ini
[Unit]
Description=LocalApp Service
Requires=localapp.socket
After=localapp.socket

[Service]
Type=simple
User=localapp
Group=localapp
ExecStart=/usr/local/bin/localapp
RuntimeDirectory=localapp
RuntimeDirectoryMode=0755
PrivateTmp=yes
Restart=on-failure
```

## Writing a Simple Socket-Activated Service in Python

Here is a minimal Python service that properly handles systemd socket activation:

```python
#!/usr/bin/env python3
# /usr/local/bin/simple-server.py
# A simple HTTP server that supports systemd socket activation

import socket
import os
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler

class SimpleHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        response = b"Hello from socket-activated server!\n"
        self.send_response(200)
        self.send_header("Content-Length", str(len(response)))
        self.end_headers()
        self.wfile.write(response)

    def log_message(self, format, *args):
        # Log to stderr (journald captures this)
        sys.stderr.write(f"{self.address_string()} - {format % args}\n")

def get_systemd_socket():
    """Get the socket passed by systemd via socket activation."""
    # SD_LISTEN_FDS_START = 3 (first passed file descriptor)
    # LISTEN_FDS environment variable contains the count of passed fds
    listen_fds = int(os.environ.get("LISTEN_FDS", "0"))

    if listen_fds >= 1:
        # Use the first passed socket (fd 3)
        sock = socket.fromfd(3, socket.AF_INET, socket.SOCK_STREAM)
        sock.setblocking(True)
        return sock
    return None

def main():
    sock = get_systemd_socket()

    if sock:
        # Socket activation: use the socket provided by systemd
        server = HTTPServer.__new__(HTTPServer)
        HTTPServer.__init__(server, ("", 0), SimpleHandler)
        server.socket.close()  # close the auto-created socket
        server.socket = sock
    else:
        # Standalone mode: bind to port ourselves
        server = HTTPServer(("", 8080), SimpleHandler)

    print(f"Serving on port {server.server_address[1]}", file=sys.stderr)
    server.serve_forever()

if __name__ == "__main__":
    main()
```

```bash
sudo chmod +x /usr/local/bin/simple-server.py

# Create a dedicated user
sudo useradd --system --no-create-home --shell /sbin/nologin simpleserver
```

```bash
sudo nano /etc/systemd/system/simple-server.socket
```

```ini
[Unit]
Description=Simple HTTP Server Socket

[Socket]
ListenStream=8080
Accept=false

[Install]
WantedBy=sockets.target
```

```bash
sudo nano /etc/systemd/system/simple-server.service
```

```ini
[Unit]
Description=Simple HTTP Server
Requires=simple-server.socket
After=simple-server.socket

[Service]
Type=simple
User=simpleserver
ExecStart=/usr/local/bin/simple-server.py
Restart=on-failure
StandardOutput=journal
StandardError=journal
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable simple-server.socket
sudo systemctl start simple-server.socket

# Test socket activation
curl http://localhost:8080/
```

## Monitoring Socket-Activated Services

```bash
# Check all sockets managed by systemd
systemctl list-sockets

# Output shows:
# LISTEN          UNIT                    ACTIVATES
# [::]:8080       simple-server.socket    simple-server.service

# Check if a service was started via socket activation
journalctl -u simple-server.service | grep "socket"

# View socket-related events
journalctl -u simple-server.socket
```

## Benefits Summary

Socket activation is particularly valuable for:
- **Microservices:** Start services only when needed
- **Development environments:** Reduce boot time for many services
- **D-Bus services:** The D-Bus activation system is built on this concept
- **Zero-downtime restarts:** The socket stays open during service restarts, and connections queue
- **Dependency resolution:** The socket is always available; the service starts when needed

The zero-downtime restart benefit is significant. With socket activation, `systemctl restart myapp.service` causes a brief (milliseconds) pause while the new process starts, but the socket remains active throughout. No connections are refused; they simply queue briefly.

```bash
# Restart without dropping the socket
sudo systemctl restart simple-server.service
# The socket stays up; clients see a brief delay but no connection refused errors
```

Socket activation is a powerful capability that makes systemd much more than just an init system. For any service that listens on a socket, it is worth evaluating whether socket activation would improve your system's startup time and resource usage.
