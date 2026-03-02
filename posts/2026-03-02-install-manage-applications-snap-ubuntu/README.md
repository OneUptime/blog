# How to Install and Manage Applications with Snap on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Snap, Package Management, System Administration, Application

Description: Learn how to install, update, remove, and manage Snap packages on Ubuntu, including working with channels, understanding confinement levels, managing snap services, and controlling snap updates.

---

Snap is Ubuntu's containerized package format, developed by Canonical. Snap packages bundle an application with all its dependencies in a single compressed file, run in a confined sandbox environment, and update automatically. Understanding how Snap works and how to manage it effectively is increasingly important on Ubuntu systems since many applications are now primarily distributed through the Snap Store.

## How Snap Differs from APT Packages

Before getting into management, the key differences:

- **Self-contained**: Snap packages include their dependencies, so two Snaps can use different versions of the same library without conflict
- **Auto-updates**: Snaps update automatically by default, unlike APT packages
- **Sandboxed**: Snaps run with restricted access to system resources (though confinement varies)
- **Versioned channels**: Snaps have channels (stable, candidate, beta, edge) you can follow
- **Larger size**: Because they include dependencies, Snaps are usually larger than equivalent APT packages

## Installing Snaps

```bash
# Install a snap from the Snap Store
sudo snap install vlc

# Install from a specific channel (stable is default)
sudo snap install vlc --channel=stable

# Install an unstable/beta version
sudo snap install vlc --channel=edge

# Install a classic snap (less confined, more system access)
sudo snap install code --classic

# Install multiple snaps
sudo snap install telegram-desktop spotify discord
```

The `--classic` flag is required for development tools and applications that need broader system access than strict confinement allows (like editors, IDEs, and compilers).

## Listing Installed Snaps

```bash
# List all installed snaps
snap list

# Output:
# Name            Version          Rev    Tracking       Publisher   Notes
# core20          20231123         2182   latest/stable  canonical   base
# snapd           2.60.4           20671  latest/stable  canonical   snapd
# vlc             3.0.20           3078   latest/stable  videolan    -
# code            1.85.1           174    latest/stable  vscode      classic

# Show detailed information about a specific snap
snap info vlc
```

## Removing Snaps

```bash
# Remove a snap
sudo snap remove vlc

# Remove and save a snapshot of snap data first
sudo snap remove --purge vlc

# The --purge flag removes without creating a data snapshot
# Without it, snap data is saved and can be restored
```

## Updating Snaps

```bash
# Update all snaps
sudo snap refresh

# Update a specific snap
sudo snap refresh vlc

# Check what would be updated (like a dry run)
sudo snap refresh --list

# Update to a specific channel
sudo snap refresh vlc --channel=stable
```

## Understanding Snap Channels

Channels allow snaps to follow different stability tracks:

```bash
# Show available channels for a snap
snap info vlc | grep -A 20 "channels:"

# Output:
#   channels:
#     latest/stable:    3.0.20         2024-01-15 (3078) 304MB -
#     latest/candidate: 3.0.20         2024-01-10 (3077) 304MB -
#     latest/beta:      3.0.20-beta1   2024-01-05 (3070) 305MB -
#     latest/edge:      4.0.0-dev-1234 2024-01-20 (3085) 310MB -

# Switch a snap to a different channel
sudo snap switch vlc --channel=beta
sudo snap refresh vlc
```

Channels are organized as `track/risk-level/branch`. Most snaps only use the `latest` track, but software like Kubernetes uses tracks for major versions (`1.28/stable`, `1.29/stable`, etc.).

## Controlling Automatic Updates

By default, snaps update automatically up to 4 times per day. This can be disruptive on production systems:

```bash
# Check current refresh schedule
snap get system refresh.timer

# Set a specific refresh time (run at 2 AM)
sudo snap set system refresh.timer=02:00-04:00

# Set a specific day and time (Sunday at 3 AM)
sudo snap set system refresh.timer=sun,03:00-04:00

# Hold all snap updates for a maximum of 60 days
sudo snap refresh --hold=60d

# Hold a specific snap update
sudo snap refresh --hold vlc

# Release the hold on a specific snap
sudo snap refresh --unhold vlc

# Completely disable automatic updates (not recommended for security)
sudo snap set system refresh.hold="forever"
```

## Working with Snap Channels for Kubernetes

Kubernetes is a common case where channel management matters significantly:

```bash
# Install kubectl from a specific Kubernetes version track
sudo snap install kubectl --channel=1.29/stable --classic

# Check current channel
snap list kubectl

# Switch to a newer version track
sudo snap switch kubectl --channel=1.30/stable
sudo snap refresh kubectl
```

## Snap Connections and Permissions

Snaps are sandboxed and must be granted explicit permissions to access system resources:

```bash
# View all connections (permissions) for a snap
snap connections vlc

# Output:
# Interface              Plug                          Slot                      Notes
# audio-playback         vlc:audio-playback            :audio-playback           -
# desktop                vlc:desktop                   :desktop                  -
# network                vlc:network                   :network                  -
# removable-media        vlc:removable-media           -                         -

# Connect a permission (grant access)
sudo snap connect vlc:removable-media :removable-media

# Disconnect a permission (revoke access)
sudo snap disconnect vlc:removable-media
```

## Snap Services

Many snaps run background services (similar to systemd services):

```bash
# List services from installed snaps
snap services

# Start a snap service
sudo snap start snap-name.service-name

# Stop a snap service
sudo snap stop snap-name.service-name

# Enable a snap service to start on boot
sudo snap start --enable snap-name.service-name

# Disable a snap service from starting on boot
sudo snap stop --disable snap-name.service-name

# View service logs
snap logs snap-name.service-name

# Follow service logs
snap logs -f snap-name.service-name
```

## Snap Snapshots (Backups)

Snap maintains automatic snapshots of application data:

```bash
# Create a manual snapshot of all snap data
sudo snap save

# Create a snapshot for a specific snap
sudo snap save vlc

# List available snapshots
snap saved

# Restore from a snapshot
sudo snap restore SNAPSHOT-ID

# Remove a snapshot
sudo snap forget SNAPSHOT-ID
```

## Reverting to Previous Versions

Snap automatically keeps the previous version installed for rollback:

```bash
# Revert a snap to its previous version
sudo snap revert vlc

# Revert to a specific revision
sudo snap revert vlc --revision=3070
```

## Using snap find to Discover Packages

```bash
# Search for snaps in the Snap Store
snap find "video player"

# Show detailed information about a snap before installing
snap info mpv

# Filter by publisher
snap find --publisher=canonical
```

## Snap Configuration

Many snaps support configuration options:

```bash
# View current configuration for a snap
snap get nextcloud

# Set a configuration value
sudo snap set nextcloud ports.http=8080

# Unset a configuration value
sudo snap unset nextcloud ports.http
```

## Disk Space Usage

Snaps can use significant disk space, especially when multiple revisions are kept:

```bash
# Check space used by snaps
du -sh /snap/

# List all snap versions taking space
df -h /var/lib/snapd/snaps/
ls -lh /var/lib/snapd/snaps/

# Clean up old snap revisions (keeps current + 1 previous by default)
sudo snap set system refresh.retain=2

# Remove old revisions manually
LANG=en_US.UTF-8 snap list --all | awk '/disabled/{print $1, $3}' | \
    while read snapname revision; do
        sudo snap remove "$snapname" --revision="$revision"
    done
```

## Disabling the Snap Daemon

On servers where you're not using snaps:

```bash
# Check if any snaps are installed
snap list

# If none are needed, stop and mask snapd
sudo systemctl disable --now snapd
sudo systemctl mask snapd

# Note: Some Ubuntu functionality depends on snapd
# (snap-based Firefox, gnome-software, etc.)
# Verify nothing critical depends on it before masking
```

## Summary

Key snap management commands:

- `sudo snap install package` - Install a snap
- `sudo snap remove package` - Remove a snap
- `sudo snap refresh` - Update all snaps
- `snap list` - List installed snaps
- `snap info package` - Detailed package information
- `snap connections package` - View permissions
- `sudo snap set system refresh.timer=02:00` - Schedule update time
- `sudo snap revert package` - Roll back to previous version

Snap and APT coexist on Ubuntu. Use APT for server infrastructure packages where you want precise version control, and snap for desktop applications, developer tools distributed through the Snap Store, and anything that benefits from automatic updates and cross-distribution compatibility.
