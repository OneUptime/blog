# How to Remove a Remote Podman System Connection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Remote Management, Cleanup

Description: Learn how to safely remove Podman remote system connections when hosts are decommissioned or connections are no longer needed.

---

> Cleaning up stale remote connections keeps your Podman configuration tidy and prevents accidental commands against decommissioned hosts.

As infrastructure evolves, remote hosts get decommissioned, IP addresses change, and testing environments are torn down. Removing obsolete Podman system connections prevents confusion and ensures your commands always target the right hosts. This guide covers how to safely remove connections with proper cleanup.

---

## Listing Connections Before Removal

Always review your connections before removing any.

```bash
# List all configured connections

podman system connection ls

# Display detailed information in a table
podman system connection ls --format "table {{.Name}}\t{{.URI}}\t{{.Default}}"

# Output as JSON for inspection
podman system connection ls --format json | jq '.[] | {name: .Name, uri: .URI, default: .Default}'
```

## Removing a Single Connection

Remove a specific connection by name.

```bash
# Remove a named connection
podman system connection remove my-remote-host

# Verify the connection was removed
podman system connection ls

# Remove another named connection
podman system connection remove old-server
```

## Checking if a Connection Exists Before Removing

Prevent errors by checking existence first.

```bash
#!/bin/bash
# safe-remove-connection.sh - Safely remove a Podman connection

CONNECTION_NAME="${1:?Usage: $0 <connection-name>}"

# Check if the connection exists
if podman system connection ls --format '{{.Name}}' | grep -Fxq -- "$CONNECTION_NAME"; then
    echo "Removing connection: $CONNECTION_NAME"
    podman system connection remove "$CONNECTION_NAME"
    echo "Connection removed successfully"
else
    echo "Connection '$CONNECTION_NAME' does not exist"
    exit 1
fi
```

## Handling Default Connection Removal

Special care is needed when removing the default connection.

```bash
# Check which connection is the default
podman system connection ls --format "table {{.Name}}\t{{.Default}}"

# If removing the default, set a new default first
podman system connection default another-connection

# Then remove the old default
podman system connection remove old-default

# Verify the new default is set
podman system connection ls --format "table {{.Name}}\t{{.Default}}"
```

```bash
#!/bin/bash
# remove-with-default-handling.sh - Remove connection and handle default reassignment

CONNECTION_NAME="${1:?Usage: $0 <connection-name>}"

# Check if this is the default connection
IS_DEFAULT=$(podman system connection ls --format json | \
    jq -r --arg name "$CONNECTION_NAME" '.[] | select(.Name==$name) | .Default')

if [ "$IS_DEFAULT" = "true" ]; then
    echo "WARNING: '$CONNECTION_NAME' is the default connection"

    # Find another connection to set as default
    NEW_DEFAULT=$(podman system connection ls --format '{{.Name}}' | \
        grep -Fxv -- "$CONNECTION_NAME" | head -1)

    if [ -n "$NEW_DEFAULT" ]; then
        echo "Setting '$NEW_DEFAULT' as the new default"
        podman system connection default "$NEW_DEFAULT"
    else
        echo "No other connections available to set as default"
    fi
fi

podman system connection remove "$CONNECTION_NAME"
echo "Connection '$CONNECTION_NAME' removed"
```

## Removing Multiple Connections

Clean up several connections at once.

```bash
# Remove multiple connections by name
for conn in old-server-1 old-server-2 test-host; do
    podman system connection remove "$conn" 2>/dev/null && \
        echo "Removed: $conn" || \
        echo "Not found: $conn"
done

# Remove all connections matching a pattern
podman system connection ls --format '{{.Name}}' | grep "^test-" | while read -r conn; do
    echo "Removing test connection: $conn"
    podman system connection remove "$conn"
done

# Remove all connections except the default
DEFAULT=$(podman system connection ls --format json | jq -r '.[] | select(.Default==true) | .Name')
podman system connection ls --format '{{.Name}}' | while read -r conn; do
    if [ "$conn" != "$DEFAULT" ]; then
        echo "Removing: $conn"
        podman system connection remove "$conn"
    fi
done
```

## Cleaning Up Associated SSH Keys

After removing a connection, consider cleaning up the associated SSH keys.

```bash
#!/bin/bash
# cleanup-connection.sh - Remove connection and optionally clean SSH keys

CONNECTION_NAME="${1:?Usage: $0 <connection-name>}"

# Get the identity file path before removing
IDENTITY=$(podman system connection ls --format json | \
    jq -r --arg name "$CONNECTION_NAME" '.[] | select(.Name==$name) | .Identity // empty')

# Get the remote host for known_hosts cleanup
URI=$(podman system connection ls --format json | \
    jq -r --arg name "$CONNECTION_NAME" '.[] | select(.Name==$name) | .URI // empty')
REMOTE_HOST=""
if [[ "$URI" == ssh://* ]]; then
    REMOTE_HOST=$(printf '%s\n' "$URI" | sed -E 's|^ssh://([^@/]+@)?||; s|[:/].*||')
fi

# Remove the Podman connection
podman system connection remove "$CONNECTION_NAME"
echo "Connection removed: $CONNECTION_NAME"

# Optionally remove the SSH key if it is not used by other connections
if [ -n "$IDENTITY" ] && [ -f "$IDENTITY" ]; then
    OTHER_USES=$(podman system connection ls --format json | \
        jq -r '.[].Identity // empty' | grep -Fxc -- "$IDENTITY")

    if [ "$OTHER_USES" -eq 0 ]; then
        echo "SSH key '$IDENTITY' is no longer used by any connection"
        echo "Consider removing: rm $IDENTITY ${IDENTITY}.pub"
    else
        echo "SSH key '$IDENTITY' is still used by $OTHER_USES other connection(s)"
    fi
fi

# Optionally remove from known_hosts
if [ -n "$REMOTE_HOST" ]; then
    echo "Consider removing from known_hosts: ssh-keygen -R $REMOTE_HOST"
fi
```

## Removing All Connections

Start fresh by removing every connection.

```bash
#!/bin/bash
# remove-all-connections.sh - Remove all Podman system connections

echo "Current connections:"
podman system connection ls

echo ""
read -p "Remove ALL connections? (yes/no): " CONFIRM

if [ "$CONFIRM" = "yes" ]; then
    podman system connection ls --format '{{.Name}}' | while read -r conn; do
        podman system connection remove "$conn"
        echo "Removed: $conn"
    done
    echo ""
    echo "All connections removed"
    podman system connection ls
else
    echo "Aborted"
fi
```

## Verifying After Removal

Confirm the connection was properly removed and commands route correctly.

```bash
# Verify the connection no longer appears in the list
podman system connection ls

# Verify commands now target the local or new default host
podman info --format '{{.Host.Hostname}}'

# Verify the connection name is not recognized
podman --connection removed-name ps 2>&1
# Expected: error about unknown connection
```

## Summary

Removing Podman remote system connections is a simple operation with `podman system connection remove`, but proper cleanup involves checking for default connection reassignment, removing associated SSH keys, and verifying that commands route to the correct host after removal. Use scripted approaches for bulk cleanup and always verify your connection list after making changes to avoid accidental commands against the wrong host.
