# How to Configure Touchpad Gestures on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, GNOME, Touchpad, Laptop, Desktop

Description: Configure multi-touch touchpad gestures on Ubuntu for workspace switching, application switching, and custom actions using libinput and GNOME's built-in gesture support.

---

Modern Ubuntu versions include multi-touch gesture support through libinput and GNOME Shell. Three-finger swipes for workspace switching and the Activities Overview are available with minimal configuration on Wayland. For more complex or custom gestures, tools like libinput-gestures extend what is possible.

This guide covers enabling and configuring touchpad gestures on Ubuntu, from GNOME's built-in gestures to custom gesture bindings.

## Built-in GNOME Gestures (Ubuntu 22.04 and Later)

Ubuntu 22.04 (GNOME 42) and later versions include native multi-touch gesture support on the default Wayland session. GNOME on Xorg does not provide the same built-in system gestures:

### Default Gestures

| Gesture | Action |
|---------|--------|
| Three-finger swipe up | Open GNOME Activities Overview |
| Three-finger swipe up again | Open the Applications View |
| Three-finger swipe left/right | Switch between workspaces |
| Two-finger pinch/stretch | Zoom in supported applications |

These work out of the box on most laptops. If they are not working, check the following:

```bash
# Verify libinput is handling your touchpad

libinput list-devices | grep -A 10 "Touchpad"

# Check gesture support
libinput list-devices | grep "Gesture"
```

### Adjusting Touchpad Sensitivity

Open Settings > Mouse & Touchpad to adjust:

- Pointer speed
- Natural scrolling (reverse direction)
- Tap to click
- Two-finger secondary click

For settings not available in the GUI, use gsettings:

```bash
# Check current touchpad settings
gsettings list-recursively org.gnome.desktop.peripherals.touchpad

# Enable tap-to-click
gsettings set org.gnome.desktop.peripherals.touchpad tap-to-click true

# Enable two-finger scrolling
gsettings set org.gnome.desktop.peripherals.touchpad two-finger-scrolling-enabled true

# Disable edge scrolling
gsettings set org.gnome.desktop.peripherals.touchpad edge-scrolling-enabled false

# Enable natural scrolling
gsettings set org.gnome.desktop.peripherals.touchpad natural-scroll true

# Set click method (areas or fingers)
gsettings set org.gnome.desktop.peripherals.touchpad click-method 'fingers'
```

## Installing libinput-gestures for Custom Gestures

For gestures beyond what GNOME provides natively, `libinput-gestures` reads raw touch events and maps them to commands or keyboard shortcuts.

### Installation

```bash
# Install dependencies
sudo apt update
sudo apt install libinput-tools python3 wmctrl xdotool -y

# Add your user to the input group to read touch events without sudo
sudo gpasswd -a $USER input

# Log out and back in for group membership to take effect
# Or activate it in the current session:
newgrp input
```

Install libinput-gestures from source:

```bash
git clone https://github.com/bulletmark/libinput-gestures.git
cd libinput-gestures
sudo ./libinput-gestures-setup install
```

### Basic Configuration

The default configuration is at `/etc/libinput-gestures.conf`. Copy it before customizing:

```bash
mkdir -p ~/.config
cp /etc/libinput-gestures.conf ~/.config/libinput-gestures.conf
nano ~/.config/libinput-gestures.conf
```

A comprehensive example configuration for X11 sessions:

```ini
# ~/.config/libinput-gestures.conf
# Touchpad gesture configuration

# Device to monitor - 'auto' usually works
# If not, specify from: libinput list-devices
device auto

# Gesture sensitivity (higher = less sensitive)
# swipe_threshold 0

# ============================================
# THREE FINGER GESTURES
# ============================================

# Swipe up: Show Activities Overview
gesture swipe up 3 /usr/bin/xdotool key super

# Swipe down: Hide Overview / Show Desktop
gesture swipe down 3 /usr/bin/xdotool key super+d

# Swipe left: Switch to previous workspace
gesture swipe left 3 /usr/bin/xdotool key ctrl+alt+Right

# Swipe right: Switch to next workspace
gesture swipe right 3 /usr/bin/xdotool key ctrl+alt+Left

# ============================================
# FOUR FINGER GESTURES
# ============================================

# Swipe left: Switch to next application (Alt+Tab)
gesture swipe left 4 /usr/bin/xdotool key alt+Tab

# Swipe right: Switch to previous application (Alt+Shift+Tab)
gesture swipe right 4 /usr/bin/xdotool key alt+shift+Tab

# Swipe up: Maximize current window
gesture swipe up 4 /usr/bin/xdotool key super+Up

# Swipe down: Restore/minimize current window
gesture swipe down 4 /usr/bin/xdotool key super+Down

# ============================================
# PINCH GESTURES
# ============================================

# Pinch in: Zoom out (Ctrl+-)
gesture pinch in 2 /usr/bin/xdotool key ctrl+minus

# Pinch out: Zoom in (Ctrl++)
gesture pinch out 2 /usr/bin/xdotool key ctrl+plus
```

On GNOME Wayland, many `xdotool` shortcuts only work with XWayland applications and will not reliably control GNOME Shell itself. Use GNOME's built-in gestures where possible, or use the `_internal` workspace commands documented in `/etc/libinput-gestures.conf` for workspace switching.

### Starting libinput-gestures

```bash
# Start the daemon
libinput-gestures-setup start

# Enable autostart at login
libinput-gestures-setup autostart

# Check status
libinput-gestures-setup status
```

### Testing Gestures

Watch the gesture detection in real time:

```bash
# Debug mode - shows detected gestures as you use the touchpad
libinput-gestures -d
```

## Using Gesture-Based Application Switching with Touchegg

Touchegg is an alternative X11 gesture daemon with a more advanced feature set, including support for GTK and Qt applications. On GNOME, the Touchégg project recommends using its GNOME Shell X11 Gestures extension as well:

```bash
# Add the PPA for Touchegg
sudo add-apt-repository ppa:touchegg/stable
sudo apt update
sudo apt install touchegg -y
```

Enable autostart:

```bash
sudo systemctl enable touchegg
sudo systemctl start touchegg
```

### Touche GUI (Front-end for Touchegg)

Touche provides a graphical interface for configuring Touchegg gestures:

```bash
flatpak install flathub com.github.joseexposito.touche
```

Open Touche from the application menu to configure gestures visually.

### Touchegg Configuration File

The configuration file is at `~/.config/touchegg/touchegg.conf`. Start by copying the default configuration:

```bash
mkdir -p ~/.config/touchegg
cp -n /usr/share/touchegg/touchegg.conf ~/.config/touchegg/touchegg.conf
```

Then edit it as needed:

```xml
<touchégg>
  <settings>
    <property name="animation_delay">150</property>
    <property name="action_execute_threshold">20</property>
  </settings>

  <application name="All">
    <!-- Three finger swipe right: next workspace -->
    <gesture type="SWIPE" fingers="3" direction="RIGHT">
      <action type="CHANGE_DESKTOP">
        <direction>next</direction>
        <animate>true</animate>
      </action>
    </gesture>

    <!-- Three finger swipe left: previous workspace -->
    <gesture type="SWIPE" fingers="3" direction="LEFT">
      <action type="CHANGE_DESKTOP">
        <direction>previous</direction>
        <animate>true</animate>
      </action>
    </gesture>

    <!-- Three finger swipe up: maximize window -->
    <gesture type="SWIPE" fingers="3" direction="UP">
      <action type="MAXIMIZE_RESTORE_WINDOW"></action>
    </gesture>

    <!-- Three finger swipe down: minimize window -->
    <gesture type="SWIPE" fingers="3" direction="DOWN">
      <action type="MINIMIZE_WINDOW"></action>
    </gesture>

    <!-- Four finger pinch: show desktop -->
    <gesture type="PINCH" fingers="4" direction="IN">
      <action type="SHOW_DESKTOP"></action>
    </gesture>
  </application>
</touchégg>
```

## Checking libinput Events Directly

To debug gesture detection at the driver level:

```bash
# Watch all libinput events (requires root or input group membership)
sudo libinput debug-events --show-keycodes 2>&1 | grep -i gesture
```

Move your fingers on the touchpad and watch what libinput detects. If gestures are not being picked up here, the issue is at the driver level rather than in libinput-gestures or GNOME.

## Configuring Workspaces on Multiple Monitors

GNOME 40 and later uses horizontal workspaces by default. To choose whether workspaces are only on the primary display or span all monitors:

```bash
# Check current setting
gsettings get org.gnome.mutter workspaces-only-on-primary

# Set workspaces to span all monitors
gsettings set org.gnome.mutter workspaces-only-on-primary false
```

## Troubleshooting

**Gestures not detected by libinput:**

```bash
# Verify user is in input group
groups $USER | grep input

# Check if touchpad device appears
libinput list-devices | grep -i touch
```

**libinput-gestures not starting:**

```bash
# Check service status
libinput-gestures-setup status

# View logs if using the systemd user service
journalctl --user -u libinput-gestures --since today
```

**Gestures work in debug mode but not in normal use:**

This often means the autostart is not properly configured. Verify the autostart file:

```bash
ls ~/.config/autostart/ | grep gesture
```

## Summary

Ubuntu's built-in touchpad gesture support handles the most common needs - workspace switching and overview access - without any additional software. For custom gesture bindings, libinput-gestures maps raw touch events to keyboard shortcuts or commands with a simple configuration file. Touchegg and Touche provide a more polished experience with GUI configuration and smoother animations. The key to getting custom gesture tools working is ensuring your user is in the `input` group and that the daemon is configured to start at login.
