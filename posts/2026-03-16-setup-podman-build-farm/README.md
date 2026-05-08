# How to Set Up a Podman Build Farm

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Multi-Architecture, Podman Farm, Build Farm

Description: Learn how to set up a Podman build farm to distribute container image builds across multiple machines with different architectures for native multi-arch builds.

---

> A Podman build farm lets you compile container images natively on each target architecture, avoiding the performance penalty of QEMU emulation.

Building container images through QEMU emulation works but is slow. A Podman build farm connects multiple machines with different CPU architectures, allowing you to build natively on each one. This results in faster builds and avoids emulation-related quirks. This guide walks you through the full setup.

---

## Architecture Overview

A Podman farm consists of:
- A local machine that orchestrates builds
- Remote machines (nodes) accessible via SSH, each with a different architecture
- System connections that link your local Podman to each remote node

```text
Local Machine (orchestrator)
    ├── SSH → amd64 node (builds linux/amd64 images)
    ├── SSH → arm64 node (builds linux/arm64 images)
    └── SSH → ppc64le node (builds linux/ppc64le images)
```

## Step 1: Prepare Remote Machines

Each remote machine needs Podman installed and SSH access configured.

```bash
# On each remote machine, install Podman

# Fedora/RHEL
sudo dnf install -y podman

# Ubuntu/Debian
sudo apt-get update && sudo apt-get install -y podman

# Enable and start the Podman socket for remote access
systemctl --user enable --now podman.socket

# Verify the socket is running
systemctl --user status podman.socket

# Get the socket path
echo $XDG_RUNTIME_DIR/podman/podman.sock
```

## Step 2: Set Up SSH Access

Configure passwordless SSH from your local machine to each remote node:

```bash
# Generate an SSH key if you do not have one
ssh-keygen -t ed25519 -f ~/.ssh/podman_farm -N ""

# Copy the key to each remote machine
ssh-copy-id -i ~/.ssh/podman_farm.pub user@amd64-node.example.com
ssh-copy-id -i ~/.ssh/podman_farm.pub user@arm64-node.example.com

# Test SSH connections
ssh -i ~/.ssh/podman_farm user@amd64-node.example.com "podman version"
ssh -i ~/.ssh/podman_farm user@arm64-node.example.com "podman version"
```

## Step 3: Add System Connections

Register each remote machine as a Podman system connection:

```bash
# Add the amd64 node
podman system connection add amd64-node \
    --identity ~/.ssh/podman_farm \
    ssh://user@amd64-node.example.com/run/user/1000/podman/podman.sock

# Add the arm64 node
podman system connection add arm64-node \
    --identity ~/.ssh/podman_farm \
    ssh://user@arm64-node.example.com/run/user/1000/podman/podman.sock

# Verify connections
podman system connection list
```

You should see output like:

```text
Name          URI                                                          Identity                    Default
amd64-node    ssh://user@amd64-node.example.com/run/user/1000/podman/...  /home/you/.ssh/podman_farm  false
arm64-node    ssh://user@arm64-node.example.com/run/user/1000/podman/...  /home/you/.ssh/podman_farm  false
```

## Step 4: Create the Farm

```bash
# Create a farm with your system connections
podman farm create my-build-farm amd64-node arm64-node

# Verify the farm was created
podman farm list
```

## Step 5: Build with the Farm

```bash
# Log in to your registry
podman login registry.example.com

# Build a multi-arch image using the farm
podman farm build --farm my-build-farm -t registry.example.com/myapp:latest .

# This will:
# 1. Send the build context to each node
# 2. Build natively on each architecture
# 3. Push each architecture image to the registry
# 4. Create and push a manifest list combining all results
```

## Step 6: Verify the Multi-Arch Image

```bash
# Inspect the manifest list created by podman farm build
podman manifest inspect registry.example.com/myapp:latest
```

## Testing the Farm

```bash
# Verify the farm is working by running a simple build
cat > /tmp/Containerfile.test <<'EOF'
FROM alpine:latest
RUN uname -m > /arch.txt
CMD cat /arch.txt
EOF

podman farm build --farm my-build-farm \
    -t registry.example.com/test-multiarch:latest \
    -f /tmp/Containerfile.test /tmp

# Inspect the resulting manifest
podman manifest inspect registry.example.com/test-multiarch:latest
```

## Troubleshooting

```bash
# Test individual connections
podman --connection amd64-node info
podman --connection arm64-node info

# Check SSH connectivity
ssh -v -i ~/.ssh/podman_farm user@arm64-node.example.com "podman info --format '{{.Host.Arch}}'"

# Verify Podman socket on remote machines
ssh user@arm64-node.example.com "systemctl --user status podman.socket"
```

## Summary

Setting up a Podman build farm requires SSH access to remote machines with Podman installed, system connections configured locally, and a farm definition grouping those connections. Once configured, `podman farm build` distributes builds natively across architectures and pushes the resulting multi-arch image to a registry, producing faster and more reliable multi-arch images than QEMU emulation.
