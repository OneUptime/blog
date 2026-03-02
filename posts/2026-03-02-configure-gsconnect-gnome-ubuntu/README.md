# How to Configure GSConnect for GNOME on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, GNOME, GSConnect, Android, Integration

Description: A complete guide to installing and configuring GSConnect, the GNOME Shell extension that brings KDE Connect functionality to Ubuntu's default desktop environment.

---

GSConnect is a GNOME Shell extension that implements the KDE Connect protocol natively within GNOME. While KDE Connect works on GNOME as a separate app, GSConnect integrates directly into the shell - you get notifications in the GNOME notification area, file sharing from Nautilus right-click menus, and a cleaner system tray experience without running a separate application. It communicates with the same KDE Connect Android app.

## Prerequisites

- Ubuntu 20.04 or 22.04 with GNOME Shell
- Android phone with KDE Connect app installed
- Both devices on the same network

## Installing GSConnect

GSConnect is available through the GNOME Extensions website or via the command line.

### Method 1: From GNOME Extensions Website

1. Install the browser integration helper:

```bash
# Install the GNOME Shell browser extension connector
sudo apt install gnome-shell-extension-manager -y
# or
sudo apt install chrome-gnome-shell -y
```

2. Visit [extensions.gnome.org/extension/1319/gsconnect](https://extensions.gnome.org/extension/1319/gsconnect/) in Firefox or Chrome.
3. Toggle the switch to "ON" and confirm the installation.

### Method 2: From Ubuntu Package

Ubuntu 22.04 and later include GSConnect in the repositories:

```bash
# Install from the Ubuntu repositories
sudo apt update
sudo apt install gnome-shell-extension-gsconnect -y

# Enable the extension
gnome-extensions enable gsconnect@andyholmes.github.io

# Restart GNOME Shell (logout and back in, or press Alt+F2 and type 'r' then Enter)
# On Wayland you must log out and back in
```

### Method 3: Manual Installation

```bash
# Clone the latest GSConnect release
git clone https://github.com/GSConnect/gnome-shell-extension-gsconnect.git

cd gnome-shell-extension-gsconnect

# Build and install to user directory
meson build --prefix=$HOME/.local
ninja -C build install

# Enable the extension
gnome-extensions enable gsconnect@andyholmes.github.io
```

After installation, log out and back in to your GNOME session for the extension to load.

## Configuring Firewall Rules

GSConnect uses the same port range as KDE Connect:

```bash
# Open required ports for device discovery and communication
sudo ufw allow 1714:1764/tcp
sudo ufw allow 1714:1764/udp

# Apply the rules
sudo ufw reload

# Confirm they are active
sudo ufw status numbered | grep 17
```

## Pairing with Your Android Phone

1. Install the KDE Connect app on your Android phone (from Google Play or F-Droid).
2. Make sure both devices are on the same Wi-Fi network.
3. Open KDE Connect on the phone - your Ubuntu machine should appear in the device list.
4. Tap the device name, then tap "Request Pairing."
5. A pairing notification appears on the GNOME desktop - click "Accept."

If the device does not appear automatically:

```bash
# Restart GSConnect (disable and re-enable)
gnome-extensions disable gsconnect@andyholmes.github.io
gnome-extensions enable gsconnect@andyholmes.github.io
```

Or try specifying the phone's IP manually in the GSConnect settings by clicking the "+" button in the device list.

## GNOME Integration Features

### System Menu Integration

After pairing, a phone icon appears in the GNOME top bar system menu. Clicking it reveals connected devices with quick actions:

- Battery level display
- File sharing button
- Media controls
- SMS window shortcut

### Notification Sync

Phone notifications mirror to the GNOME notification system. They appear and disappear in sync with the phone. To configure which apps send notifications across:

1. Open GSConnect settings from the extension icon
2. Select your paired device
3. Go to "Notification Sync" plugin settings
4. Add app names to the allow or block lists

### Nautilus File Manager Integration

GSConnect adds a "Send to [Device Name]" option in Nautilus right-click context menus:

```bash
# If the Nautilus integration is not showing up, install the extension
sudo apt install python3-nautilus -y

# Restart Nautilus to pick up the new integration
nautilus -q && nautilus &
```

Right-click any file in Nautilus and you will see an option to send it directly to your paired phone.

### GNOME Contacts Integration

When an SMS arrives, GSConnect shows the sender's name if they are in your GNOME Contacts (linked to a Google or local address book). This makes SMS management from the desktop much more useful.

## Plugin Configuration

Access plugin settings through the GSConnect preferences:

```bash
# Open GSConnect preferences directly
gnome-extensions prefs gsconnect@andyholmes.github.io
```

### Battery Reporting

The battery plugin shows your phone's charge level in the GNOME system menu and can send a notification when the battery drops below a configurable threshold.

### Clipboard Sync

Copy text on one device, paste on the other. Configure the clipboard plugin to sync automatically or only on demand.

### Mousepad (Remote Touchpad)

Use the phone screen as a trackpad. This plugin can be controlled from the KDE Connect Android app. Useful for presentations when you are away from the keyboard.

### Run Commands

Define shell commands that the phone can trigger:

```bash
# Commands defined here run on the Ubuntu machine when triggered from the phone
# Open in GSConnect device settings > Run Commands
```

Example commands to configure in the GSConnect UI:

```bash
# Lock the screen
loginctl lock-session

# Toggle mute
pactl set-sink-mute @DEFAULT_SINK@ toggle

# Take a screenshot
gnome-screenshot -f /home/$USER/Pictures/remote_screenshot.png

# Open a terminal
gnome-terminal
```

## Using GSConnect from the Command Line

GSConnect exposes a D-Bus API that you can interact with using command-line tools:

```bash
# List connected devices via D-Bus
gdbus call \
    --session \
    --dest org.gnome.Shell.Extensions.GSConnect \
    --object-path /org/gnome/Shell/Extensions/GSConnect \
    --method org.freedesktop.DBus.ObjectManager.GetManagedObjects

# Send a ping to a device (replace DEVICE_ID)
gdbus call \
    --session \
    --dest org.gnome.Shell.Extensions.GSConnect \
    --object-path /org/gnome/Shell/Extensions/GSConnect/Device/DEVICE_ID \
    --method ca.andyholmes.KDEConnect.Plugin.Ping.sendPing \
    "Hello"
```

For simpler scripting, use the `kdeconnect-cli` tool if KDE Connect is also installed:

```bash
# Install the CLI tool separately (works alongside GSConnect)
sudo apt install kdeconnect -y

# Send a file
kdeconnect-cli --device DEVICE_ID --share /path/to/file
```

## Updating GSConnect

```bash
# Update if installed from apt
sudo apt update && sudo apt upgrade gnome-shell-extension-gsconnect

# Update if installed from GNOME Extensions website
# Visit the extension page and click "Update" if available
```

## Troubleshooting

**Extension enabled but no icon in top bar**: Log out and back in. On Wayland, Alt+F2 restart does not work - you must log out fully.

**Device visible but pairing fails**: Check firewall rules. Try `sudo ufw disable` temporarily to confirm the firewall is the issue, then re-enable and add the correct rules.

**Nautilus right-click option missing**: Install `python3-nautilus` and restart Nautilus. If still missing, check that the GSConnect Nautilus script is installed at `~/.local/share/nautilus/scripts/`.

**Notifications not syncing**: Android 10+ requires granting "Notification Access" to KDE Connect in Android system settings. Go to Settings > Notifications > Notification Access and enable KDE Connect.

**Connection keeps dropping**: The phone may be killing KDE Connect in the background. On the phone, go to Settings > Battery > Battery Optimization and set KDE Connect to "Don't optimize."

GSConnect offers a cleaner experience than running the standalone KDE Connect app on GNOME. The Nautilus integration and system menu shortcuts make common phone interactions feel native to the desktop rather than bolted on.
