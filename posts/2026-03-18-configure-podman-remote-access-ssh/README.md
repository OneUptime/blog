# How to Configure Podman Remote Access over SSH

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, SSH, Remote Access, Security

Description: Learn how to configure secure SSH-based remote access to Podman for managing containers on remote hosts from your local workstation.

---

> SSH-based remote access turns Podman into a secure, distributed container management tool without exposing any ports to the network.

Podman can use SSH as its transport layer for remote connections, providing encrypted communication without needing to expose the Podman API over the network. This approach leverages existing SSH infrastructure for authentication and encryption. This guide covers the complete setup of SSH-based remote access from key generation to production hardening.

---

## SSH Key Setup

Generate a dedicated SSH key pair for Podman remote access.

```bash
# Generate an Ed25519 key pair (recommended for security and performance)

ssh-keygen -t ed25519 -f ~/.ssh/podman-remote -N "" -C "podman-remote-$(hostname)"

# Set proper permissions on the key files
chmod 600 ~/.ssh/podman-remote
chmod 644 ~/.ssh/podman-remote.pub

# View the public key
cat ~/.ssh/podman-remote.pub
```

## Configuring the Remote Host

Prepare the remote host to accept Podman connections.

```bash
# Copy the public key to the remote host
ssh-copy-id -i ~/.ssh/podman-remote.pub podman-user@remote-host

# Verify key-based authentication works
ssh -i ~/.ssh/podman-remote podman-user@remote-host "echo 'SSH access confirmed'"

# On the remote host: enable the Podman socket
ssh -i ~/.ssh/podman-remote podman-user@remote-host << 'REMOTE'
# Enable and start the Podman socket
systemctl --user enable --now podman.socket

# Enable lingering so the socket persists after logout
loginctl enable-linger $(whoami)

# Verify the socket is active
systemctl --user status podman.socket
echo "Socket: /run/user/$(id -u)/podman/podman.sock"
REMOTE
```

## Adding the Remote Connection

Register the remote host as a Podman system connection.

```bash
# Get the remote user's UID
REMOTE_UID=$(ssh -i ~/.ssh/podman-remote podman-user@remote-host "id -u")

# Add the connection
podman system connection add remote-server \
    ssh://podman-user@remote-host/run/user/${REMOTE_UID}/podman/podman.sock \
    --identity ~/.ssh/podman-remote

# Verify the connection
podman --connection remote-server info --format '{{.Host.Hostname}}'
```

## Configuring SSH for Optimal Performance

Tune SSH settings for better remote Podman performance.

```bash
# Add an SSH config entry for the Podman remote host
cat >> ~/.ssh/config << 'EOF'

Host remote-host
    HostName remote-host.example.com
    User podman-user
    IdentityFile ~/.ssh/podman-remote
    # Reuse SSH connections for faster subsequent commands
    ControlMaster auto
    ControlPath ~/.ssh/sockets/%r@%h-%p
    ControlPersist 600
    # Disable unnecessary features for performance
    ForwardAgent no
    ForwardX11 no
    # Increase connection timeout
    ConnectTimeout 10
    # Enable compression for slower networks
    Compression yes
EOF

# Create the sockets directory for connection multiplexing
mkdir -p ~/.ssh/sockets
chmod 700 ~/.ssh/sockets

# Test the SSH config entry
ssh remote-host "podman version"
```

## Restricting SSH Access for Podman

Limit the SSH key to only Podman-related operations on the remote host.

```bash
# On the remote host: restrict the SSH key in authorized_keys
# Edit ~/.ssh/authorized_keys and prefix the key with restrictions
ssh podman-user@remote-host << 'REMOTE'
# Get the current key
KEY=$(grep "podman-remote" ~/.ssh/authorized_keys)

# Create a restricted version (optional: restrict to specific commands)
# Note: Podman remote needs general shell access via SSH
# But you can restrict the source IP
RESTRICTED="from=\"10.0.0.0/8,192.168.0.0/16\" ${KEY}"

# Show the restricted entry (apply manually if desired)
echo "Restricted key entry:"
echo "$RESTRICTED"
REMOTE
```

## Testing the Complete Connection

Run through a comprehensive test of the remote connection.

```bash
#!/bin/bash
# test-remote-access.sh - Test Podman SSH remote access

CONNECTION="remote-server"

echo "=== Podman Remote Access Test ==="

# Test 1: Basic connectivity
echo -n "1. Connectivity: "
podman --connection "$CONNECTION" version --format '{{.Server.Version}}' 2>/dev/null && echo "PASS" || echo "FAIL"

# Test 2: Image operations
echo -n "2. Image pull: "
podman --connection "$CONNECTION" pull docker.io/library/alpine:latest > /dev/null 2>&1 && echo "PASS" || echo "FAIL"

# Test 3: Container lifecycle
echo -n "3. Container run: "
OUTPUT=$(podman --connection "$CONNECTION" run --rm alpine echo "remote-test" 2>/dev/null)
[ "$OUTPUT" = "remote-test" ] && echo "PASS" || echo "FAIL"

# Test 4: List operations
echo -n "4. List containers: "
podman --connection "$CONNECTION" ps -a > /dev/null 2>&1 && echo "PASS" || echo "FAIL"

# Test 5: System info
echo -n "5. System info: "
HOST=$(podman --connection "$CONNECTION" info --format '{{.Host.Hostname}}' 2>/dev/null)
[ -n "$HOST" ] && echo "PASS ($HOST)" || echo "FAIL"

echo "=== Test Complete ==="
```

## Configuring Multiple Remote Hosts

Set up SSH access to a fleet of remote hosts.

```bash
#!/bin/bash
# setup-fleet-access.sh - Configure SSH access to multiple Podman hosts

SSH_KEY="$HOME/.ssh/podman-remote"

# Define your fleet
declare -A FLEET
FLEET[dev]="podman-user@dev.example.com"
FLEET[staging]="podman-user@staging.example.com"
FLEET[prod]="deploy@prod.example.com"

for name in "${!FLEET[@]}"; do
    TARGET="${FLEET[$name]}"
    echo "=== Setting up: $name ($TARGET) ==="

    # Copy SSH key
    ssh-copy-id -i "${SSH_KEY}.pub" "$TARGET" 2>/dev/null

    # Enable Podman socket on remote host
    ssh -i "$SSH_KEY" "$TARGET" "systemctl --user enable --now podman.socket; loginctl enable-linger \$(whoami)"

    # Get remote UID and add connection
    REMOTE_UID=$(ssh -i "$SSH_KEY" "$TARGET" "id -u")
    USER=$(echo "$TARGET" | cut -d@ -f1)
    HOST=$(echo "$TARGET" | cut -d@ -f2)

    podman system connection add "$name" \
        "ssh://${TARGET}/run/user/${REMOTE_UID}/podman/podman.sock" \
        --identity "$SSH_KEY"

    echo "Connection '$name' added"
done

echo ""
podman system connection ls
```

## Troubleshooting SSH Remote Access

Common issues and their solutions.

```bash
# Problem: "Permission denied (publickey)"
ssh -v -i ~/.ssh/podman-remote podman-user@remote-host 2>&1 | grep -i "auth"

# Problem: "Connection timed out"
# Check if SSH port is accessible
nc -zv remote-host 22

# Problem: "Could not connect to podman socket"
# Verify socket on remote host
ssh -i ~/.ssh/podman-remote podman-user@remote-host \
    "systemctl --user status podman.socket && ls -la /run/user/\$(id -u)/podman/"

# Problem: Slow connection
# Enable SSH multiplexing (see SSH config section above)
# Test with multiplexing active
ssh -O check remote-host 2>&1

# Problem: "error connecting to remote host"
# Check the connection URI is correct
podman system connection ls --format json | jq '.[] | select(.Name=="remote-server")'
```

## Summary

SSH-based remote access is Podman's secure approach to distributed container management. By using dedicated SSH keys, configuring connection multiplexing for performance, and restricting access appropriately, you get encrypted remote container management without exposing any API ports. Set up the remote host with an enabled Podman socket and lingering, register the connection locally, and use SSH config entries for optimal performance across your container fleet.
