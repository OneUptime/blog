# How to Troubleshoot Podman System Service Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Troubleshooting, Systemd, Debugging

Description: Learn how to diagnose and fix common Podman system service issues including socket failures, API errors, permission problems, and storage corruption.

---

> Systematic troubleshooting of Podman service issues saves hours of frustration and gets your container infrastructure back online fast.

When the Podman system service fails to start, drops connections, or returns unexpected errors, methodical troubleshooting is essential. This guide covers the most common service issues, their root causes, and step-by-step solutions. Whether you are dealing with socket activation failures, storage corruption, or permission denials, you will find the diagnostic approach here.

---

## Initial Diagnostic Steps

Start every troubleshooting session with these checks.

```bash
# Check the overall Podman health

podman info > /dev/null 2>&1 && echo "Podman: OK" || echo "Podman: FAILED"

# Check service and socket status
systemctl --user status podman.socket
systemctl --user status podman.service

# Check for recent errors in the journal
journalctl --user -u podman.service --no-pager -n 30 --since "1 hour ago"
journalctl --user -u podman.socket --no-pager -n 10

# Check the Podman version
podman --version
```

## Socket Not Starting

When the Podman socket fails to start or is missing.

```bash
# Check if the socket unit is loaded
systemctl --user list-unit-files | grep podman

# If the unit is not found, the Podman package may be incomplete
rpm -ql podman | grep systemd 2>/dev/null
dpkg -L podman | grep systemd 2>/dev/null

# Check the socket unit for errors
systemctl --user status podman.socket -l

# If the socket is in a failed state, reset and restart
systemctl --user reset-failed podman.socket
systemctl --user start podman.socket

# Verify the runtime directory exists
ls -la /run/user/$(id -u)/
# If missing, you may not have a proper login session
echo "XDG_RUNTIME_DIR=$XDG_RUNTIME_DIR"
```

## Service Crashes on Startup

When the Podman service starts but immediately exits.

```bash
# Check the exit code and logs
systemctl --user status podman.service -l

# Look for specific error messages
journalctl --user -u podman.service --no-pager -n 50 | grep -i "error\|fatal\|panic"

# Common cause: corrupted storage
# Check storage integrity
podman info --format '{{.Store.GraphRoot}}' 2>&1

# Try running the service manually to see detailed errors
podman --log-level debug system service --time 5 2>&1 | head -50

# If storage is corrupted, migrate or reset
podman system migrate 2>&1
# If migrate fails:
# podman system reset --force
```

## Permission Denied Errors

Fix permission issues with the socket and storage.

```bash
# Check socket file permissions
ls -la /run/user/$(id -u)/podman/ 2>/dev/null

# Check runtime directory ownership
ls -la /run/user/$(id -u)/

# Verify subuid/subgid mappings for rootless operation
grep $(whoami) /etc/subuid
grep $(whoami) /etc/subgid

# If mappings are missing, add them
sudo usermod --add-subuids 100000-165535 --add-subgids 100000-165535 $(whoami)

# Check storage directory permissions
ls -la $(podman info --format '{{.Store.GraphRoot}}' 2>/dev/null || echo "$HOME/.local/share/containers/storage")

# Fix ownership if needed
podman unshare chown -R root:root $(podman info --format '{{.Store.GraphRoot}}')
```

## API Connection Refused

When the socket exists but API calls fail.

```bash
# Verify the socket file exists and is a socket
file /run/user/$(id -u)/podman/podman.sock

# Test the socket directly
curl -v --unix-socket /run/user/$(id -u)/podman/podman.sock \
    http://localhost/libpod/_ping 2>&1

# Check if another process is holding the socket
fuser /run/user/$(id -u)/podman/podman.sock 2>/dev/null

# Check if the service is actually running
systemctl --user is-active podman.service

# Force restart the socket and service
systemctl --user stop podman.service
systemctl --user stop podman.socket
rm -f /run/user/$(id -u)/podman/podman.sock
systemctl --user start podman.socket

# Test again
curl --unix-socket /run/user/$(id -u)/podman/podman.sock \
    http://localhost/libpod/_ping
```

## Storage-Related Issues

Diagnose and fix Podman storage problems.

```bash
# Check storage driver
podman info --format '{{.Store.GraphDriverName}}' 2>&1

# Verify the overlay filesystem works
podman info --format '{{.Store.GraphStatus}}' 2>&1

# Check for layer errors
podman images 2>&1 | grep -i "error"

# Look for corrupted layers
podman system check 2>&1

# If storage is broken, try migration first
podman system migrate

# Check disk space on the storage partition
df -h $(podman info --format '{{.Store.GraphRoot}}' 2>/dev/null || echo "$HOME/.local/share/containers")

# If disk is full, prune unused resources
podman system prune -f
```

## Debugging with Increased Verbosity

Get more detail from Podman for difficult issues.

```bash
# Run commands with debug logging
podman --log-level debug info 2>&1 | tail -30

# Run the service with debug logging
podman --log-level debug system service --time 10 2>&1 | head -100

# Enable debug logging for a specific operation
podman --log-level debug run --rm alpine echo "debug test" 2>&1

# Check syslog for additional messages
journalctl --no-pager -n 50 | grep -i podman
```

## Rootful Service Issues

Troubleshoot the system-level Podman service.

```bash
# Check the rootful socket status
sudo systemctl status podman.socket

# Check rootful service logs
sudo journalctl -u podman.service --no-pager -n 30

# Verify the rootful socket exists
sudo ls -la /run/podman/podman.sock

# Test the rootful API
sudo curl --unix-socket /run/podman/podman.sock \
    http://localhost/libpod/_ping

# Restart the rootful service
sudo systemctl restart podman.socket
```

## Comprehensive Troubleshooting Script

Run a full diagnostic to identify all issues at once.

```bash
#!/bin/bash
# podman-diagnose.sh - Comprehensive Podman service diagnostics

echo "=== Podman Service Diagnostics ==="
echo "Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

# Version info
echo "--- Version ---"
podman --version 2>&1
echo ""

# Service status
echo "--- Service Status ---"
echo "Socket: $(systemctl --user is-active podman.socket 2>/dev/null || echo 'not loaded')"
echo "Service: $(systemctl --user is-active podman.service 2>/dev/null || echo 'not loaded')"
echo ""

# Socket file check
SOCKET="/run/user/$(id -u)/podman/podman.sock"
echo "--- Socket Check ---"
echo "Path: $SOCKET"
echo "Exists: $(test -S "$SOCKET" && echo 'yes' || echo 'no')"
echo ""

# Storage check
echo "--- Storage ---"
podman info --format 'Driver: {{.Store.GraphDriverName}}' 2>&1
podman info --format 'GraphRoot: {{.Store.GraphRoot}}' 2>&1
GRAPH_ROOT=$(podman info --format '{{.Store.GraphRoot}}' 2>/dev/null)
if [ -n "$GRAPH_ROOT" ]; then
    df -h "$GRAPH_ROOT" 2>/dev/null | tail -1
fi
echo ""

# API test
echo "--- API Test ---"
if [ -S "$SOCKET" ]; then
    RESULT=$(curl -s --max-time 5 --unix-socket "$SOCKET" http://localhost/libpod/_ping 2>&1)
    echo "Ping: $RESULT"
else
    echo "Ping: SKIPPED (no socket)"
fi
echo ""

# Recent errors
echo "--- Recent Errors ---"
journalctl --user -u podman.service -p err --no-pager -n 10 --since "24 hours ago" 2>/dev/null || echo "No errors found"
echo ""

# Configuration
echo "--- Configuration ---"
echo "Rootless: $(podman info --format '{{.Host.Security.Rootless}}' 2>/dev/null || echo 'unknown')"
echo "Lingering: $(loginctl show-user $(whoami) --property=Linger --value 2>/dev/null || echo 'unknown')"
echo ""

echo "=== Diagnostics Complete ==="
```

## Common Fixes Quick Reference

A quick lookup for the most frequent issues.

```bash
# Fix: Service won't start after upgrade
podman system migrate

# Fix: "layer not known" errors
podman system reset --force

# Fix: Socket disappears after logout
loginctl enable-linger $(whoami)

# Fix: "too many open files"
# Add to systemd drop-in:
# LimitNOFILE=65536

# Fix: Slow container starts
podman system prune -f
```

## Summary

Troubleshooting Podman system service issues follows a systematic approach: check the service and socket status, review journal logs, verify storage integrity, and test API connectivity. Most issues stem from storage corruption (fix with migrate or reset), permission problems (fix with subuid mappings), or missing socket files (fix with restart and lingering). Use the comprehensive diagnostic script to quickly identify the root cause and apply the appropriate fix.
