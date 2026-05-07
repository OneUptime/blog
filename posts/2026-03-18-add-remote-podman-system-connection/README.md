# How to Add a Remote Podman System Connection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Remote Management, SSH

Description: Learn how to add remote Podman system connections to manage containers on remote hosts directly from your local workstation.

---

> Adding a remote Podman connection lets you manage containers on distant servers as naturally as managing them on your own machine.

Podman's remote connection feature enables you to control containers on any host reachable via SSH. By adding a remote system connection, you can pull images, start containers, and manage pods on remote servers without logging in directly. This guide walks through every step from SSH key setup to verifying your remote connection.

---

## Prerequisites

Before adding a remote connection, ensure both local and remote hosts are ready.

```bash
# On your local machine: verify Podman is installed

podman --version

# On the remote host: verify Podman is installed
ssh user@remote-host "podman --version"

# On the remote host: ensure the Podman socket is enabled
ssh user@remote-host "systemctl --user enable --now podman.socket"

# On the remote host: verify the socket is running
ssh user@remote-host "systemctl --user status podman.socket"
```

## Setting Up SSH Keys

Remote connections commonly use SSH key-based authentication.

```bash
# Generate an SSH key pair if you do not have one
ssh-keygen -t ed25519 -f ~/.ssh/podman-remote -N "" -C "podman-remote-access"

# Copy the public key to the remote host
ssh-copy-id -i ~/.ssh/podman-remote.pub user@remote-host

# Test SSH connectivity with the key
ssh -i ~/.ssh/podman-remote user@remote-host "echo 'SSH connection successful'"

# Verify passwordless login works
ssh -i ~/.ssh/podman-remote user@remote-host "whoami"
```

## Adding a Rootless Remote Connection

Connect to a rootless Podman instance on the remote host.

```bash
# Determine the remote user's UID for the socket path
REMOTE_UID=$(ssh -i ~/.ssh/podman-remote user@remote-host "id -u")
echo "Remote UID: $REMOTE_UID"

# Add the remote connection
podman system connection add my-remote \
    ssh://user@remote-host/run/user/${REMOTE_UID}/podman/podman.sock \
    --identity ~/.ssh/podman-remote

# Verify the connection was added
podman system connection ls
```

## Adding a Rootful Remote Connection

Connect to a root-level Podman instance for full system access.

```bash
# Ensure the rootful socket is enabled on the remote host
ssh root@remote-host "systemctl enable --now podman.socket"

# Add a rootful connection (uses the system socket path)
podman system connection add my-remote-root \
    ssh://root@remote-host/run/podman/podman.sock \
    --identity ~/.ssh/podman-remote

# Verify the connection
podman --connection my-remote-root info --format '{{.Host.Hostname}}'
```

## Adding Connections with Custom SSH Ports

Handle remote hosts on non-standard SSH ports.

```bash
# Add a connection to a host using port 2222
podman system connection add custom-port-host \
    ssh://user@remote-host:2222/run/user/1000/podman/podman.sock \
    --identity ~/.ssh/podman-remote

# Verify connectivity
podman --connection custom-port-host version
```

## Adding Connections with IP Addresses

Use IP addresses when DNS is not available.

```bash
# Add a connection using an IPv4 address
podman system connection add server-10 \
    ssh://admin@10.0.1.50/run/user/1000/podman/podman.sock \
    --identity ~/.ssh/podman-remote

# Add a connection using an IPv6 address (wrap in brackets)
podman system connection add server-ipv6 \
    "ssh://admin@[fd00::1]/run/user/1000/podman/podman.sock" \
    --identity ~/.ssh/podman-remote
```

## Setting the New Connection as Default

Make the remote connection the default target for all Podman commands.

```bash
# Set the remote connection as default
podman system connection default my-remote

# Verify it is now the default
podman system connection ls --format "table {{.Name}}\t{{.URI}}\t{{.Default}}"

# All commands now target the remote host
podman ps
podman images
podman info --format '{{.Host.Hostname}}'
```

## Verifying the Remote Connection

Run a series of tests to confirm the connection works properly.

```bash
#!/bin/bash
# verify-remote-connection.sh - Verify a Podman remote connection

CONNECTION="${1:-my-remote}"

echo "=== Verifying Connection: $CONNECTION ==="

# Test 1: Version check
echo -n "Version check: "
if VER=$(podman --connection "$CONNECTION" version --format '{{.Server.Version}}' 2>/dev/null); then
    echo "PASS (v$VER)"
else
    echo "FAIL"
    exit 1
fi

# Test 2: System info
echo -n "System info: "
if HOST=$(podman --connection "$CONNECTION" info --format '{{.Host.Hostname}}' 2>/dev/null); then
    echo "PASS ($HOST)"
else
    echo "FAIL"
fi

# Test 3: Pull and run a test container
echo -n "Container test: "
if podman --connection "$CONNECTION" run --rm docker.io/library/alpine echo "success" 2>/dev/null | grep -q "success"; then
    echo "PASS"
else
    echo "FAIL"
fi

# Test 4: Check storage
echo -n "Storage check: "
if podman --connection "$CONNECTION" system df > /dev/null 2>&1; then
    echo "PASS"
else
    echo "FAIL"
fi

echo "=== Verification Complete ==="
```

## Troubleshooting Connection Failures

Diagnose common issues when adding remote connections.

```bash
# Debug: Check if SSH works independently
ssh -v -i ~/.ssh/podman-remote user@remote-host "echo test"

# Debug: Verify the socket exists on the remote host
ssh -i ~/.ssh/podman-remote user@remote-host \
    "ls -la /run/user/\$(id -u)/podman/podman.sock"

# Debug: Test the API through SSH manually
ssh -i ~/.ssh/podman-remote user@remote-host \
    "curl --unix-socket /run/user/\$(id -u)/podman/podman.sock http://localhost/libpod/_ping"

# Debug: Check if lingering is enabled (needed for persistent sockets)
ssh -i ~/.ssh/podman-remote user@remote-host \
    "loginctl show-user \$(whoami) --property=Linger"

# If lingering is not enabled, enable it
ssh -i ~/.ssh/podman-remote user@remote-host \
    "loginctl enable-linger \$(whoami)"
```

## Adding Multiple Connections in Bulk

Automate adding connections for many hosts.

```bash
#!/bin/bash
# add-bulk-connections.sh - Add multiple Podman remote connections

SSH_KEY="$HOME/.ssh/podman-remote"

# Define hosts as: name user host port uid
HOSTS=(
    "dev-app:deploy:dev.example.com:22:1000"
    "staging-app:deploy:staging.example.com:22:1000"
    "prod-app:deploy:prod.example.com:2222:1000"
)

for entry in "${HOSTS[@]}"; do
    IFS=':' read -r NAME USER HOST PORT UID <<< "$entry"
    URI="ssh://${USER}@${HOST}:${PORT}/run/user/${UID}/podman/podman.sock"

    echo "Adding connection: $NAME -> $URI"
    podman system connection add "$NAME" "$URI" --identity "$SSH_KEY"
done

echo ""
echo "=== All Connections ==="
podman system connection ls
```

## Summary

Adding a remote Podman system connection is a straightforward process: set up SSH key authentication, enable the Podman socket on the remote host, and register the connection with `podman system connection add`. Once configured, you can manage remote containers with the same commands you use locally. Always verify new connections with test commands and ensure lingering is enabled on remote hosts for persistent socket availability.
