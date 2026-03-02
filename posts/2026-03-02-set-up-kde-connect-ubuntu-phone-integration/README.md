# How to Set Up KDE Connect on Ubuntu for Phone Integration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, KDE Connect, Android, Integration, Desktop

Description: Learn how to install and configure KDE Connect on Ubuntu to seamlessly connect your Android phone for notifications, file transfer, and remote control.

---

KDE Connect bridges the gap between your Ubuntu desktop and Android phone. Once paired, your phone's notifications show up on the desktop, you can transfer files without cables, use the phone as a touchpad or keyboard, send clipboard contents back and forth, and even control media playback from your phone. Despite the KDE branding, it works perfectly well on GNOME and other desktop environments.

## What KDE Connect Can Do

- Mirror phone notifications to the desktop
- Sync clipboard between phone and PC
- Transfer files in both directions
- Use the phone as a remote trackpad and keyboard
- Control media playback (pause/play/skip)
- Send and receive SMS from the desktop
- Remote control the PC from the phone
- Mount the phone filesystem over SFTP
- Execute custom commands on the PC triggered from the phone

## Installing KDE Connect on Ubuntu

```bash
# Update package lists
sudo apt update

# Install KDE Connect
sudo apt install kdeconnect -y
```

On older Ubuntu versions or if you want the latest release, install from the KDE Backports PPA:

```bash
# Add the KDE Backports PPA
sudo add-apt-repository ppa:kubuntu-ppa/backports -y
sudo apt update
sudo apt install kdeconnect -y
```

For GNOME users, the `gnome-shell-extension-gsconnect` package provides native GNOME Shell integration (covered separately), but stock KDE Connect works fine through the system tray.

## Installing the Android App

On your Android device, install the KDE Connect app from:

- F-Droid (recommended - open source build)
- Google Play Store

Both versions offer identical functionality.

## Configuring the Firewall

KDE Connect requires specific ports to be open on the Ubuntu firewall. Both devices must be on the same network.

```bash
# KDE Connect uses TCP port 1716 for connection and UDP 1716 for device discovery
# TCP ports 1714-1764 are used for various plugins
sudo ufw allow 1714:1764/tcp
sudo ufw allow 1714:1764/udp

# Reload the firewall to apply changes
sudo ufw reload

# Verify the rules are active
sudo ufw status | grep 171
```

## Pairing Devices

1. Make sure your phone and Ubuntu machine are on the same Wi-Fi network.
2. Open KDE Connect on your Android phone.
3. On Ubuntu, run KDE Connect indicator from the app menu or start it from the terminal:

```bash
# Start KDE Connect daemon (usually auto-starts)
/usr/lib/kdeconnect/kdeconnectd &

# Launch the KDE Connect settings UI
kdeconnect-app
```

Your phone should appear in the device list. Click it, then click "Request Pairing" from either side. Accept the pairing request on the other device. A pairing notification appears on both the phone and the desktop.

## Exploring Plugins

Once paired, KDE Connect exposes its features through plugins. Open the paired device settings to enable or disable individual plugins:

```bash
# Open settings for a specific paired device (replace DEVICE_ID with yours)
kdeconnect-settings

# Or use the CLI to list devices
kdeconnect-cli --list-devices
```

### Notification Sync

Phone notifications appear as desktop notifications. This works bidirectionally - desktop notifications can also be sent to the phone. In the plugin settings, you can filter which apps send notifications across.

### File Transfer

```bash
# Send a file to the paired phone from the command line
kdeconnect-cli --device DEVICE_ID --share /path/to/file.pdf

# List paired device IDs
kdeconnect-cli -l
```

From the phone, use the "Send Files" option in the KDE Connect app to push files to the Ubuntu machine. They land in `~/Downloads` by default.

### Clipboard Sync

Enable the "Clipboard Sync" plugin to share clipboard content. Copy on one device, paste on the other. This is particularly useful for URLs, passwords from a password manager, or snippets.

### Remote Touchpad

The phone screen becomes a trackpad for the Ubuntu cursor. Two-finger scroll and tap-to-click work as expected. This is handy when your keyboard and mouse are out of reach.

### SMS

Send and receive SMS messages from the Ubuntu desktop through the paired phone. Open the KDE Connect app on the desktop and navigate to the SMS section.

### Custom Commands

You can define shell commands on Ubuntu that can be triggered from the phone:

```bash
# Open KDE Connect settings to add custom commands
kdeconnect-app
```

Navigate to your device, then to "Run Commands" plugin. Add entries like:

| Command Name | Command |
|---|---|
| Lock Screen | `xdg-screensaver lock` |
| Suspend | `systemctl suspend` |
| Volume Up | `pactl set-sink-volume @DEFAULT_SINK@ +10%` |
| Volume Down | `pactl set-sink-volume @DEFAULT_SINK@ -10%` |
| Open Browser | `xdg-open https://oneuptime.com` |

These appear on the phone app under "Remote Commands" and execute on the Ubuntu machine when tapped.

## Using KDE Connect from the Command Line

The `kdeconnect-cli` tool handles most operations without needing the GUI:

```bash
# List all paired devices and their IDs
kdeconnect-cli --list-devices

# Check if a specific device is reachable
kdeconnect-cli --device DEVICE_ID --ping

# Send a file to the phone
kdeconnect-cli --device DEVICE_ID --share /home/user/document.pdf

# Send a text notification to the phone
kdeconnect-cli --device DEVICE_ID --send-notification "Hello from Ubuntu"

# Ring the phone (useful if you've lost it)
kdeconnect-cli --device DEVICE_ID --ring

# Lock the phone screen
kdeconnect-cli --device DEVICE_ID --lock

# List available commands defined on the remote device
kdeconnect-cli --device DEVICE_ID --list-commands

# Execute a specific remote command
kdeconnect-cli --device DEVICE_ID --execute-command COMMAND_ID
```

## Accessing Phone Files Over SFTP

The "SFTP" plugin lets you browse the phone's storage as a mounted filesystem:

```bash
# Mount the phone filesystem (usually auto-mounts when plugin is enabled)
# Files appear at ~/.local/share/kdeconnect/DEVICE_ID/

# Or mount manually via the GUI using Files/Nautilus
```

In Nautilus, the phone appears under "Network" in the sidebar when mounted.

## Autostart KDE Connect

KDE Connect typically adds itself to the autostart entries. Verify it is configured to start at login:

```bash
# Check if kdeconnectd is in autostart
ls ~/.config/autostart/ | grep kde

# Manually create an autostart entry if missing
cat > ~/.config/autostart/kdeconnect.desktop <<EOF
[Desktop Entry]
Exec=/usr/lib/kdeconnect/kdeconnectd
Icon=kdeconnect
Name=KDE Connect Daemon
Type=Application
X-KDE-autostart-after=panel
EOF
```

## Troubleshooting

**Phone not appearing in device list**: Check that both devices are on the same Wi-Fi subnet. Guest Wi-Fi networks often isolate clients from each other. Also verify the firewall rules are applied.

**Pairing fails**: Restart the KDE Connect daemon on Ubuntu: `pkill kdeconnectd && /usr/lib/kdeconnect/kdeconnectd &`. Then retry pairing from the phone.

**Notifications not syncing**: The notification plugin requires notification permissions on Android. Go to Android Settings > Apps > KDE Connect > Permissions and enable "Notification access."

**File transfers failing**: Check disk space on the receiving device. Also confirm the "Share and Receive" plugin is enabled in settings on both sides.

**Connection drops when screen locks**: Some Android power management settings kill background connections. Disable battery optimization for KDE Connect in Android Settings > Battery > Battery Optimization.

KDE Connect turns phone-to-desktop integration into something genuinely useful. The combination of notification mirroring, file transfer, and remote control makes it worth setting up even if you only use a few of the features regularly.
