# How to Troubleshoot Podman Farm Build Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Podman Farm, Troubleshooting, Multi-Architecture

Description: Learn how to diagnose and fix common Podman farm build failures, from SSH connection issues to architecture-specific build errors.

---

> Most Podman farm build failures fall into three categories: SSH connectivity issues, remote Podman configuration problems, and architecture-specific build errors.

Podman farm builds involve multiple machines, SSH connections, and remote Podman instances. When something goes wrong, the error can originate at any layer. This guide helps you systematically diagnose and fix the most common failures.

---

## Systematic Debugging Approach

When a farm build fails, work through these layers in order:

```bash
# Layer 1: Is the farm configured correctly?

podman farm list

# Layer 2: Are system connections defined?
podman system connection list

# Layer 3: Can you reach each node via SSH?
# Layer 4: Is Podman running on each node?
# Layer 5: Does the build succeed on individual nodes?
```

## SSH Connection Failures

The most common farm build issue is SSH connectivity:

```bash
# Test SSH to a specific node
ssh -v -i ~/.ssh/podman_farm builder@arm64.example.com "echo OK"

# Common fixes:

# 1. SSH key permissions are too open
chmod 600 ~/.ssh/podman_farm
chmod 644 ~/.ssh/podman_farm.pub

# 2. SSH key not in authorized_keys on remote
ssh-copy-id -i ~/.ssh/podman_farm.pub builder@arm64.example.com

# 3. Firewall blocking SSH
ssh -p 22 builder@arm64.example.com "echo OK"

# 4. Wrong username
# Check the connection URI
podman system connection list
```

## Podman Socket Not Running on Remote

```bash
# Check if the Podman socket is active on the remote machine
ssh builder@arm64.example.com "systemctl --user status podman.socket"

# If not running, enable it
ssh builder@arm64.example.com "systemctl --user enable --now podman.socket"

# If systemd user session is not available, enable lingering
ssh builder@arm64.example.com "sudo loginctl enable-linger builder"

# Verify the socket path exists
ssh builder@arm64.example.com "ls -la /run/user/\$(id -u)/podman/podman.sock"
```

## Wrong Socket Path in Connection

```bash
# The socket path in the connection must match the remote machine
# Check actual path on remote
ssh builder@arm64.example.com "echo /run/user/\$(id -u)/podman/podman.sock"

# If the user ID is different from 1000, update the connection
podman system connection remove arm64-builder
podman system connection add arm64-builder \
    --identity ~/.ssh/podman_farm \
    --socket-path /run/user/1001/podman/podman.sock \
    builder@arm64.example.com
```

## Testing Individual Nodes

When a farm build fails, isolate the problem to a specific node:

```bash
# Test each connection individually
for CONN in $(podman system connection list --format '{{.Name}}'); do
    echo -n "Testing ${CONN}... "
    if podman --connection "${CONN}" info --format '{{.Host.Arch}}' 2>/dev/null; then
        echo ""
    else
        echo "FAILED"
    fi
done
```

## Build Failures on Specific Architectures

Some builds fail only on certain architectures:

```bash
# Build on a specific node to isolate the issue
podman --connection arm64-builder build -t test:arm64 .

# Common causes:

# 1. Package not available for the architecture
# Fix: Use architecture-conditional installs
# Example Containerfile:
cat <<'EOF'
FROM alpine:latest
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "aarch64" ]; then \
        apk add --no-cache specific-arm-package; \
    elif [ "$ARCH" = "x86_64" ]; then \
        apk add --no-cache specific-x86-package; \
    fi
EOF

# 2. Binary not compiled for the architecture
# Fix: Use multi-stage builds with architecture-aware compilation
```

## Build Context Transfer Failures

Large build contexts can cause timeouts when transferring to remote nodes:

```bash
# Check the size of your build context
du -sh .

# Create or update .containerignore to reduce size
cat > .containerignore <<'EOF'
.git
node_modules
*.log
tests/
docs/
.env*
tmp/
EOF

# Verify the effective context size
tar cf - . --exclude-from=.containerignore 2>/dev/null | wc -c | numfmt --to=iec
```

## Disk Space Issues on Remote Nodes

```bash
# Check disk space on each node
for CONN in amd64-builder arm64-builder; do
    echo "${CONN}:"
    podman --connection "${CONN}" system info --format 'Storage root: {{.Store.GraphRoot}}'
    podman --connection "${CONN}" system df
done

# Clean up old images on remote nodes
podman --connection arm64-builder system prune --all --force
```

## Comprehensive Diagnostic Script

```bash
#!/bin/bash
# diagnose-farm.sh - Diagnose farm build issues

FARM_NAME="${1:-prod-farm}"

echo "=== Farm Diagnostic Report ==="
echo "Farm: ${FARM_NAME}"
echo "Date: $(date)"
echo ""

# Check farm exists
if ! podman farm list --format '{{.Name}}' | grep -Fxq "${FARM_NAME}"; then
    echo "ERROR: Farm '${FARM_NAME}' does not exist."
    podman farm list
    exit 1
fi

CONNECTIONS=$(podman farm list --format '{{if eq .Name "'"${FARM_NAME}"'"}}{{range .Connections}}{{.}}{{"\n"}}{{end}}{{end}}')

for CONN in ${CONNECTIONS}; do
    echo "--- Node: ${CONN} ---"

    # Test Podman connection
    if ARCH=$(podman --connection "${CONN}" info --format '{{.Host.Arch}}' 2>/dev/null); then
        echo "  Status: CONNECTED"
        echo "  Architecture: ${ARCH}"

        # Check Podman version
        VERSION=$(podman --connection "${CONN}" version --format '{{.Server.Version}}' 2>/dev/null)
        echo "  Podman Version: ${VERSION}"

        # Check storage
        GRAPH_ROOT=$(podman --connection "${CONN}" info --format '{{.Store.GraphRoot}}' 2>/dev/null)
        echo "  Storage Root: ${GRAPH_ROOT}"
    else
        echo "  Status: UNREACHABLE"
        echo "  Troubleshooting: Check SSH and Podman socket on this node."
    fi
    echo ""
done

echo "=== End Report ==="
```

## Summary

Troubleshoot Podman farm failures systematically: check farm configuration, then system connections, then SSH access, then remote Podman status, and finally architecture-specific build issues. Use individual node testing to isolate problems. Keep build contexts small with `.containerignore` and monitor disk space on remote nodes.
