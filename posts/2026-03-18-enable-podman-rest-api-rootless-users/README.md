# How to Enable the Podman REST API for Rootless Users

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, REST API, Rootless Containers, Security, Linux

Description: Learn how to enable the Podman REST API in rootless mode so non-root users can manage containers programmatically without elevated privileges.

---

> Running the Podman REST API in rootless mode gives you broad container management capabilities without requiring root access, improving security and reducing your attack surface.

Podman's rootless mode is one of its defining features. It lets regular users run containers without root privileges, which significantly reduces security risks. The REST API also supports rootless operation, giving you programmatic access to containers running in your user namespace. This guide covers everything you need to set up and use the Podman REST API as a non-root user.

---

## Why Rootless Podman Matters

Running containers as root means a container escape could give an attacker full control of the host. Rootless containers run inside a user namespace, so even if a container is compromised, the attacker only gains the privileges of that unprivileged user. The Podman REST API in rootless mode inherits these same security benefits.

Key differences between root and rootless API operation:

- The socket path is under the user's runtime directory instead of `/run/podman/`
- Port binding below 1024 requires additional configuration
- Rootless networking uses `pasta` by default, or `slirp4netns` if configured, instead of the rootful default bridge network
- Storage uses the user's home directory instead of `/var/lib/containers/`

## Prerequisites

Ensure your system supports rootless containers.

```bash
# Check that your user has subordinate UID/GID ranges

grep "^${USER}:" /etc/subuid
grep "^${USER}:" /etc/subgid

# Expected output format: username:100000:65536
# This means your user can map 65536 UIDs starting at 100000
```

If these entries are missing, add them.

```bash
# Add subordinate UID/GID ranges for your user
sudo usermod --add-subuids 100000-165535 --add-subgids 100000-165535 $USER

# Verify the changes
grep "^${USER}:" /etc/subuid
grep "^${USER}:" /etc/subgid
```

You also need `pasta` or `slirp4netns` for rootless networking.

```bash
# Install pasta on Ubuntu/Debian
sudo apt-get install -y passt

# Install pasta on Fedora/RHEL
sudo dnf install -y passt

# Install slirp4netns on Ubuntu/Debian
sudo apt-get install -y slirp4netns

# Install slirp4netns on Fedora/RHEL
sudo dnf install -y slirp4netns

# Verify your selected tool works
pasta --version
# Or, if you are using slirp4netns instead
slirp4netns --version
```

## Starting the Rootless API Manually

Start the API service as your regular user without `sudo`.

```bash
# Start the rootless API with a user-level socket
podman system service --time 0 unix://$XDG_RUNTIME_DIR/podman/podman.sock

# XDG_RUNTIME_DIR is typically /run/user/<UID>
# For example: /run/user/1000/podman/podman.sock
```

You can also specify a custom socket path.

```bash
# Use a custom socket location
mkdir -p ~/.local/share/podman
podman system service --time 0 unix://$HOME/.local/share/podman/podman.sock
```

Start the service in the background for continued use.

```bash
# Run in background
podman system service --time 0 unix://$XDG_RUNTIME_DIR/podman/podman.sock &

# Store the PID so you can stop it later
echo $! > /tmp/podman-api.pid

# Stop the service when done
kill $(cat /tmp/podman-api.pid)
```

## Using systemd User Units

Podman ships with systemd user units that manage the rootless API automatically.

```bash
# Enable the user-level Podman socket
systemctl --user enable --now podman.socket

# Check the status
systemctl --user status podman.socket

# The socket is created at $XDG_RUNTIME_DIR/podman/podman.sock
ls -la $XDG_RUNTIME_DIR/podman/podman.sock
```

The socket activation approach starts the API only when a request arrives, saving resources when the API is idle.

```bash
# Check the associated service status
systemctl --user status podman.service

# View logs for the user service
journalctl --user -u podman.service --no-pager -n 20
```

## Enabling Lingering for Persistent Services

By default, systemd user services stop when the user logs out. To keep the API running even when you are not logged in, enable lingering.

```bash
# Enable lingering for your user
sudo loginctl enable-linger $USER

# Verify lingering is enabled
loginctl show-user $USER | grep Linger
# Output: Linger=yes
```

With lingering enabled, your systemd user services start at boot and persist across logouts.

```bash
# Now the Podman socket will be available even after logout
systemctl --user enable --now podman.socket

# Verify it starts on boot
systemctl --user is-enabled podman.socket
```

## Verifying the Rootless API

Test the API with curl to confirm it is working.

```bash
# Test using the default rootless socket
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  http://localhost/v4.0.0/libpod/info | python3 -m json.tool

# List containers
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  http://localhost/v4.0.0/libpod/containers/json

# Check the API version
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  http://localhost/version
```

The response should show your user's storage path (typically under `~/.local/share/containers/`) and confirm the API is running without root privileges.

## Exposing the Rootless API over TCP

You can also bind the rootless API to a TCP port above 1024.

```bash
# Start on a high port (no root needed)
podman system service --time 0 tcp://127.0.0.1:8080

# Test it
curl http://localhost:8080/v4.0.0/libpod/info
```

Binding to ports below 1024 requires additional configuration.

```bash
# Allow your user to bind to low ports (Linux kernel 4.11+)
sudo sysctl net.ipv4.ip_unprivileged_port_start=80

# Or make the change persistent
echo 'net.ipv4.ip_unprivileged_port_start=80' | sudo tee /etc/sysctl.d/50-unprivileged-ports.conf
sudo sysctl --system
```

## Using the Rootless API with Docker Clients

Point Docker-compatible tools at the rootless socket.

```bash
# Set the Docker host to the rootless Podman socket
export DOCKER_HOST=unix://$XDG_RUNTIME_DIR/podman/podman.sock

# Docker CLI commands now use rootless Podman
docker ps
docker images
docker info
```

You can also use the Python Docker SDK.

```python
import os
import docker

# Connect to the rootless Podman API
socket_path = f"unix://{os.environ['XDG_RUNTIME_DIR']}/podman/podman.sock"
client = docker.DockerClient(base_url=socket_path)

# List running containers
for container in client.containers.list():
    print(f"{container.name}: {container.status}")
```

## Setting the DOCKER_HOST Permanently

Add the environment variable to your shell configuration for persistence.

```bash
# Add to ~/.bashrc or ~/.zshrc
echo 'export DOCKER_HOST=unix://$XDG_RUNTIME_DIR/podman/podman.sock' >> ~/.bashrc

# Reload the configuration
source ~/.bashrc

# Verify it works
docker info
```

## Rootless Networking Considerations

Rootless containers have some networking differences that affect API usage.

```bash
# By default, current Podman releases use pasta for rootless networking
# Published ports work but use a userspace proxy

# Run a container with a published port
podman run -d --name web -p 8080:80 nginx

# Verify the port is accessible
curl http://localhost:8080

# Check the container's network configuration via the API
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  http://localhost/v4.0.0/libpod/containers/web/json | python3 -m json.tool | grep -A 5 "Ports"
```

## Rootless Storage Configuration

The rootless API uses storage under your home directory.

```bash
# Check your rootless storage configuration
podman info --format '{{.Store.GraphRoot}}'
# Typical output: /home/user/.local/share/containers/storage

# View storage driver
podman info --format '{{.Store.GraphDriverName}}'
# Typical output: overlay

# Check storage via the API
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  http://localhost/v4.0.0/libpod/info | python3 -c "
import sys, json
info = json.load(sys.stdin)
print('Graph Root:', info['store']['graphRoot'])
print('Driver:', info['store']['graphDriverName'])
"
```

## Troubleshooting Rootless API Issues

Common issues and their solutions.

```bash
# Error: "permission denied" when accessing the socket
# Verify the socket exists and is owned by your user
ls -la $XDG_RUNTIME_DIR/podman/podman.sock

# Error: XDG_RUNTIME_DIR is not set
# This typically happens in non-login shells or cron jobs
export XDG_RUNTIME_DIR=/run/user/$(id -u)

# Error: "ERRO[0000] cannot setup namespace"
# Check subordinate UID/GID mappings
podman unshare cat /proc/self/uid_map

# Reset the rootless Podman storage if corrupted
podman system reset

# Check if the user service is failing
systemctl --user status podman.socket
journalctl --user -u podman.service -n 30 --no-pager
```

## Conclusion

Running the Podman REST API in rootless mode provides a secure way to manage containers without root privileges. Use systemd user units with lingering enabled for production deployments, and remember that the socket path differs from the root-mode path. The Docker-compatible endpoints work seamlessly with rootless mode, so existing tools and libraries integrate without modification. With rootless networking and storage handled transparently, you get most day-to-day container management functionality with a significantly smaller attack surface.
