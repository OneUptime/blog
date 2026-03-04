# How to Install and Use GNOME Extensions on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, GNOME, Extensions, Desktop Customization, Linux

Description: Install and manage GNOME Shell extensions on RHEL to customize the desktop with additional features like system monitors, clipboard managers, and workspace tools.

---

GNOME Shell extensions add functionality to the RHEL desktop environment. They can provide system monitoring widgets, window tiling, clipboard history, and many other features that are not part of the default GNOME experience.

## Install the GNOME Extensions Infrastructure

```bash
# Install the GNOME Extensions app and browser connector
sudo dnf install -y gnome-extensions-app gnome-shell-extension-common

# Install the browser integration for installing extensions from the web
sudo dnf install -y gnome-browser-connector
```

## Install Extensions from Packages

Some popular extensions are available directly from the RHEL repositories.

```bash
# Search for available GNOME extensions
dnf search gnome-shell-extension

# Install common extensions
# System monitor in the top bar
sudo dnf install -y gnome-shell-extension-system-monitor

# Desktop icons
sudo dnf install -y gnome-shell-extension-desktop-icons

# Application menu
sudo dnf install -y gnome-shell-extension-apps-menu

# Places indicator
sudo dnf install -y gnome-shell-extension-places-menu
```

## Enable Installed Extensions

```bash
# List all installed extensions
gnome-extensions list

# Enable a specific extension
gnome-extensions enable apps-menu@gnome-shell-extensions.gcampax.github.com

# Disable an extension
gnome-extensions disable apps-menu@gnome-shell-extensions.gcampax.github.com

# View details about an extension
gnome-extensions info apps-menu@gnome-shell-extensions.gcampax.github.com
```

## Install Extensions from the Web

1. Open Firefox and navigate to https://extensions.gnome.org
2. The browser connector should prompt you to install the integration
3. Browse extensions and click the toggle switch to install them

## Install Extensions Manually

```bash
# Download an extension zip file from extensions.gnome.org
# Extract it to the user's extensions directory
mkdir -p ~/.local/share/gnome-shell/extensions/

# Extract the extension
# The directory name must match the UUID in metadata.json
unzip extension-file.zip -d ~/.local/share/gnome-shell/extensions/extension-uuid@author

# Enable the extension
gnome-extensions enable extension-uuid@author

# Restart GNOME Shell to load the extension
# On X11: press Alt+F2, type 'r', press Enter
# On Wayland: log out and log back in
```

## Manage Extensions with the Extensions App

```bash
# Open the Extensions management application
gnome-extensions-app

# Or from the Activities menu, search for "Extensions"
```

The Extensions app shows all installed extensions and lets you toggle them on/off, access settings, and remove them.

## Configure Extension Settings

```bash
# Many extensions have configurable options
# Open extension preferences from the command line
gnome-extensions prefs extension-uuid@author

# Or use the Extensions app and click the gear icon next to the extension
```

## Useful Extensions for RHEL Workstations

```bash
# Dash to Dock - Persistent dock for application launchers
# sudo dnf install -y gnome-shell-extension-dash-to-dock

# Clipboard Indicator - Clipboard history manager
# Install from extensions.gnome.org

# GSConnect - Phone integration (like KDE Connect)
sudo dnf install -y gnome-shell-extension-gsconnect
```

## Troubleshooting

```bash
# Check for extension errors in the GNOME Shell log
journalctl /usr/bin/gnome-shell -f

# If an extension causes GNOME to crash, disable it from a TTY
# Press Ctrl+Alt+F3 to switch to a text console
gnome-extensions disable problematic-extension-uuid@author

# Reset all extensions
gsettings set org.gnome.shell enabled-extensions "[]"
```

GNOME extensions provide a flexible way to customize your RHEL desktop to match your workflow needs without modifying system files.
