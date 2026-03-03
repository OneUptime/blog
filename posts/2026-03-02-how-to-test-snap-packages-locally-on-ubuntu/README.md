# How to Test Snap Packages Locally on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Snap, Testing, Snapcraft

Description: Learn how to install, run, and debug snap packages locally on Ubuntu before publishing, including confinement testing, interface connections, and log inspection.

---

Before publishing a snap to the Snap Store, you need to test it thoroughly on a local machine. Local snap testing covers installing the built `.snap` file, verifying all commands work, checking confinement behavior, and ensuring interfaces are properly configured. This guide covers the full local testing workflow.

## Installing a Local Snap

After building with `snapcraft`, you get a `.snap` file. Install it with:

```bash
# Install in devmode (no sandbox - for initial testing)
sudo snap install --devmode my-app_1.0_amd64.snap

# Install with dangerous flag (required for local snaps, any confinement)
sudo snap install --dangerous my-app_1.0_amd64.snap

# Install with a specific channel (not applicable for local files, but for store snaps)
sudo snap install my-app --channel=beta
```

`--dangerous` is required for snaps not from the store. `--devmode` additionally disables the security sandbox, which is useful for debugging but not for verifying that your confinement configuration is correct.

For testing strict confinement specifically:

```bash
# Install with strict confinement enabled
sudo snap install --dangerous my-app_1.0_amd64.snap

# This tests the actual sandbox - if something breaks, it's because
# you're missing interface declarations
```

## Running the Snap

After installation, run your snap's commands:

```bash
# Run the main command (same name as snap)
my-app

# Run secondary commands (snap-name.command-name)
my-app.helper

# Run as root if needed
sudo my-app

# Check what commands the snap provides
snap info my-app | grep commands
```

## Viewing Snap Information

```bash
# Show snap details, connections, and services
snap info my-app

# Show installed snap details including developer mode status
snap list my-app

# Show the snap's confinement level
snap list | grep my-app
```

## Checking Snap Logs

For daemons and services:

```bash
# View logs for a snap service
sudo snap logs my-app

# Follow logs in real time
sudo snap logs -f my-app

# View logs for a specific service within a snap
sudo snap logs my-app.my-service

# View more log history
sudo snap logs -n 200 my-app

# Use journalctl for more filtering options
sudo journalctl -u snap.my-app.my-service -f
```

For regular commands, output goes to stdout/stderr as usual.

## Testing Interface Connections

Snaps in strict confinement need interfaces to access system resources. After installing, check what interfaces are connected:

```bash
# List interface connections for a snap
snap connections my-app

# List all installed snaps and their connections
snap connections

# See available interfaces
snap interface --attrs network
```

If your snap needs access that isn't working, check if the interface needs to be manually connected:

```bash
# Connect an interface manually
sudo snap connect my-app:network

# Connect to a specific slot
sudo snap connect my-app:home :home

# Disconnect an interface
sudo snap disconnect my-app:home

# Check if the interface is auto-connected or needs manual connection
snap interface network
```

Some interfaces require user confirmation or store approval. During development with `--devmode`, interface connection doesn't matter, but with strict confinement it does.

## Testing Sandbox Behavior

To test that your snap works under strict confinement:

```bash
# Install strictly (without devmode)
sudo snap install --dangerous my-app_1.0_amd64.snap

# Run and watch for permission errors
my-app 2>&1 | head -50

# Check audit log for denied operations
sudo dmesg | grep "apparmor.*DENIED" | tail -20

# Or check journalctl
sudo journalctl -t kernel | grep "apparmor.*DENIED" | tail -20
```

When you see a denial, it tells you exactly which system call or resource was blocked:

```text
audit: type=1400 audit(1234567890.123:456): apparmor="DENIED" operation="open"
profile="snap.my-app.my-app" name="/etc/hosts" pid=1234 comm="my-app"
```

This tells you the snap tried to open `/etc/hosts` and was denied. Add the appropriate interface (in this case `network` or `network-observe` provides `/etc/hosts` access).

## Testing Configuration

If your snap has configurable options via `snap set`:

```yaml
# In snapcraft.yaml, hooks handle configuration
hooks:
  configure:
    plugs:
      - network
```

```bash
# Set configuration options
sudo snap set my-app port=8080
sudo snap set my-app debug=true

# Read configuration
snap get my-app port

# List all configuration
snap get my-app
```

## Testing Snap Refresh (Update)

Simulate an update to make sure your snap handles upgrades gracefully:

```bash
# Install version 1
sudo snap install --dangerous my-app_1.0_amd64.snap

# Build version 2 (bump version in snapcraft.yaml)
snapcraft

# Install the update (simulates a refresh)
sudo snap install --dangerous my-app_2.0_amd64.snap

# Check the snap was updated
snap list my-app

# Verify data migration worked (if your snap stores data)
ls ~/snap/my-app/current/
```

## Snap Data Directories

Snaps have specific directories for storing data:

```bash
# User data (backed up on snap refresh)
ls ~/snap/my-app/current/

# User data from previous version (kept on refresh)
ls ~/snap/my-app/previous/

# System data (persists across refreshes)
ls /var/snap/my-app/current/

# Temporary snap data
ls /tmp/snap-private-tmp/snap.my-app/

# Check what your snap is actually writing
strace -e trace=openat my-app 2>&1 | grep -v "= -1"
```

## Testing with Different Users

If your snap interacts with user data, test with different users:

```bash
# Install globally
sudo snap install --dangerous my-app_1.0_amd64.snap

# Test as your user
my-app

# Test as another user
sudo -u testuser my-app

# Check that each user has separate data
ls /home/testuser/snap/my-app/current/
```

## Removing and Reinstalling for Clean Tests

```bash
# Remove snap and all its data
sudo snap remove my-app

# Remove snap but keep user data
sudo snap remove --purge my-app

# Verify removal
snap list my-app   # should show "no matching snaps installed"

# Reinstall fresh
sudo snap install --dangerous my-app_1.0_amd64.snap
```

## Automated Testing with Shell Scripts

A basic test script:

```bash
#!/bin/bash
set -e

SNAP_FILE="my-app_1.0_amd64.snap"
SNAP_NAME="my-app"

echo "Installing snap..."
sudo snap install --dangerous "$SNAP_FILE"

echo "Testing main command..."
$SNAP_NAME --version | grep "1.0"

echo "Testing with sample input..."
echo '{"key": "value"}' | $SNAP_NAME process

echo "Testing service status..."
sudo snap start $SNAP_NAME.my-service
snap services $SNAP_NAME | grep active

echo "Testing logs..."
sudo snap logs $SNAP_NAME | grep -v "^$"

echo "All tests passed!"
sudo snap remove $SNAP_NAME
```

## Checking Snap Health for Services

```bash
# Check service status
snap services my-app

# Start/stop/restart services
sudo snap start my-app
sudo snap stop my-app
sudo snap restart my-app

# Check health status
snap info my-app | grep health
```

Once local testing passes - the snap installs cleanly, commands work, interfaces are properly configured, and services behave correctly - you're ready to publish to the Snap Store.
