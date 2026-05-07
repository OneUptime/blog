# How to Manage Podman System Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Remote Management, System Connections

Description: Learn how to create, list, modify, and remove Podman system connections to manage containers across multiple local and remote hosts.

---

> Managing system connections transforms Podman from a single-host tool into a multi-host container management platform controlled from one workstation.

Podman system connections allow you to manage containers on multiple hosts from a single client. Whether you have development, staging, and production servers or need to manage containers across different architectures, system connections give you centralized control. This guide covers the complete lifecycle of managing Podman system connections.

---

## Listing Existing Connections

Start by reviewing your current connection configuration.

```bash
# List all system connections

podman system connection ls

# Display connections in a formatted table
podman system connection ls --format "table {{.Name}}\t{{.URI}}\t{{.Identity}}\t{{.Default}}"

# Output connections as JSON for scripting
podman system connection ls --format json | jq '.'
```

## Adding a New Connection

Create connections to remote Podman instances.

```bash
# Add a connection using SSH with the default socket
podman system connection add my-server \
    ssh://user@192.168.1.100/run/user/1000/podman/podman.sock

# Add a connection with a specific SSH identity key
podman system connection add staging \
    ssh://deploy@staging.example.com/run/user/1000/podman/podman.sock \
    --identity ~/.ssh/staging-key

# Add a rootful connection (uses the system socket path)
podman system connection add prod-root \
    ssh://root@prod.example.com/run/podman/podman.sock \
    --identity ~/.ssh/prod-key

# Add a connection on a non-standard SSH port
podman system connection add custom-port \
    ssh://user@host.example.com:2222/run/user/1000/podman/podman.sock
```

## Setting the Default Connection

Designate which connection Podman uses when no connection is specified.

```bash
# Set a connection as the default
podman system connection default staging

# Verify the default was set
podman system connection ls --format "table {{.Name}}\t{{.Default}}"

# Test the default connection
podman info --format '{{.Host.Hostname}}'
```

## Removing Connections

Delete connections that are no longer needed.

```bash
# Remove a specific connection
podman system connection remove my-server

# Verify the connection was removed
podman system connection ls

# Remove multiple connections
for conn in old-server test-host dev-box; do
    podman system connection remove "$conn" 2>/dev/null
    echo "Removed: $conn"
done
```

## Renaming Connections

Podman includes a rename command for system connections.

```bash
# Rename a Podman system connection
podman system connection rename old-name new-name

# Verify the new name
podman system connection ls
```

## Using Specific Connections

Run commands against a specific connection without changing the default.

```bash
# Run a command on a specific connection
podman --connection staging ps -a

# Pull an image on a remote host
podman --connection prod-root pull docker.io/library/nginx:latest

# Start a container on a remote host
podman --connection staging run -d --name web nginx:alpine

# Check system info on a remote host
podman --connection prod-root info --format '{{.Host.Hostname}}'
```

## Batch Operations Across Connections

Run the same command across all connections for fleet management.

```bash
#!/bin/bash
# batch-command.sh - Run a Podman command across all connections

COMMAND="$*"

if [ -z "$COMMAND" ]; then
    echo "Usage: $0 <podman command>"
    echo "Example: $0 ps -a"
    exit 1
fi

CONNECTIONS=$(podman system connection ls --format '{{.Name}}')

for conn in $CONNECTIONS; do
    echo "=== $conn ==="
    podman --connection "$conn" $COMMAND 2>&1
    echo ""
done
```

```bash
# Usage examples for the batch script
# List running containers on all hosts
./batch-command.sh ps

# Check disk usage on all hosts
./batch-command.sh system df

# Pull an image on all hosts
./batch-command.sh pull docker.io/library/alpine:latest
```

## Organizing Connections with Naming Conventions

Use consistent naming to keep connections organized.

```bash
# Environment-based naming
podman system connection add dev-web ssh://user@dev-web/run/user/1000/podman/podman.sock
podman system connection add staging-web ssh://user@staging-web/run/user/1000/podman/podman.sock
podman system connection add prod-web ssh://user@prod-web/run/user/1000/podman/podman.sock

# Architecture-based naming
podman system connection add arm64-builder ssh://user@arm-host/run/user/1000/podman/podman.sock
podman system connection add amd64-builder ssh://user@amd-host/run/user/1000/podman/podman.sock

# List connections filtered by pattern
podman system connection ls --format '{{.Name}}' | grep prod
```

## Exporting and Importing Connection Configurations

Share connection configurations across workstations.

```bash
# Export connections to a JSON file
podman system connection ls --format json > ~/podman-connections.json

# View the exported configuration
cat ~/podman-connections.json | jq '.[].Name'

# Import connections from the export on another machine
while read -r line; do
    NAME=$(echo "$line" | jq -r '.Name')
    URI=$(echo "$line" | jq -r '.URI')
    IDENTITY=$(echo "$line" | jq -r '.Identity // empty')
    if [ -n "$IDENTITY" ]; then
        podman system connection add "$NAME" "$URI" --identity "$IDENTITY"
    else
        podman system connection add "$NAME" "$URI"
    fi
done < <(jq -c '.[]' ~/podman-connections.json)
```

## Summary

Podman system connections provide a powerful way to manage containers across multiple hosts from a single workstation. By adding, organizing, and maintaining connections with clear naming conventions, you can efficiently manage development, staging, and production environments. Use batch scripts for fleet-wide operations and export configurations for team sharing. Regular connection health checks ensure your multi-host container management stays reliable.
