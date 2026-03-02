# How to Configure GNOME Shell Extensions on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, GNOME, Desktop, Extension, Customization

Description: A complete guide to installing, managing, and configuring GNOME Shell extensions on Ubuntu to customize and enhance your desktop environment.

---

GNOME Shell extensions add functionality to the GNOME desktop that is not present by default. They can modify the appearance of the shell, add new panel indicators, change window management behavior, or integrate external services. Extensions are the primary way to customize GNOME, and the official extensions repository at extensions.gnome.org hosts thousands of them.

## Understanding GNOME Shell Versions

Extensions are tied to specific GNOME Shell versions. Installing an extension built for GNOME 43 on GNOME 44 may not work. Check your version first:

```bash
# Check GNOME Shell version
gnome-shell --version
# Example output: GNOME Shell 44.3

# Check using dconf
gsettings get org.gnome.desktop.session session-name
```

Ubuntu ships specific GNOME versions per release:
- Ubuntu 22.04: GNOME 42
- Ubuntu 23.04: GNOME 44
- Ubuntu 24.04: GNOME 46

## Installing Required Tools

```bash
# Install GNOME Shell extension management tools
sudo apt update
sudo apt install -y gnome-shell-extensions gnome-shell-extension-manager

# Install the GNOME Tweaks tool for additional settings
sudo apt install -y gnome-tweaks

# Install the browser integration for extensions.gnome.org
sudo apt install -y chrome-gnome-shell

# For Firefox, also install the browser extension:
# Visit https://extensions.gnome.org and click the link to install the browser add-on
```

## Methods for Installing Extensions

### Method 1: Extensions Manager App

The Extensions Manager (installed as `gnome-shell-extension-manager`) provides a graphical way to browse, install, and manage extensions:

```bash
# Launch the extensions manager
gnome-shell-extension-manager
# Or find it in applications as "Extension Manager"
```

### Method 2: GNOME Extensions Website

Visit `https://extensions.gnome.org` in a browser with the browser integration installed. Toggle the switch next to any extension to install it.

### Method 3: APT Package Manager

Many popular extensions are packaged for Ubuntu:

```bash
# List available GNOME extensions in apt
apt search gnome-shell-extension | grep "^gnome-shell-extension" | head -30

# Install specific extensions via apt
sudo apt install -y gnome-shell-extension-appindicator
sudo apt install -y gnome-shell-extension-desktop-icons-ng
sudo apt install -y gnome-shell-extension-ubuntu-dock

# System-wide extensions installed via apt go to:
ls /usr/share/gnome-shell/extensions/
```

### Method 4: Manual Installation

For extensions not in the repositories:

```bash
# Download extension from extensions.gnome.org
# Each extension has a UUID like: user-theme@gnome-shell-extensions.gcampax.github.com

# Create user extensions directory
mkdir -p ~/.local/share/gnome-shell/extensions

# Extract the downloaded .zip to the extension directory
# The directory name must match the extension UUID
unzip extension.zip -d ~/.local/share/gnome-shell/extensions/extension-uuid@author

# Enable the extension
gnome-extensions enable extension-uuid@author

# Reload GNOME Shell (X11 only - on Wayland, you must log out and log back in)
# On X11:
busctl --user call org.gnome.Shell /org/gnome/Shell org.gnome.Shell Eval s 'Meta.restart("Restarting…")'
```

## Managing Extensions from the Command Line

```bash
# List all installed extensions
gnome-extensions list

# List only enabled extensions
gnome-extensions list --enabled

# List only disabled extensions
gnome-extensions list --disabled

# Enable an extension by UUID
gnome-extensions enable dash-to-dock@micxgx.gmail.com

# Disable an extension
gnome-extensions disable dash-to-dock@micxgx.gmail.com

# Show extension information
gnome-extensions info user-theme@gnome-shell-extensions.gcampax.github.com

# Check extension status
gnome-extensions show dash-to-dock@micxgx.gmail.com
```

## Popular Extensions and Their UUIDs

### Dash to Dock

Transforms the GNOME dash into a persistent dock similar to macOS:

```bash
# UUID: dash-to-dock@micxgx.gmail.com
# Configure via Extensions Manager or dconf

# Set dock position to bottom
gsettings set org.gnome.shell.extensions.dash-to-dock dock-position 'BOTTOM'

# Set fixed icon size
gsettings set org.gnome.shell.extensions.dash-to-dock dash-max-icon-size 48

# Enable autohide
gsettings set org.gnome.shell.extensions.dash-to-dock autohide true
gsettings set org.gnome.shell.extensions.dash-to-dock intellihide true
```

### AppIndicator Support

Adds system tray support for legacy applications:

```bash
# UUID: appindicatorsupport@rgcjonas.gmail.com
# Or install via apt:
sudo apt install -y gnome-shell-extension-appindicator

# Enable it
gnome-extensions enable appindicatorsupport@rgcjonas.gmail.com

# Restart GNOME Shell to see system tray icons
```

### User Themes

Allows loading GNOME Shell themes from `~/.themes`:

```bash
# UUID: user-theme@gnome-shell-extensions.gcampax.github.com
# Often pre-installed with gnome-shell-extensions

# Enable it
gnome-extensions enable user-theme@gnome-shell-extensions.gcampax.github.com

# Install a theme
sudo apt install -y gnome-themes-extra

# Or download from gnome-look.org and place in ~/.themes/
# Set theme via GNOME Tweaks > Appearance > Shell
```

### GSConnect (KDE Connect for GNOME)

Integrates your Android phone with the desktop:

```bash
# UUID: gsconnect@andyholmes.github.io
sudo apt install -y gnome-shell-extension-gsconnect

gnome-extensions enable gsconnect@andyholmes.github.io
```

## Configuring Extensions via dconf

Extensions store their settings in dconf. You can query and modify them directly:

```bash
# List all dconf keys for GNOME shell extensions
dconf dump /org/gnome/shell/extensions/

# Read a specific setting
dconf read /org/gnome/shell/extensions/dash-to-dock/dock-position

# Write a setting
dconf write /org/gnome/shell/extensions/dash-to-dock/dock-position "'LEFT'"

# Reset a setting to default
dconf reset /org/gnome/shell/extensions/dash-to-dock/dock-position

# Export all extension settings for backup
dconf dump /org/gnome/shell/extensions/ > gnome-extensions-backup.dconf

# Restore settings
dconf load /org/gnome/shell/extensions/ < gnome-extensions-backup.dconf
```

## Scripted Extension Configuration

For consistent setup across multiple machines:

```bash
#!/bin/bash
# setup-gnome-extensions.sh
# Configure a standard set of GNOME Shell extensions

# Install required packages
sudo apt install -y \
    gnome-shell-extensions \
    gnome-shell-extension-appindicator \
    gnome-tweaks

# List of extensions to enable (by UUID)
EXTENSIONS=(
    "appindicatorsupport@rgcjonas.gmail.com"
    "user-theme@gnome-shell-extensions.gcampax.github.com"
    "workspace-indicator@gnome-shell-extensions.gcampax.github.com"
    "places-menu@gnome-shell-extensions.gcampax.github.com"
)

for ext in "${EXTENSIONS[@]}"; do
    if gnome-extensions list | grep -q "$ext"; then
        gnome-extensions enable "$ext"
        echo "Enabled: $ext"
    else
        echo "Not installed: $ext"
    fi
done

# Apply settings
dconf write /org/gnome/shell/extensions/appindicatorsupport/icon-size 18
dconf write /org/gnome/desktop/wm/preferences/button-layout "'appmenu:minimize,maximize,close'"

echo "GNOME extensions configured"
```

## Troubleshooting Extensions

When extensions cause problems, debug with these steps:

```bash
# Check GNOME Shell logs for extension errors
journalctl -f /usr/bin/gnome-shell

# Look for extension-specific errors
journalctl | grep -i "extension" | tail -50

# Find extensions causing crashes
# GNOME Shell logs the faulty extension on crash:
journalctl | grep "Error in extension"

# Temporarily disable all extensions to test
gsettings set org.gnome.shell disable-user-extensions true

# Re-enable
gsettings set org.gnome.shell disable-user-extensions false

# If GNOME Shell is crashing, disable extensions from TTY
# Press Ctrl+Alt+F3 to switch to TTY
# Log in and disable all extensions:
DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/$(id -u)/bus \
  dconf write /org/gnome/shell/disable-user-extensions true

# Then log back into graphical session and re-enable one by one
# to find the problematic extension
```

## Safe Mode and Recovery

If GNOME becomes unusable due to an extension:

```bash
# Boot to recovery or switch to TTY (Ctrl+Alt+F3)
# Disable all user extensions
sudo -u yourusername DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/$(id -u yourusername)/bus \
  gsettings set org.gnome.shell disable-user-extensions true

# Or remove extensions directory entirely as last resort
# mv ~/.local/share/gnome-shell/extensions ~/.local/share/gnome-shell/extensions.bak
```

Extensions are the right place to customize GNOME because they operate at the shell level with access to all of GNOME's internals. The key discipline is keeping only extensions you actually use - each one is additional JavaScript running inside GNOME Shell, and a poorly written extension can degrade shell performance or cause instability. Audit your installed extensions periodically and remove anything you no longer actively need.
