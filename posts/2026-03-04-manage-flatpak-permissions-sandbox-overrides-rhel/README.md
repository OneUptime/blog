# How to Manage Flatpak Permissions and Sandbox Overrides on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Flatpak, Permissions, Sandbox, Security, Linux

Description: Manage Flatpak application permissions and sandbox overrides on RHEL to control what files, devices, and system resources each sandboxed application can access.

---

Flatpak applications run in sandboxed environments with restricted access to the host system. Each application declares the permissions it needs, but you can override these to grant or revoke access to files, devices, network, and other resources.

## View Application Permissions

```bash
# View the permissions of an installed Flatpak application
flatpak info --show-permissions org.mozilla.firefox

# View the complete metadata including sandbox settings
flatpak info --show-metadata org.mozilla.firefox

# List the filesystem access grants
flatpak override --show org.mozilla.firefox
```

## Understanding Permission Types

Flatpak permissions cover several categories:

```bash
# Common permission types:
# --filesystem=   Access to directories on the host
# --device=       Access to hardware devices
# --socket=       Access to sockets (X11, Wayland, PulseAudio, etc.)
# --share=        Shared resources (network, IPC)
# --talk-name=    D-Bus session bus names
# --system-talk-name=  D-Bus system bus names
```

## Grant Additional Permissions

```bash
# Give an application access to your home directory
flatpak override --user --filesystem=home org.mozilla.firefox

# Give access to a specific directory
flatpak override --user --filesystem=/mnt/data org.videolan.VLC

# Give access to removable media
flatpak override --user --filesystem=/run/media org.videolan.VLC

# Grant access to a device (e.g., webcam)
flatpak override --user --device=all org.mozilla.firefox
```

## Revoke Permissions

```bash
# Remove filesystem access
flatpak override --user --nofilesystem=home org.mozilla.firefox

# Remove network access (make the app fully offline)
flatpak override --user --unshare=network com.example.app

# Remove device access
flatpak override --user --no-device=all org.mozilla.firefox
```

## Manage Permissions with Flatseal (Graphical Tool)

Flatseal is a graphical application for managing Flatpak permissions.

```bash
# Install Flatseal from Flathub
flatpak install -y flathub com.github.tchx84.Flatseal

# Launch Flatseal
flatpak run com.github.tchx84.Flatseal
```

Flatseal shows all installed Flatpak applications in a sidebar. Select an app to see and toggle its permissions using checkboxes and text fields.

## View and Reset Overrides

```bash
# Show all overrides for an application
flatpak override --show org.mozilla.firefox

# Reset all overrides for an application (restore default permissions)
flatpak override --user --reset org.mozilla.firefox

# Show global overrides that apply to all applications
flatpak override --show
```

## Set Global Overrides

```bash
# Apply an override to all Flatpak applications
# Give all apps access to a shared data directory
flatpak override --user --filesystem=/shared/data

# Deny all apps access to the SSH directory
flatpak override --user --nofilesystem=~/.ssh
```

## Common Override Examples

```bash
# Allow an application to access GTK themes (for consistent appearance)
flatpak override --user --filesystem=~/.themes org.mozilla.firefox
flatpak override --user --filesystem=~/.local/share/themes org.mozilla.firefox

# Allow access to icon themes
flatpak override --user --filesystem=~/.local/share/icons org.mozilla.firefox

# Allow an IDE to access project directories
flatpak override --user --filesystem=~/Projects com.visualstudio.code

# Allow printing
flatpak override --user --socket=cups com.example.app
```

## View Override Files

```bash
# User overrides are stored in:
ls ~/.local/share/flatpak/overrides/

# System-wide overrides are stored in:
ls /var/lib/flatpak/overrides/

# View the contents of an override file
cat ~/.local/share/flatpak/overrides/org.mozilla.firefox
```

Managing Flatpak permissions gives you fine-grained control over application security on RHEL, letting you follow the principle of least privilege while still allowing applications to function correctly.
