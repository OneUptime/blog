# How to Use Snap Interfaces to Control Application Permissions on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Snap, Security, Linux, Permissions

Description: A comprehensive guide to using snap interfaces to control what system resources applications can access on Ubuntu, including listing, connecting, and auditing permissions.

---

Snap's interface system is a fine-grained permission model that controls exactly what system resources an application can access. Unlike traditional Linux packages where installed software can generally access anything the user can, snap packages must explicitly declare what they need and users must approve sensitive access. Understanding how to work with snap interfaces gives you meaningful control over application permissions.

## The Interface Model

Every snap runs inside a sandbox. By default, a snap can access very little - it can run code, but it cannot access your files, devices, network, or system information without explicit permission through interfaces.

An interface has two sides:
- A **plug** is what a snap declares it wants to use (e.g., `camera`)
- A **slot** is what provides that capability (usually the system, or another snap)

A connection links a plug to a slot. When connected, AppArmor and seccomp security policies are updated to grant the snap access to that resource.

```bash
# The fundamental command: show all connections for a snap
snap connections firefox

# Show all connections system-wide
snap connections --all | head -40
```

## Listing Available Interfaces

```bash
# List all interfaces the system understands
snap interface

# Output includes:
# - Interface name
# - Summary of what it provides

# Get detailed info on a specific interface
snap interface camera
# Shows: what it does, which snaps have plugs, which snaps have slots

snap interface home
# Shows the interface that grants access to home directory files

# Find which snaps use a specific interface
snap connections --interface audio-playback
snap connections --interface network
```

## Common Interfaces and What They Control

Understanding the most important interfaces helps you make informed decisions about what to allow:

```bash
# Network access
snap interface network          # Outbound network connections
snap interface network-bind     # Bind to network ports (servers)
snap interface network-observe  # View network status without connecting

# Filesystem access
snap interface home             # ~/  (non-hidden files)
snap interface personal-files   # Specific files/dirs declared in snap
snap interface system-files     # Specific system files declared in snap
snap interface removable-media  # /media, /mnt, USB drives

# Hardware
snap interface camera           # Camera devices (/dev/video*)
snap interface audio-playback   # Sound output (ALSA, PulseAudio)
snap interface audio-record     # Microphone input
snap interface joystick         # Joystick/gamepad devices
snap interface optical-drive    # CD/DVD drives
snap interface raw-usb          # Direct USB device access
snap interface serial-port      # Serial port devices
snap interface bluetooth-control # Bluetooth management

# Display
snap interface x11              # X11 display server
snap interface wayland          # Wayland compositor
snap interface opengl           # GPU access (graphics)
snap interface screen-inhibit-control # Prevent screen sleep

# System information
snap interface system-observe   # Read system information
snap interface hardware-observe # Read hardware information
snap interface network-observe  # Read network configuration
snap interface process-control  # Send signals to processes

# Security-sensitive
snap interface ssh-keys         # Read SSH private keys
snap interface gpg-keys         # Read GPG keys
snap interface password-manager-service # D-Bus password manager
snap interface mount-observe    # View mount points
snap interface system-trace     # ptrace and perf access
```

## Checking What an Installed Snap Can Access

```bash
# See all connections for a specific snap
snap connections vlc

# Separate connected from unconnected
snap connections vlc | grep -v " - "   # Connected (has access)
snap connections vlc | grep " - "      # Unconnected (no access)

# Check if a specific interface is connected
snap connections firefox | grep camera
# If the Slot column shows '-', camera is not connected
```

## Granting Access: Connecting Interfaces

```bash
# Connect a single interface
sudo snap connect firefox:camera :camera

# The ':camera' means the system slot for camera
# Full form: snap connect SNAP:PLUG SNAP:SLOT
# Where the system provides slots like ':camera', ':home', ':network'

# Connect multiple interfaces at once
sudo snap connect vlc:camera :camera
sudo snap connect vlc:audio-record :audio-record
sudo snap connect vlc:removable-media :removable-media

# Verify connections after granting
snap connections vlc
```

## Revoking Access: Disconnecting Interfaces

```bash
# Revoke a specific interface
sudo snap disconnect firefox:camera

# Revoke all manually-granted interfaces for a snap
# (auto-connected interfaces remain)
# There's no single command - do it one by one:
snap connections firefox | grep " manual" | awk '{print $2}' | while read plug; do
    sudo snap disconnect "$plug"
done
```

## Auto-Connected vs Manually Connected

When you install a snap, some interfaces connect automatically. These are interfaces deemed safe enough not to require user approval. Others require explicit connection.

```bash
# See connection type in snap connections output
snap connections firefox

# 'auto' in Notes column = auto-connected
# '-' in Notes column = manually connected
# No entry in Slot column = not connected at all
```

To see the auto-connect policy for interfaces:

```bash
# The snap info command shows declared plugs
snap info firefox | grep -A 30 "^plugs:"

# Compare with actual connections
snap connections firefox
```

## Auditing Snap Permissions Across the System

```bash
# Full audit: what can every snap access?
snap connections --all > /tmp/snap-audit.txt
cat /tmp/snap-audit.txt

# Find all snaps with camera access
snap connections --all | grep ":camera" | grep -v " - "

# Find all snaps with microphone access
snap connections --all | grep "audio-record" | grep -v " - "

# Find all snaps with access to SSH keys
snap connections --all | grep "ssh-keys" | grep -v " - "

# Find all snaps with removable media access
snap connections --all | grep "removable-media" | grep -v " - "
```

This type of audit is valuable for security reviews - it gives you a clear picture of which applications can access sensitive resources.

## Snap-to-Snap Connections

Snaps can also grant access to each other through their own slots. This is useful for service-type snaps that provide data or APIs to client snaps:

```bash
# See what slots a snap provides
snap connections postgresql | grep "postgresql:"

# Connect a web app to a database snap
sudo snap connect mywebapp:database postgresql:db

# Content interfaces allow sharing files between snaps
# (commonly used for themes, fonts, icon sets)
snap connections gtk-common-themes
# Shows content slots that other snaps plug into for theme access
```

## Managing Interfaces in Enterprise Environments

For systems managed at scale, you can script interface management:

```bash
#!/bin/bash
# configure-snap-interfaces.sh
# Apply a consistent interface policy across workstations

# Deny camera for all snaps that have it connected (except conferencing tools)
ALLOWED_CAMERA="zoom-client jitsi-meet"

snap connections --all | grep ":camera" | grep -v " - " | while read iface plug slot notes; do
    snapname=$(echo "$plug" | cut -d: -f1)
    if ! echo "$ALLOWED_CAMERA" | grep -qw "$snapname"; then
        echo "Revoking camera from $snapname..."
        sudo snap disconnect "$plug"
    fi
done

# Ensure SSH keys are not accessible to any snap
snap connections --all | grep "ssh-keys" | grep -v " - " | while read iface plug slot notes; do
    echo "Revoking SSH key access from $(echo $plug | cut -d: -f1)..."
    sudo snap disconnect "$plug"
done
```

## Interface Changes After Updates

Snap updates can change an application's declared interfaces. A new version might request additional interfaces that weren't in the previous version:

```bash
# After updating a snap, check if new plugs appeared
sudo snap refresh firefox

# Compare connections before and after
snap connections firefox
# Look for new entries in the list
```

New auto-connect interfaces activate automatically after update. New manually-connected interfaces appear in the list but are not connected until you approve them.

The snap interface system gives you genuine, enforced control over what applications can do. Unlike discretionary access control models where a determined application can often work around restrictions, snap interfaces are enforced at the kernel level through AppArmor and seccomp - the application literally cannot access resources it doesn't have a connection for.
