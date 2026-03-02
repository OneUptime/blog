# How to Configure Snap Aliases and Connections on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Snap, Linux, System Administration

Description: Learn how to configure snap aliases for command shortcuts and manage snap connections to control interface access on Ubuntu systems.

---

Snap packages expose functionality through two mechanisms that users can customize: aliases, which create alternate command names for snap applications, and connections, which control what system resources a snap can access. Both are powerful tools for integrating snap applications smoothly into your workflow and for managing security boundaries. This guide covers both in practical depth.

## Snap Aliases

### What Aliases Are

When you install a snap, its commands are exposed under the snap's name. For example, installing the `hello-world` snap gives you the `hello-world.hello` command, not just `hello`. Aliases let you create shorter, more convenient names.

There are two types of aliases:
- **Automatic aliases**: Declared by the snap developer in `snapcraft.yaml`, enabled by default after Snap Store review
- **Manual aliases**: Created by the user with `snap alias`

### Viewing Existing Aliases

```bash
# See all aliases on the system
snap aliases

# Example output:
# Command                   Alias     Notes
# aws-cli.aws               aws       manual
# git-ubuntu.git-ubuntu     git       auto
# thunderbird.thunderbird   thunderbird auto
```

### Creating Manual Aliases

```bash
# Create an alias 'firefox' for 'firefox.firefox'
# (Firefox snap's main command)
sudo snap alias firefox.firefox firefox

# Alias a specific subcommand
sudo snap alias aws-cli.aws aws

# Create an alias for a snap tool
sudo snap alias jq.jq jq

# Verify the alias was created
snap aliases | grep firefox
```

After creating an alias, you can use the alias name directly in the terminal as if it were a regular command.

### Removing Aliases

```bash
# Remove a specific alias
sudo snap unalias firefox

# Remove all aliases for a snap
sudo snap unalias firefox.firefox

# Verify removal
snap aliases | grep firefox
```

### Automatic Aliases and Conflicts

Automatic aliases are defined by the snap developer and approved by Canonical during the Snap Store review process. They activate automatically when the snap is installed, provided there's no conflict with an existing command.

```bash
# Check if an alias is automatic or manual
snap aliases | grep auto

# If a snap has an automatic alias but it conflicts with an existing command,
# the alias won't be created. You can force it:
sudo snap alias snapname.command commandname
```

If you install a snap whose automatic alias conflicts with a command from another snap, the second snap's alias won't be created. You can resolve this by manually managing which snap gets the alias:

```bash
# Suppose both 'git-ubuntu' and a custom snap define the 'git' alias
# Remove the one you don't want and keep the other
sudo snap unalias git-ubuntu.git-ubuntu
sudo snap alias mygit.git git
```

### Aliases in Scripts and Automation

Aliases created with `snap alias` are available system-wide. They appear as symlinks in `/snap/bin/`:

```bash
# See the symlinks that back your aliases
ls -la /snap/bin/

# Check what a specific alias points to
ls -la /snap/bin/aws
# -> /snap/bin/aws-cli.aws -> (snap wrapper)
```

Because they live in `/snap/bin/`, they work in scripts as long as `/snap/bin` is in the PATH. This is the default on Ubuntu.

## Snap Connections

### Understanding Snap Interfaces

Connections are the mechanism through which snaps access system resources beyond their sandbox. Each connection involves:
- A **plug** on the snap side (what the snap wants to use)
- A **slot** on the system side (what the system provides)

When a plug is connected to a slot, the snap gains access to that resource. The security policy is updated automatically.

```bash
# View all connections for a specific snap
snap connections firefox

# Example output:
# Interface         Plug                      Slot               Notes
# browser-support   firefox:browser-support   :browser-support   -
# camera            firefox:camera            -                  -
# home              firefox:home              :home              -
# network           firefox:network           :network           -

# The '-' in the Slot column means unconnected (access denied)
```

### Viewing Available Interfaces

```bash
# List all available interfaces on the system
snap interface

# Get details about a specific interface
snap interface camera

# See which snaps have plugs/slots for an interface
snap connections --interface camera
```

### Manually Connecting Interfaces

Some interfaces require manual connection by the user. These are typically "sensitive" interfaces where automatic connection would pose security concerns:

```bash
# Connect firefox's camera plug to the system's camera slot
sudo snap connect firefox:camera :camera

# Connect microphone access
sudo snap connect firefox:audio-record :audio-record

# Connect to a removable media interface
sudo snap connect myapp:removable-media :removable-media

# Connect to another snap's slot (snap-to-snap connections)
sudo snap connect client-snap:plug-name server-snap:slot-name
```

### Disconnecting Interfaces

```bash
# Disconnect a specific interface
sudo snap disconnect firefox:camera

# Disconnect all connections for a snap
sudo snap disconnect firefox

# This revokes all interface access beyond the automatic minimums
```

### Auto-Connected vs Manually Connected Interfaces

The Snap Store classification determines which interfaces auto-connect:

**Auto-connected (safe interfaces)** - Connect automatically on snap install:
- `network` - Basic network access
- `network-bind` - Bind to network ports
- `home` - Access to non-hidden files in home directory
- `x11` - X11 display access
- `wayland` - Wayland display access
- `browser-support` - Browser-specific kernel access

**Manually connected (sensitive interfaces)** - Require user action:
- `camera` - Camera device access
- `audio-record` - Microphone access
- `removable-media` - USB drives, SD cards
- `raw-usb` - Direct USB device access
- `system-observe` - Read system information
- `ssh-keys` - Access to SSH private keys

```bash
# See auto-connected interfaces for a snap
snap connections firefox | grep -v "^Interface" | awk '$3 != "-" {print $1, $2, $3}'

# See disconnected (available but not granted) interfaces
snap connections firefox | grep " - "
```

### Snap-to-Snap Connections

Snaps can also provide services to other snaps through their own slots. A database snap might provide a `postgresql-9.6` slot that client applications can connect to:

```bash
# See what slots a snap provides
snap connections postgresql | grep "postgresql:"

# Connect another snap to the database
sudo snap connect mywebapp:database postgresql:db
```

### Practical Example: Setting Up a Fully Functional Media Player

```bash
# Install VLC snap
sudo snap install vlc

# Check what's connected and what isn't
snap connections vlc

# Connect camera (for capture functionality)
sudo snap connect vlc:camera :camera

# Connect microphone
sudo snap connect vlc:audio-record :audio-record

# Connect to optical drives
sudo snap connect vlc:optical-drive :optical-drive

# Connect to removable media (USB drives)
sudo snap connect vlc:removable-media :removable-media

# Verify all connections
snap connections vlc
```

### Scripting Connection Management

```bash
#!/bin/bash
# setup-snap-connections.sh
# Establish required connections for known snaps

connect_if_needed() {
    local snap_plug="$1"
    local system_slot="$2"

    if snap connections "$snap_plug" 2>/dev/null | grep -q "$system_slot"; then
        echo "Already connected: $snap_plug -> $system_slot"
    else
        sudo snap connect "$snap_plug" "$system_slot"
        echo "Connected: $snap_plug -> $system_slot"
    fi
}

# Firefox connections
connect_if_needed "firefox:camera" ":camera"
connect_if_needed "firefox:audio-record" ":audio-record"

# VLC connections
connect_if_needed "vlc:camera" ":camera"
connect_if_needed "vlc:removable-media" ":removable-media"
```

Aliases simplify daily workflow when snap command names are verbose. Connections let you precisely control the capabilities each snap has, following the principle of least privilege - only grant access that the application actually needs, and revoke it when you're done.
