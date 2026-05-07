# How to Configure the Podman System Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, System Service, API, Systemd

Description: Learn how to configure and manage the Podman system service to enable the REST API and support tools that require a Docker-compatible daemon.

---

> The Podman system service bridges the gap between daemonless container management and tools that expect a running container daemon.

Podman is designed to run without a daemon, but many tools and workflows expect a Docker-compatible API endpoint. The Podman system service fills this gap by providing a REST API that is compatible with the Docker API. This guide shows you how to configure, start, and manage the Podman system service for both rootful and rootless operation.

---

## Understanding the Podman System Service

The system service creates a listening socket that exposes the Podman REST API.

```bash
# Start the Podman system service with default settings

podman system service

# Start with a specific timeout (0 means run indefinitely)
podman system service --time 0

# Start listening on a specific URI
podman system service --time 0 unix:///tmp/podman.sock
```

By default, the service listens on a Unix socket and times out after a period of inactivity. Setting the timeout to 0 keeps it running indefinitely.

## Configuring the Socket Location

The socket location depends on whether you are running as root or rootless.

```bash
# Default rootful socket location
# unix:///run/podman/podman.sock

# Default rootless socket location
# unix://$XDG_RUNTIME_DIR/podman/podman.sock

# Check the actual socket path
echo "Rootless socket: unix://$XDG_RUNTIME_DIR/podman/podman.sock"

# Start the service on a custom socket path
podman system service --time 0 unix:///tmp/my-podman.sock

# Verify the socket is active
ls -la /run/user/$(id -u)/podman/podman.sock
```

## Starting the Service with systemd

The recommended way to manage the Podman service is through systemd.

```bash
# For rootless users: enable and start the socket-activated service
systemctl --user enable podman.socket
systemctl --user start podman.socket

# To keep the user socket available after reboot without logging in
loginctl enable-linger "$USER"

# Check the socket status
systemctl --user status podman.socket

# For rootful operation: enable and start as system service
sudo systemctl enable podman.socket
sudo systemctl start podman.socket

# Check the system-level socket status
sudo systemctl status podman.socket
```

## Configuring Service Parameters

Customize the service behavior through systemd drop-in files.

```bash
# Create a drop-in directory for rootless service customization
mkdir -p ~/.config/systemd/user/podman.service.d

# Create a custom configuration
cat > ~/.config/systemd/user/podman.service.d/override.conf << 'EOF'
[Service]
# Set the timeout to 0 (run indefinitely)
ExecStart=
ExecStart=/usr/bin/podman system service --time 0
# Increase the file descriptor limit
LimitNOFILE=65536
# Set environment variables
Environment="CONTAINERS_CONF=%h/.config/containers/containers.conf"
EOF

# Reload systemd to pick up the changes
systemctl --user daemon-reload

# Restart the service with the new configuration
systemctl --user restart podman.service
```

## Configuring TCP Listeners

For remote access, configure the service to listen on a TCP port.

```bash
# Start the service listening on TCP (use with caution)
podman system service --time 0 tcp://0.0.0.0:8080

# For production, use TLS encryption
# First generate TLS certificates, then start with mutual TLS
podman system service --time 0 \
    --tls-cert /path/to/server.crt \
    --tls-key /path/to/server.key \
    --tls-client-ca /path/to/ca.crt \
    tcp://0.0.0.0:8443

# Test the TCP connection
curl http://localhost:8080/v4.0.0/libpod/info
```

## Setting Up Docker Compatibility

Configure the Podman service to work with Docker-compatible tools.

```bash
# Point Docker-compatible tools at the rootless Podman socket
export DOCKER_HOST=unix://$XDG_RUNTIME_DIR/podman/podman.sock

# Verify Docker CLI works with Podman service
docker info
docker ps

# For docker-compose compatibility
export DOCKER_HOST=unix://$XDG_RUNTIME_DIR/podman/podman.sock
docker-compose up -d

# Make the DOCKER_HOST variable persistent
echo 'export DOCKER_HOST=unix://$XDG_RUNTIME_DIR/podman/podman.sock' >> ~/.bashrc
```

## Monitoring the Service

Keep track of the service health and performance.

```bash
# View service logs
journalctl --user -u podman.service --no-pager -n 50

# Follow logs in real time
journalctl --user -u podman.service -f

# Check if the socket is actively listening
ss -ln | grep podman

# Test the API endpoint
curl --unix-socket "$XDG_RUNTIME_DIR/podman/podman.sock" \
    http://localhost/v4.0.0/libpod/info | jq '.version'
```

## Securing the Service

Apply security best practices when running the Podman service.

```bash
# Restrict rootless socket file permissions
chmod 600 "$XDG_RUNTIME_DIR/podman/podman.sock"

# For rootful service, restrict access to a dedicated podman group
sudo groupadd -f podman
sudo mkdir -p /etc/systemd/system/podman.socket.d
sudo tee /etc/systemd/system/podman.socket.d/override.conf > /dev/null << 'EOF'
[Socket]
SocketMode=0660
SocketUser=root
SocketGroup=podman
EOF
sudo systemctl daemon-reload
sudo systemctl restart podman.socket

# Add authorized users to the podman group
sudo usermod -aG podman username
```

## Troubleshooting the Service

Common service issues and their resolutions.

```bash
# Check if the service is running
systemctl --user is-active podman.service

# Check if the socket is listening
systemctl --user is-active podman.socket

# If the service fails to start, check logs
journalctl --user -u podman.service --since "5 minutes ago"

# If the socket file exists but service is not running, clean up
rm -f "$XDG_RUNTIME_DIR/podman/podman.sock"
systemctl --user restart podman.socket

# Verify the service is responding to API calls
curl --unix-socket "$XDG_RUNTIME_DIR/podman/podman.sock" \
    http://localhost/v4.0.0/libpod/_ping
# Expected response: OK
```

## Summary

The Podman system service is essential for enabling the REST API and Docker-compatible tooling. Configure it through systemd for reliable startup and management, customize timeout and listener settings through drop-in files, and secure the socket with appropriate permissions. Whether you need Docker Compose compatibility or remote API access, the Podman system service provides the flexibility to integrate with your existing container workflows.
