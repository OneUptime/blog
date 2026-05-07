# How to Check Podman System Connection Status

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Remote Management, Networking

Description: Learn how to check the status of Podman system connections to verify connectivity with local and remote Podman instances.

---

> Verifying your Podman connection status before running commands prevents frustrating failures and wasted time debugging connectivity issues.

Podman supports managing containers on remote hosts through system connections. Checking the status of these connections helps ensure your remote container management is working properly. This guide covers how to list, verify, and troubleshoot Podman system connections.

---

## Listing System Connections

View all configured Podman system connections.

```bash
# List all configured system connections

podman system connection ls

# The output shows:
# - Name: connection identifier
# - URI: the connection endpoint
# - Identity: SSH key used for authentication
# - Default: whether this is the default connection
# - ReadWrite: whether Podman can modify this connection
```

## Checking the Default Connection

Identify which connection is currently active.

```bash
# Show the default connection
podman system connection ls --format '{{if .Default}}{{.Name}}: {{.URI}}{{end}}'

# Alternative: list all with default indicator
podman system connection ls --format "table {{.Name}}\t{{.URI}}\t{{.Default}}"
```

## Testing Connection Connectivity

Verify that a connection is reachable and responsive.

```bash
# Test the default connection by running a simple command
podman info --format '{{.Host.Hostname}}'

# Test a specific named connection
podman --connection my-remote-host info --format '{{.Host.Hostname}}'

# Quick version check through the remote API
podman --connection my-remote-host version --format '{{.Server.Version}}'
```

## Verifying SSH-Based Connections

Most remote connections use SSH. Verify the underlying SSH connectivity.

```bash
# Extract connection details
podman system connection ls --format '{{.Name}}\t{{.URI}}\t{{.Identity}}'

# Test SSH connectivity to the remote host
# Parse the URI to get the host (format: ssh://user@host:port/run/podman/podman.sock)
ssh -i ~/.ssh/podman-key user@remote-host "podman version"

# Test with verbose output for debugging
ssh -v -i ~/.ssh/podman-key user@remote-host "podman info --format '{{.Host.Hostname}}'"
```

## Checking Connection Health

Create a comprehensive health check for all connections.

```bash
#!/bin/bash
# check-connections.sh - Verify health of all Podman system connections

echo "=== Podman Connection Health Check ==="
echo ""

# Get list of all connection names
CONNECTIONS=$(podman system connection ls --format '{{.Name}}')

if [ -z "$CONNECTIONS" ]; then
    echo "No system connections configured."
    echo "Using local Podman instance."
    podman info --format 'Local: {{.Host.Hostname}} (v{{.Version.Version}})'
    exit 0
fi

# Check each connection
for conn in $CONNECTIONS; do
    DEFAULT=$(podman system connection ls --format json | jq -r --arg conn "$conn" '.[] | select(.Name == $conn) | .Default')
    MARKER=""
    if [ "$DEFAULT" = "true" ]; then
        MARKER=" [DEFAULT]"
    fi

    printf "%-20s" "${conn}${MARKER}:"

    # Try to get version info from the connection
    if VERSION=$(podman --connection "$conn" version --format '{{.Server.Version}}' 2>/dev/null); then
        echo " OK (v${VERSION})"
    else
        echo " FAILED"
    fi
done
```

## Checking Connection Details

Inspect the configuration of a specific connection.

```bash
# Show all connection details in a formatted table
podman system connection ls --format "table {{.Name}}\t{{.URI}}\t{{.Identity}}\t{{.Default}}"

# Extract the URI for a specific connection
podman system connection ls --format json | jq -r '.[] | select(.Name=="my-connection") | .URI'

# Check if a specific connection uses the expected socket path
podman system connection ls --format json | jq '.[] | select(.Name=="my-connection")'
```

## Monitoring Connection Latency

Measure how responsive your remote connections are.

```bash
#!/bin/bash
# connection-latency.sh - Measure Podman connection response times

echo "=== Connection Latency Test ==="

CONNECTIONS=$(podman system connection ls --format '{{.Name}}')

for conn in $CONNECTIONS; do
    # Measure the time to execute a simple command
    START=$(date +%s%N)
    if podman --connection "$conn" version --format '{{.Server.Version}}' > /dev/null 2>&1; then
        STATUS="OK"
    else
        STATUS="UNREACHABLE"
    fi
    END=$(date +%s%N)

    # Calculate elapsed time in milliseconds
    ELAPSED=$(( (END - START) / 1000000 ))

    if [ "$STATUS" = "OK" ]; then
        printf "%-20s %dms\n" "$conn:" "$ELAPSED"
    else
        printf "%-20s UNREACHABLE\n" "$conn:"
    fi
done
```

## Verifying Local Connection

Check that the local Podman instance is working correctly.

```bash
# Verify local Podman is running and responsive
podman info --format 'Host: {{.Host.Hostname}}'
podman version --format 'Version: {{.Client.Version}}'

# Check if the local rootless socket is available
SOCKET="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}/podman/podman.sock"
if [ -S "$SOCKET" ]; then
    echo "Local socket: $SOCKET (active)"
    curl -s --unix-socket "$SOCKET" http://localhost/v4.0.0/libpod/_ping
else
    echo "Local socket: not running"
    echo "Start with: systemctl --user start podman.socket"
fi
```

## Troubleshooting Connection Failures

Diagnose and fix common connection problems.

```bash
# Problem: "connection refused"
# Check if the remote Podman service is running
ssh user@remote-host "systemctl --user status podman.socket"

# Problem: "authentication failed"
# Verify the SSH key exists and has correct permissions
ls -la ~/.ssh/podman-key
chmod 600 ~/.ssh/podman-key

# Problem: "no such file or directory" for socket
# Verify the socket path on the remote host
ssh user@remote-host "ls -la /run/user/\$(id -u)/podman/podman.sock"

# Problem: "permission denied"
# Check that your user has access on the remote host
ssh user@remote-host "podman info --format '{{.Host.Security.Rootless}}'"

# General debugging: increase verbosity
PODMAN_LOG_LEVEL=debug podman --connection my-remote info 2>&1 | head -30
```

## Automated Connection Monitoring

Set up a periodic check of all connections.

```bash
#!/bin/bash
# podman-connection-monitor.sh - Periodic connection status check

LOG_FILE="/tmp/podman-connections.log"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

CONNECTIONS=$(podman system connection ls --format '{{.Name}}' 2>/dev/null)

for conn in $CONNECTIONS; do
    if podman --connection "$conn" version > /dev/null 2>&1; then
        STATUS="UP"
    else
        STATUS="DOWN"
    fi
    echo "${TIMESTAMP} ${conn}: ${STATUS}" >> "$LOG_FILE"
done

# Alert on any down connections
if grep -q "${TIMESTAMP}.*DOWN" "$LOG_FILE"; then
    echo "WARNING: One or more Podman connections are down"
    grep "${TIMESTAMP}.*DOWN" "$LOG_FILE"
fi
```

## Summary

Checking Podman system connection status is essential for reliable remote container management. Use `podman system connection ls` to list all configured connections, test connectivity with simple commands, and set up automated monitoring for production environments. When connections fail, methodically check SSH connectivity, socket availability, and authentication to quickly identify the root cause.
