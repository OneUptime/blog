# How to Use podman system connection to Manage Remotes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Remote Management, System Connections, Multi-Host

Description: Learn how to use podman system connection subcommands to add, list, remove, and switch between remote Podman hosts for centralized container management.

---

> The podman system connection command is your control panel for managing containers across an entire fleet of hosts from a single terminal.

Podman's system connection feature provides a unified interface for managing remote container hosts. With a few subcommands, you can register new hosts, switch between environments, and run container operations across your infrastructure. This guide provides a walkthrough of the core `podman system connection` subcommands with practical examples.

---

## Overview of Subcommands

The `podman system connection` command has several subcommands for managing remote hosts.

```bash
# View all available subcommands

podman system connection --help

# Available subcommands:
# add       - Add a new connection
# default   - Set the default connection
# list (ls) - List all connections
# remove (rm) - Remove a connection
# rename (mv) - Rename a connection
```

## Adding Connections

Register remote Podman hosts as connections.

```bash
# Add a rootless connection over SSH
podman system connection add dev-server \
    ssh://user@dev.example.com/run/user/1000/podman/podman.sock \
    --identity ~/.ssh/podman-key

# Add a rootful connection
podman system connection add prod-root \
    ssh://root@prod.example.com/run/podman/podman.sock \
    --identity ~/.ssh/podman-key

# Add with a custom SSH port
podman system connection add staging \
    ssh://deploy@staging.example.com:2222/run/user/1000/podman/podman.sock \
    --identity ~/.ssh/staging-key

# Add and set as default in one step
podman system connection add --default my-primary \
    ssh://user@primary.example.com/run/user/1000/podman/podman.sock \
    --identity ~/.ssh/podman-key
```

## Listing Connections

View all registered connections and their details.

```bash
# List all connections in default table format
podman system connection ls

# Display specific fields
podman system connection ls --format "table {{.Name}}\t{{.URI}}\t{{.Default}}"

# Output as JSON for scripting
podman system connection ls --format json

# Extract connection names only
podman system connection ls --format '{{.Name}}'

# Show connections with their identities
podman system connection ls --format "table {{.Name}}\t{{.Identity}}\t{{.Default}}"
```

## Setting the Default

Control which connection receives commands by default.

```bash
# Set a connection as the default
podman system connection default dev-server

# Verify the default
podman system connection ls --format "table {{.Name}}\t{{.Default}}"

# Quick check: what host am I targeting
podman info --format '{{.Host.Hostname}}'
```

## Removing Connections

Clean up connections that are no longer needed.

```bash
# Remove a specific connection
podman system connection rm old-server

# Remove using the full command name
podman system connection remove decommissioned-host

# Remove multiple connections
for host in test-1 test-2 test-3; do
    podman system connection rm "$host" 2>/dev/null && echo "Removed: $host"
done
```

## Practical Workflow: Multi-Environment Management

Set up a workflow for managing dev, staging, and production environments.

```bash
#!/bin/bash
# setup-environments.sh - Set up Podman connections for all environments

SSH_KEY="$HOME/.ssh/podman-remote"

# Add environment connections
podman system connection add dev \
    ssh://deploy@dev.example.com/run/user/1000/podman/podman.sock \
    --identity "$SSH_KEY"

podman system connection add staging \
    ssh://deploy@staging.example.com/run/user/1000/podman/podman.sock \
    --identity "$SSH_KEY"

podman system connection add production \
    ssh://deploy@prod.example.com/run/user/1000/podman/podman.sock \
    --identity "$SSH_KEY"

# Set dev as default for safety
podman system connection default dev

echo "=== Configured Environments ==="
podman system connection ls
```

## Using Connections in Scripts

Automate operations across multiple remote hosts.

```bash
#!/bin/bash
# deploy-image.sh - Deploy an image to all environments

IMAGE="${1:?Usage: $0 <image:tag>}"
ENVIRONMENTS="dev staging production"

for env in $ENVIRONMENTS; do
    echo "=== Deploying to: $env ==="

    # Pull the image on the remote host
    echo "Pulling image..."
    podman --connection "$env" pull "$IMAGE"

    # Verify the image is available
    echo "Verifying..."
    podman --connection "$env" images --format '{{.Repository}}:{{.Tag}}' | grep "$IMAGE"

    echo ""
done

echo "=== Deployment Complete ==="
```

## Connection Status Dashboard

Create a dashboard showing the status of all connections.

```bash
#!/bin/bash
# connection-dashboard.sh - Display status of all Podman connections

printf "%-15s %-10s %-20s %-10s %-10s\n" "NAME" "STATUS" "HOSTNAME" "VERSION" "DEFAULT"
printf "%-15s %-10s %-20s %-10s %-10s\n" "----" "------" "--------" "-------" "-------"

# Get connection details
podman system connection ls --format json | jq -c '.[]' | while read -r conn; do
    NAME=$(echo "$conn" | jq -r '.Name')
    DEFAULT=$(echo "$conn" | jq -r '.Default')

    # Test connectivity
    if HOSTNAME=$(podman --connection "$NAME" info --format '{{.Host.Hostname}}' 2>/dev/null); then
        STATUS="UP"
        VERSION=$(podman --connection "$NAME" version --format '{{.Server.Version}}' 2>/dev/null)
    else
        STATUS="DOWN"
        HOSTNAME="-"
        VERSION="-"
    fi

    printf "%-15s %-10s %-20s %-10s %-10s\n" "$NAME" "$STATUS" "$HOSTNAME" "$VERSION" "$DEFAULT"
done
```

## Connection Configuration File

Understand where connection data is stored.

```bash
# Podman-managed connections are stored here by default for rootless users:
cat ~/.config/containers/podman-connections.json 2>/dev/null

# Connections defined in containers.conf use per-connection service_destinations tables
grep -n '^\[engine\.service_destinations\.' ~/.config/containers/containers.conf 2>/dev/null

# ReadWrite=false means the connection came from containers.conf
podman system connection ls --format "table {{.Name}}\t{{.ReadWrite}}"
```

## Advanced: Temporary Connection Override

Use environment variables to override connections without modifying the configuration.

```bash
# Use CONTAINER_HOST to target a specific host temporarily
CONTAINER_HOST=ssh://user@temp-host/run/user/1000/podman/podman.sock \
    podman ps

# Use CONTAINER_SSHKEY to specify the SSH key
CONTAINER_HOST=ssh://user@temp-host/run/user/1000/podman/podman.sock \
    CONTAINER_SSHKEY=~/.ssh/temp-key \
    podman info --format '{{.Host.Hostname}}'

# Useful for one-off commands without adding a permanent connection
```

## Cleaning Up Editable Connections

Remove all connections stored in `podman-connections.json` for a fresh start.

```bash
#!/bin/bash
# reset-connections.sh - Remove all editable Podman system connections

podman system connection remove --all

echo ""
echo "Editable connections removed."
echo "Any remaining ReadWrite=false entries come from containers.conf:"
podman system connection ls --format "table {{.Name}}\t{{.ReadWrite}}"
```

## Summary

The `podman system connection` command provides a complete toolkit for managing remote Podman hosts. Use `add` to register new hosts, `ls` to review your configuration, `default` to control routing, and `rm` to clean up stale connections. Combined with scripting and environment variables, these subcommands enable efficient multi-host container management from a single workstation.
