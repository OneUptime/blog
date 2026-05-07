# How to Set the Default Podman System Connection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Remote Management, Configuration

Description: Learn how to set and manage the default Podman system connection to streamline your workflow when working with multiple remote hosts.

---

> Setting the right default connection means remote Podman commands target the correct host without requiring extra connection flags.

When you manage containers across multiple hosts, typing `--connection` with every command becomes tedious and error-prone. Setting a default Podman system connection ensures remote Podman commands target your preferred host automatically. On a Linux host with a local Podman engine, use `--remote` when you want commands to use the configured system connection. This guide covers how to set, change, and manage default connections effectively.

---

## Viewing the Current Default

Check which connection is currently set as the default.

```bash
# List all connections with default indicator

podman system connection ls

# Show only the default connection
podman system connection ls --format "table {{.Name}}\t{{.URI}}\t{{.Default}}"

# Extract just the default connection name
podman system connection ls --format json | jq -r '.[] | select(.Default==true) | .Name'

# Quick check: where do commands currently go
podman --remote info --format '{{.Host.Hostname}}'
```

## Setting a Default Connection

Designate a connection as the default target for all commands.

```bash
# Set a specific connection as the default
podman system connection default my-production-server

# Verify the change
podman system connection ls --format "table {{.Name}}\t{{.Default}}"

# Test that commands now go to the new default
podman --remote info --format '{{.Host.Hostname}}'
podman --remote version --format '{{.Server.Version}}'
```

## Switching Between Defaults

Change the default connection when shifting between environments.

```bash
# Switch to development environment
podman system connection default dev-server
echo "Now targeting: $(podman --remote info --format '{{.Host.Hostname}}')"

# Switch to staging environment
podman system connection default staging-server
echo "Now targeting: $(podman --remote info --format '{{.Host.Hostname}}')"

# Switch to production environment
podman system connection default prod-server
echo "Now targeting: $(podman --remote info --format '{{.Host.Hostname}}')"
```

## Creating an Environment Switcher Script

Automate switching between environments with a helper script.

```bash
#!/bin/bash
# podman-env.sh - Switch Podman default connection by environment

ENV="${1:?Usage: $0 <dev|staging|prod|local>}"

case "$ENV" in
    dev)
        podman system connection default dev-server
        ;;
    staging)
        podman system connection default staging-server
        ;;
    prod)
        podman system connection default prod-server
        ;;
    local)
        # Reset to local by removing the default or setting a local connection
        podman system connection default local-podman 2>/dev/null || \
            echo "Set local connection first: podman system connection add local-podman unix:///run/user/$(id -u)/podman/podman.sock"
        ;;
    *)
        echo "Unknown environment: $ENV"
        echo "Available: dev, staging, prod, local"
        exit 1
        ;;
esac

# Display the active connection
CURRENT=$(podman system connection ls --format json | jq -r '.[] | select(.Default==true) | .Name')
HOST=$(podman --remote info --format '{{.Host.Hostname}}' 2>/dev/null || echo "unreachable")
echo "Active connection: $CURRENT ($HOST)"
```

## Using the CONTAINER_HOST Variable

Override the default connection temporarily with an environment variable.

```bash
# Set CONTAINER_HOST to temporarily target a different host
export CONTAINER_HOST=ssh://user@other-host/run/user/1000/podman/podman.sock

# Commands now go to the specified host regardless of default
podman info --format '{{.Host.Hostname}}'

# Unset to return to the configured default
unset CONTAINER_HOST

# Use inline for a single command
CONTAINER_HOST=ssh://user@temp-host/run/user/1000/podman/podman.sock podman ps
```

## Overriding the Default Per Command

Use the --connection flag to target a specific host for individual commands.

```bash
# Run a command against a non-default connection
podman --connection staging-server ps -a

# The default remains unchanged
podman system connection ls --format json | jq -r '.[] | select(.Default==true) | .Name'

# Useful for quick checks on other hosts without switching defaults
podman --connection dev-server images
podman --connection prod-server system df
```

## Validating After Setting Default

Always verify the default is correctly set and working.

```bash
#!/bin/bash
# validate-default.sh - Validate the current default Podman connection

echo "=== Default Connection Validation ==="

# Get default connection details
DEFAULT=$(podman system connection ls --format json | jq -r '.[] | select(.Default==true)')

if [ -z "$DEFAULT" ] || [ "$DEFAULT" = "null" ]; then
    echo "WARNING: No default connection set"
    echo "Set one with: podman system connection default <name>"
    exit 1
fi

NAME=$(echo "$DEFAULT" | jq -r '.Name')
URI=$(echo "$DEFAULT" | jq -r '.URI')

echo "Default Connection: $NAME"
echo "URI: $URI"

# Test connectivity
echo -n "Connectivity: "
if podman --remote info --format '{{.Host.Hostname}}' > /dev/null 2>&1; then
    HOSTNAME=$(podman --remote info --format '{{.Host.Hostname}}')
    echo "OK ($HOSTNAME)"
else
    echo "FAILED"
    exit 1
fi

# Test basic operations
echo -n "Operations: "
if podman --remote version --format '{{.Server.Version}}' > /dev/null 2>&1; then
    VERSION=$(podman --remote version --format '{{.Server.Version}}')
    echo "OK (v$VERSION)"
else
    echo "FAILED"
fi

echo "=== Validation Complete ==="
```

## Shell Prompt Integration

Display the current default connection in your shell prompt.

```bash
# Add to ~/.bashrc for bash
podman_connection() {
    local conn
    conn=$(podman system connection ls --format json 2>/dev/null | \
        jq -r '.[] | select(.Default==true) | .Name' 2>/dev/null)
    if [ -n "$conn" ]; then
        echo "[podman:${conn}]"
    fi
}
export PS1="\$(podman_connection) \u@\h:\w\$ "

# For a lighter approach, use an alias to check before commands
alias podman-where='podman system connection ls --format json | jq -r ".[] | select(.Default==true) | .Name"'
```

## Resetting to Local

Switch back to the local Podman instance as the default.

```bash
# Option 1: Add a local connection and set it as default
podman system connection add local \
    unix:///run/user/$(id -u)/podman/podman.sock
podman system connection default local

# Option 2: On Linux, unset remote environment variables and omit --remote
unset CONTAINER_HOST CONTAINER_CONNECTION

# Verify you are back on the local host
podman info --format '{{.Host.Hostname}}'
```

## Summary

Setting the default Podman system connection streamlines multi-host container management by eliminating the need for `--connection` flags on remote Podman commands. Use `podman system connection default` to switch between environments, create helper scripts for quick switching, and leverage the CONTAINER_HOST variable for temporary overrides. Always validate the default after changing it to ensure your remote commands target the intended host.
