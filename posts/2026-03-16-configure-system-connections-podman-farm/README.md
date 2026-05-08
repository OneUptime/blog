# How to Configure System Connections for Podman Farm

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Podman Farm, Multi-Architecture, SSH

Description: Learn how to configure Podman system connections for remote machines, which form the foundation of Podman farm builds for multi-architecture image creation.

---

> System connections are the building blocks of Podman farms, linking your local machine to remote Podman instances over SSH.

Before you can use Podman farms, you need system connections that define how to reach each remote machine. Each connection specifies an SSH target and the path to the Podman socket on the remote host. This guide covers creating, managing, and troubleshooting system connections.

---

## Adding a System Connection

```bash
# Basic syntax

podman system connection add <name> ssh://<user>@<host>/<socket-path>

# Add an amd64 builder
podman system connection add amd64-builder \
    ssh://builder@amd64.example.com/run/user/1000/podman/podman.sock

# Add with a specific SSH key
podman system connection add arm64-builder \
    --identity ~/.ssh/podman_farm \
    ssh://builder@arm64.example.com/run/user/1000/podman/podman.sock

# Add with a custom SSH port
podman system connection add ppc64le-builder \
    --identity ~/.ssh/podman_farm \
    ssh://builder@ppc64le.example.com:2222/run/user/1000/podman/podman.sock
```

## Finding the Correct Socket Path

The socket path depends on how Podman is configured on the remote machine:

```bash
# On the remote machine, find the socket path
# For rootless Podman (most common)
echo "/run/user/$(id -u)/podman/podman.sock"

# For rootful Podman
echo "/run/podman/podman.sock"

# Verify the socket exists
ls -la /run/user/$(id -u)/podman/podman.sock

# Enable the rootless socket if not running
systemctl --user enable --now podman.socket

# For a rootful socket, enable the system socket instead
sudo systemctl enable --now podman.socket
```

## Listing System Connections

```bash
# List all configured connections
podman system connection list

# Example output:
# Name            URI                                                     Identity                  Default  ReadWrite
# amd64-builder   ssh://builder@amd64.example.com/run/user/1000/...      ~/.ssh/podman_farm        false    true
# arm64-builder   ssh://builder@arm64.example.com/run/user/1000/...      ~/.ssh/podman_farm        false    true
```

## Testing a Connection

```bash
# Test connectivity and verify architecture
podman --connection amd64-builder info --format '{{.Host.Arch}}'
# Expected: amd64

podman --connection arm64-builder info --format '{{.Host.Arch}}'
# Expected: arm64

# Full info for debugging
podman --connection amd64-builder info
```

## Setting a Default Connection

```bash
# Set a connection as the default
podman system connection default amd64-builder

# Now Podman commands without --connection use amd64-builder
podman info --format '{{.Host.Arch}}'
```

## Removing a Connection

```bash
# Remove a system connection
podman system connection remove old-builder

# Verify removal
podman system connection list
```

## SSH Key Setup for Connections

```bash
# Generate a dedicated key pair for Podman farm
ssh-keygen -t ed25519 -f ~/.ssh/podman_farm -N "" -C "podman-farm-key"

# Copy to each remote machine
ssh-copy-id -i ~/.ssh/podman_farm.pub builder@amd64.example.com
ssh-copy-id -i ~/.ssh/podman_farm.pub builder@arm64.example.com

# Test SSH access
ssh -i ~/.ssh/podman_farm builder@amd64.example.com "echo OK"
```

## Configuring the Remote Machine

On each remote machine, prepare Podman for remote connections:

```bash
# Install Podman
sudo dnf install -y podman  # or apt-get install -y podman

# Enable lingering for the builder user (keeps socket alive after logout)
sudo loginctl enable-linger builder

# Enable the Podman socket
systemctl --user enable --now podman.socket

# Verify the socket is listening
systemctl --user status podman.socket

# Test locally
podman --remote info
```

## Batch Setup Script

```bash
#!/bin/bash
# setup-connections.sh - Add system connections for all farm nodes

SSH_KEY="$HOME/.ssh/podman_farm"
SOCKET_PATH="/run/user/1000/podman/podman.sock"

# Define nodes: name user@host
NODES=(
    "amd64-node1 builder@10.0.1.10"
    "amd64-node2 builder@10.0.1.11"
    "arm64-node1 builder@10.0.2.10"
    "ppc64le-node1 builder@10.0.3.10"
)

for ENTRY in "${NODES[@]}"; do
    NAME=$(echo "${ENTRY}" | awk '{print $1}')
    TARGET=$(echo "${ENTRY}" | awk '{print $2}')

    echo "Adding connection: ${NAME} -> ${TARGET}"

    # Remove existing connection if present
    podman system connection remove "${NAME}" 2>/dev/null

    # Add the connection
    podman system connection add "${NAME}" \
        --identity "${SSH_KEY}" \
        "ssh://${TARGET}${SOCKET_PATH}"
done

echo ""
echo "All connections:"
podman system connection list

# Test each connection
echo ""
echo "Testing connections:"
for ENTRY in "${NODES[@]}"; do
    NAME=$(echo "${ENTRY}" | awk '{print $1}')
    echo -n "  ${NAME}: "
    podman --connection "${NAME}" info --format '{{.Host.Arch}}' 2>/dev/null || echo "FAILED"
done
```

## Troubleshooting Connection Issues

```bash
# SSH connection fails
ssh -v -i ~/.ssh/podman_farm builder@amd64.example.com

# Socket not found on remote
ssh builder@amd64.example.com "ls -la /run/user/\$(id -u)/podman/podman.sock"

# Socket not running
ssh builder@amd64.example.com "systemctl --user status podman.socket"

# Permission denied on socket
ssh builder@amd64.example.com "ls -la /run/user/\$(id -u)/podman/"

# Podman not installed on remote
ssh builder@amd64.example.com "podman version"
```

## Summary

System connections link your local Podman to remote instances over SSH. Each connection needs a name, SSH URI with the Podman socket path, and optionally an SSH identity file. Ensure the remote machines have Podman installed, the socket enabled, and SSH access configured. Test each connection with `podman --connection <name> info` before adding it to a farm.
