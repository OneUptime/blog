# How to Enable Wayland on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Wayland, Display Server, GNOME, Tutorial

Description: Complete guide to enabling and using Wayland display server on Ubuntu.

---

Wayland represents the modern approach to display servers on Linux, offering improved security, better performance, and smoother graphics compared to the aging X11 protocol. This comprehensive guide will walk you through enabling Wayland on Ubuntu, understanding its benefits, and handling common compatibility scenarios.

## Understanding Wayland vs X11

Before diving into the technical steps, it's important to understand what sets Wayland apart from X11.

### What is X11?

X11 (X Window System) has been the standard display server protocol on Linux for over 30 years. While remarkably stable, it carries significant technical debt:

- **Security concerns**: Any application can capture keystrokes and screen content from other windows
- **Network transparency overhead**: Features designed for network display add complexity even for local use
- **Synchronization issues**: Screen tearing and frame timing problems are common
- **Complex architecture**: The X server handles too many responsibilities

### What is Wayland?

Wayland is a modern display server protocol designed to address X11's limitations:

- **Improved security**: Applications are isolated and cannot spy on each other
- **Better performance**: Direct rendering without the X server middleman
- **Smoother graphics**: Native support for atomic modesetting and proper vsync
- **Simpler architecture**: The compositor is the display server

```bash
# Quick comparison of display server architectures
#
# X11 Architecture:
# Application -> X Server -> Compositor -> Display
#
# Wayland Architecture:
# Application -> Compositor/Display Server -> Display
#
# The simplified Wayland architecture reduces latency and complexity
```

## Checking Your Current Display Server

Before making changes, verify which display server you're currently using.

### Method 1: Using the XDG_SESSION_TYPE Variable

```bash
# Check the current display server
# This environment variable tells you whether you're running Wayland or X11
echo $XDG_SESSION_TYPE

# Expected output:
# "wayland" - You're already using Wayland
# "x11" - You're using X11
```

### Method 2: Using loginctl

```bash
# Get detailed session information including display server type
# The 'loginctl' command provides comprehensive session details
loginctl show-session $(loginctl | grep $(whoami) | awk '{print $1}') -p Type

# Example output:
# Type=wayland
# or
# Type=x11
```

### Method 3: Check from GNOME Settings

```bash
# Open GNOME Settings and navigate to About section
# The windowing system will be listed in system details
gnome-control-center info-overview

# Or check programmatically using gsettings
# This shows if GNOME is configured to prefer Wayland
gsettings get org.gnome.mutter experimental-features
```

### Method 4: Using GDM Configuration Check

```bash
# Check if Wayland is enabled in GDM (GNOME Display Manager)
# This file controls whether Wayland is offered as a login option
cat /etc/gdm3/custom.conf | grep -i wayland

# If you see "WaylandEnable=false", Wayland is disabled
# If the line is commented out or set to true, Wayland is enabled
```

## Enabling Wayland in GDM

GDM (GNOME Display Manager) controls whether Wayland sessions are available at login.

### Step 1: Edit the GDM Configuration File

```bash
# Open the GDM configuration file for editing
# This file controls display manager behavior including Wayland availability
sudo nano /etc/gdm3/custom.conf

# You can also use vim or any other text editor
sudo vim /etc/gdm3/custom.conf
```

### Step 2: Modify the Configuration

```ini
# /etc/gdm3/custom.conf
# GDM Configuration File
#
# [daemon] section controls the display manager daemon settings
# WaylandEnable controls whether Wayland sessions are available

[daemon]
# Set to true to enable Wayland sessions at login
# Set to false to force X11 only
# Comment out or remove to use system defaults (usually Wayland enabled)
WaylandEnable=true

# AutomaticLoginEnable allows passwordless login (optional)
# AutomaticLoginEnable=false

# AutomaticLogin specifies which user to auto-login (optional)
# AutomaticLogin=username

[security]
# Security-related settings go here

[xdmcp]
# XDMCP settings for remote X sessions (rarely needed)

[chooser]
# Chooser settings for XDMCP host selection
```

### Step 3: Apply Changes

```bash
# Restart GDM to apply the configuration changes
# WARNING: This will log you out of your current session
# Save all work before running this command
sudo systemctl restart gdm3

# Alternatively, reboot the system for a clean start
sudo reboot
```

### Step 4: Select Wayland at Login

After restarting:

1. At the login screen, click on your username
2. Before entering your password, look for a gear icon in the bottom-right corner
3. Click the gear icon to see available sessions
4. Select "Ubuntu" or "GNOME" for Wayland, or "Ubuntu on Xorg" for X11
5. Enter your password and log in

```bash
# After logging in, verify you're using Wayland
echo $XDG_SESSION_TYPE
# Should output: wayland
```

## NVIDIA Driver Considerations

NVIDIA graphics cards require special attention for Wayland support.

### Check Your NVIDIA Driver Version

```bash
# Display current NVIDIA driver information
# Wayland support requires driver version 470 or newer
nvidia-smi

# Check the specific driver version
cat /proc/driver/nvidia/version

# Or use the nvidia-settings tool
nvidia-settings -q NvidiaDriverVersion
```

### Enable NVIDIA DRM Kernel Mode Setting

For Wayland to work with NVIDIA, you must enable kernel mode setting (KMS):

```bash
# Step 1: Edit the GRUB configuration
# Add nvidia-drm.modeset=1 to enable KMS
sudo nano /etc/default/grub

# Find the line starting with GRUB_CMDLINE_LINUX_DEFAULT
# Add nvidia-drm.modeset=1 to the existing parameters
# Example (your existing parameters may vary):
# GRUB_CMDLINE_LINUX_DEFAULT="quiet splash nvidia-drm.modeset=1"
```

```bash
# /etc/default/grub
# GRUB bootloader configuration
#
# GRUB_CMDLINE_LINUX_DEFAULT contains kernel parameters for normal boot
# nvidia-drm.modeset=1 enables NVIDIA DRM kernel mode setting
# This is required for Wayland to work with NVIDIA drivers

GRUB_DEFAULT=0
GRUB_TIMEOUT_STYLE=hidden
GRUB_TIMEOUT=0
GRUB_DISTRIBUTOR=`lsb_release -i -s 2> /dev/null || echo Debian`
# Add nvidia-drm.modeset=1 at the end of this line
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash nvidia-drm.modeset=1"
GRUB_CMDLINE_LINUX=""
```

```bash
# Step 2: Update GRUB configuration
# This regenerates the GRUB boot menu with new parameters
sudo update-grub

# Step 3: Load NVIDIA modules early in boot process
# Edit the initramfs modules configuration
sudo nano /etc/initramfs-tools/modules
```

```bash
# /etc/initramfs-tools/modules
# Modules listed here are loaded early during boot
# Adding NVIDIA modules ensures proper initialization for Wayland
#
# nvidia - Main NVIDIA kernel module
# nvidia_modeset - Mode setting support (required for Wayland)
# nvidia_uvm - Unified Virtual Memory (for CUDA applications)
# nvidia_drm - Direct Rendering Manager (required for Wayland)

nvidia
nvidia_modeset
nvidia_uvm
nvidia_drm
```

```bash
# Step 4: Regenerate initramfs with the new module configuration
sudo update-initramfs -u

# Step 5: Reboot to apply all changes
sudo reboot
```

### Verify NVIDIA KMS is Active

```bash
# After reboot, verify KMS is enabled
# The output should show "Y" for modeset
cat /sys/module/nvidia_drm/parameters/modeset

# Expected output: Y
# If you see N, KMS is not properly enabled
```

### GDM NVIDIA Override (if needed)

Sometimes GDM disables Wayland when it detects NVIDIA. To override:

```bash
# Check if there's an NVIDIA-specific GDM rule
cat /usr/lib/udev/rules.d/61-gdm.rules

# Create an override to force-enable Wayland with NVIDIA
sudo nano /etc/udev/rules.d/61-gdm.rules
```

```bash
# /etc/udev/rules.d/61-gdm.rules
# This override file allows Wayland with NVIDIA drivers
# Place in /etc/udev/rules.d/ to override system defaults
#
# Comment out or remove the NVIDIA-specific rules that disable Wayland
# The original file in /usr/lib/udev/rules.d/61-gdm.rules may contain:
# DRIVER=="nvidia", RUN+="/usr/lib/gdm-runtime-config set daemon PreferredDisplayServer xorg"
#
# By creating an empty override file or removing these rules,
# we allow Wayland to work with NVIDIA drivers

# This file intentionally left mostly empty to override default NVIDIA rules
# Wayland will now be available with NVIDIA graphics
```

## Running X11 Apps Under Wayland (XWayland)

XWayland provides compatibility for applications that haven't been updated to support Wayland natively.

### Understanding XWayland

```bash
# XWayland is automatically started when needed
# It provides an X11 compatibility layer within Wayland sessions
#
# Check if XWayland is running
pgrep -a Xwayland

# Example output:
# 1234 /usr/bin/Xwayland :0 -rootless -noreset -accessx -core -auth /run/user/1000/.mutter-Xwaylandauth.XXXXXX

# The :0 indicates the X display number
# -rootless means it runs without a root window (integrated with Wayland)
```

### Identifying XWayland vs Native Wayland Apps

```bash
# Use xlsclients to list X11 (XWayland) applications
# Native Wayland apps won't appear in this list
xlsclients

# Example output shows XWayland applications:
# hostname  firefox
# hostname  code

# Use xprop to check if a specific window is running through XWayland
# Click on a window after running this command
xprop | grep -i wayland

# For native Wayland apps, you can use wlr-randr or similar tools
# Install wlr-randr for Wayland display information
sudo apt install wlr-randr
```

### Forcing X11 Mode for Specific Applications

Some applications work better with X11. You can force them to use XWayland:

```bash
# Method 1: Set environment variable for a single application
# GDK_BACKEND=x11 forces GTK apps to use X11
GDK_BACKEND=x11 firefox

# Method 2: For Qt applications, use QT_QPA_PLATFORM
QT_QPA_PLATFORM=xcb obs-studio

# Method 3: For Electron apps, use specific flags
# --ozone-platform-hint=x11 forces X11 mode
code --ozone-platform-hint=x11
```

### Creating Desktop Entries for X11 Mode

```bash
# Create a custom desktop entry that launches an app in X11 mode
# This example creates an X11 version of Firefox
sudo nano /usr/share/applications/firefox-x11.desktop
```

```ini
# /usr/share/applications/firefox-x11.desktop
# Custom desktop entry to launch Firefox in X11/XWayland mode
#
# This is useful when an application has issues with native Wayland
# The app will run through XWayland for X11 compatibility

[Desktop Entry]
Version=1.0
Name=Firefox (X11)
Comment=Browse the Web using X11 compatibility mode
# Exec line includes GDK_BACKEND=x11 to force X11 mode
Exec=env GDK_BACKEND=x11 /usr/bin/firefox %u
Icon=firefox
Terminal=false
Type=Application
Categories=Network;WebBrowser;
MimeType=text/html;text/xml;application/xhtml+xml;
StartupNotify=true
# Add to actions for quick access
Actions=new-window;new-private-window;

[Desktop Action new-window]
Name=New Window (X11)
Exec=env GDK_BACKEND=x11 /usr/bin/firefox --new-window %u

[Desktop Action new-private-window]
Name=New Private Window (X11)
Exec=env GDK_BACKEND=x11 /usr/bin/firefox --private-window %u
```

## Application Compatibility

Understanding which applications work natively with Wayland helps you make informed decisions.

### Native Wayland Applications

```bash
# Most modern GTK4 and Qt6 applications support Wayland natively
# Here are common applications and their Wayland status:

# Native Wayland Support (run seamlessly):
# - GNOME apps (Files, Terminal, Text Editor, etc.)
# - Firefox (native since version 98)
# - LibreOffice (native since version 7.x)
# - Chromium/Chrome (with flags)
# - VLC (native support)
# - mpv (native support)

# Check Firefox Wayland mode
# Open about:support in Firefox and look for "Window Protocol"
# Should show "wayland" for native mode

# Enable Wayland for Firefox permanently
echo 'MOZ_ENABLE_WAYLAND=1' | sudo tee -a /etc/environment

# For Chrome/Chromium, enable Wayland with flags
# Create a config file for persistent settings
mkdir -p ~/.config/chromium-flags.conf
echo "--ozone-platform-hint=auto" >> ~/.config/chromium-flags.conf
echo "--enable-features=WaylandWindowDecorations" >> ~/.config/chromium-flags.conf
```

### Applications Requiring XWayland

```bash
# These applications typically require XWayland:
# - Some older IDEs (older Eclipse versions)
# - Wine applications
# - Some games (especially older ones)
# - Legacy professional software

# Check if an application is using XWayland
# Run the application, then use this command:
xdotool search --name "Application Name" getwindowpid

# If xdotool returns a PID, the app is using XWayland
# Native Wayland apps won't be found by xdotool
```

### Electron Applications

```bash
# Modern Electron apps (v12+) support Wayland
# Check Electron version of an app:
code --version  # VS Code
slack --version  # Slack

# Force Wayland mode for Electron apps
# Add to ~/.config/electron-flags.conf or app-specific config
echo "--enable-features=UseOzonePlatform" >> ~/.config/code-flags.conf
echo "--ozone-platform=wayland" >> ~/.config/code-flags.conf

# For system-wide Electron Wayland configuration
sudo nano /etc/environment
# Add: ELECTRON_OZONE_PLATFORM_HINT=auto
```

## Screen Sharing and Recording

Screen sharing and recording work differently under Wayland due to its security model.

### Understanding the PipeWire Solution

```bash
# Wayland's security model prevents direct screen capture
# PipeWire provides a secure portal-based solution
#
# Install required packages for screen sharing
sudo apt install pipewire pipewire-pulse xdg-desktop-portal-gnome

# Verify PipeWire is running
systemctl --user status pipewire
systemctl --user status pipewire-pulse

# Check xdg-desktop-portal is active
systemctl --user status xdg-desktop-portal
```

### Enable Screen Sharing in Applications

```bash
# Firefox screen sharing (works out of the box with portals)
# Go to any video conferencing site and test screen sharing
# You'll see a portal dialog asking which screen/window to share

# For OBS Studio, install the Wayland-compatible version
sudo apt install obs-studio

# Configure OBS for Wayland screen capture
# In OBS:
# 1. Add Source -> Screen Capture (PipeWire)
# 2. Select the screen or window from the portal dialog

# For command-line screen recording, use wf-recorder
sudo apt install wf-recorder

# Record entire screen
wf-recorder -o "$(wlr-randr | grep -w 'Enabled' | head -1 | cut -d' ' -f1)" -f recording.mp4

# Record a specific region
wf-recorder -g "$(slurp)" -f recording.mp4

# The 'slurp' tool lets you select a region graphically
sudo apt install slurp
```

### Screenshot Tools for Wayland

```bash
# gnome-screenshot works natively with Wayland on GNOME
gnome-screenshot  # Interactive mode
gnome-screenshot -f ~/screenshot.png  # Save to file
gnome-screenshot -a  # Select area

# grim is a lightweight Wayland screenshot tool
sudo apt install grim

# Capture entire screen
grim screenshot.png

# Capture specific region using slurp
grim -g "$(slurp)" selection.png

# Capture specific window (requires wlrctl or similar)
# Note: Window selection may vary by compositor
```

## Remote Desktop on Wayland

Remote desktop functionality requires special consideration under Wayland.

### GNOME Remote Desktop

```bash
# GNOME's built-in remote desktop uses RDP protocol
# Enable it through Settings > Sharing > Remote Desktop

# Or configure via command line
# Check current remote desktop status
gsettings get org.gnome.desktop.remote-desktop.rdp enable

# Enable RDP remote desktop
gsettings set org.gnome.desktop.remote-desktop.rdp enable true

# Set authentication credentials
# This creates credentials for remote access
gnome-control-center sharing

# The RDP server runs on port 3389 by default
# Verify it's listening
ss -tlnp | grep 3389
```

### VNC Alternatives

```bash
# Traditional VNC doesn't work directly with Wayland
# Use wayvnc for Wayland-native VNC
sudo apt install wayvnc

# Start wayvnc server (basic usage)
# Note: wayvnc works best with wlroots-based compositors
# For GNOME, use the built-in RDP instead
wayvnc 0.0.0.0 5900

# For headless Wayland servers, consider:
# - headless-gl for rendering
# - Virtual displays through mutter
```

### SSH X Forwarding Alternatives

```bash
# X forwarding (ssh -X) doesn't work with native Wayland apps
# Alternatives for remote graphical access:

# Option 1: Use waypipe for Wayland forwarding
sudo apt install waypipe

# Connect with waypipe
waypipe ssh user@remote-host gnome-terminal

# Option 2: Force applications to use X11 on remote
ssh -X user@remote-host "GDK_BACKEND=x11 firefox"

# Option 3: Use RDP or VNC for full desktop access
# See GNOME Remote Desktop section above
```

## Known Limitations

Understanding Wayland's current limitations helps set realistic expectations.

### Application-Specific Issues

```bash
# Known limitations and their status:
#
# 1. Global keyboard shortcuts (some apps)
#    - Wayland security prevents global hotkey capture
#    - Solution: Use GNOME's built-in shortcut settings
#    gsettings set org.gnome.settings-daemon.plugins.media-keys custom-keybindings "['/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/custom0/']"
#
# 2. Window positioning
#    - Apps cannot position their own windows
#    - This is a security feature, not a bug
#
# 3. Cursor themes in some XWayland apps
#    - May show default cursor instead of themed
#    - Usually resolves with app updates
```

### Screen Recording Software

```bash
# Traditional screen recording methods don't work
# These tools are NOT compatible with native Wayland:
# - SimpleScreenRecorder (X11 only)
# - ffmpeg x11grab (X11 only)
# - xdotool (limited functionality)

# Use these Wayland-compatible alternatives:
# - OBS Studio with PipeWire
# - wf-recorder
# - GNOME's built-in screen recorder (Ctrl+Shift+Alt+R)

# GNOME screen recording
# Start recording (30-second default limit)
# Press Ctrl+Shift+Alt+R to start/stop
# Recording saved to ~/Videos/

# To remove the 30-second limit:
gsettings set org.gnome.settings-daemon.plugins.media-keys max-screencast-length 0
```

### Multi-Monitor Issues

```bash
# Some multi-monitor scenarios may have issues:
#
# Check current monitor configuration
gnome-randr  # Or use Settings > Displays

# For mixed DPI setups (fractional scaling)
gsettings get org.gnome.mutter experimental-features
# Enable fractional scaling if needed:
gsettings set org.gnome.mutter experimental-features "['scale-monitor-framebuffer']"

# Monitor hot-plugging generally works well
# If issues occur, try:
# 1. Log out and back in
# 2. Reset display configuration
gsettings reset org.gnome.desktop.interface scaling-factor
```

### Gaming Considerations

```bash
# Gaming on Wayland - current status:
#
# Works well:
# - Native Linux games with Wayland support
# - Proton/Wine games (through XWayland)
# - Most Steam games
#
# Potential issues:
# - Games that rely on cursor capture
# - Some anti-cheat software
# - Games using specific X11 features

# For Steam games, Wayland is used automatically when available
# To force X11 for specific games, add launch option:
# GDK_BACKEND=x11 %command%

# For better gaming performance, ensure:
# 1. Latest GPU drivers installed
# 2. GameMode enabled (if using)
sudo apt install gamemode
# Add to game launch: gamemoderun %command%
```

## Switching Back to X11

If you need to return to X11 temporarily or permanently.

### Temporary Switch (Per Session)

```bash
# At the login screen (GDM):
# 1. Click your username
# 2. Click the gear icon (bottom-right)
# 3. Select "Ubuntu on Xorg" or "GNOME on Xorg"
# 4. Enter password and log in

# This change only affects the current session
# Next login will default to your usual choice
```

### Permanent Switch to X11

```bash
# To make X11 the default (disable Wayland):
sudo nano /etc/gdm3/custom.conf
```

```ini
# /etc/gdm3/custom.conf
# Configuration to disable Wayland and use X11 only
#
# Setting WaylandEnable=false forces X11 sessions
# This is useful if you encounter persistent Wayland issues

[daemon]
# Set to false to disable Wayland sessions entirely
# Users will only see X11/Xorg session options at login
WaylandEnable=false

# DefaultSession can force a specific session type
# Uncomment the next line to make Ubuntu on Xorg the default
# DefaultSession=ubuntu-xorg.desktop
```

```bash
# Apply the changes
sudo systemctl restart gdm3

# Or reboot for a clean start
sudo reboot

# Verify you're now on X11
echo $XDG_SESSION_TYPE
# Should output: x11
```

### Quick Toggle Script

```bash
# Create a script to toggle between Wayland and X11
sudo nano /usr/local/bin/toggle-wayland
```

```bash
#!/bin/bash
# /usr/local/bin/toggle-wayland
# Script to toggle Wayland on/off in GDM configuration
#
# Usage: sudo toggle-wayland
# This script modifies GDM settings and requires root privileges

CONFIG_FILE="/etc/gdm3/custom.conf"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root: sudo toggle-wayland"
    exit 1
fi

# Check current Wayland status
if grep -q "^WaylandEnable=false" "$CONFIG_FILE" 2>/dev/null; then
    # Wayland is disabled, enable it
    sed -i 's/^WaylandEnable=false/WaylandEnable=true/' "$CONFIG_FILE"
    echo "Wayland ENABLED"
    echo "Restart GDM or reboot to apply: sudo systemctl restart gdm3"
elif grep -q "^WaylandEnable=true" "$CONFIG_FILE" 2>/dev/null; then
    # Wayland is enabled, disable it
    sed -i 's/^WaylandEnable=true/WaylandEnable=false/' "$CONFIG_FILE"
    echo "Wayland DISABLED (X11 mode)"
    echo "Restart GDM or reboot to apply: sudo systemctl restart gdm3"
else
    # No explicit setting, add one to disable
    sed -i '/^\[daemon\]/a WaylandEnable=false' "$CONFIG_FILE"
    echo "Wayland DISABLED (X11 mode)"
    echo "Restart GDM or reboot to apply: sudo systemctl restart gdm3"
fi
```

```bash
# Make the script executable
sudo chmod +x /usr/local/bin/toggle-wayland

# Usage
sudo toggle-wayland
```

## Troubleshooting

Common issues and their solutions.

### Wayland Session Not Available at Login

```bash
# Issue: Only X11/Xorg options appear at login screen

# Solution 1: Check GDM configuration
cat /etc/gdm3/custom.conf | grep -i wayland
# If WaylandEnable=false, edit and set to true

# Solution 2: Check for NVIDIA blocking rules
cat /usr/lib/udev/rules.d/61-gdm.rules
# Look for rules that disable Wayland for NVIDIA

# Solution 3: Verify Wayland session files exist
ls -la /usr/share/wayland-sessions/
# Should contain ubuntu.desktop and/or gnome.desktop

# Solution 4: Check system logs for errors
journalctl -b | grep -i wayland
journalctl -b | grep -i gdm
```

### Black Screen After Selecting Wayland

```bash
# Issue: Screen goes black after selecting Wayland session

# Solution 1: Boot into recovery mode and check logs
# At GRUB menu, select "Advanced options" -> "Recovery mode"
journalctl -b -1 | grep -E "(wayland|mutter|gnome-shell)"

# Solution 2: For NVIDIA, verify KMS is enabled
cat /sys/module/nvidia_drm/parameters/modeset
# Should be "Y"

# Solution 3: Try resetting GNOME settings
# Boot into X11 session first
dconf reset -f /org/gnome/

# Solution 4: Check GPU driver compatibility
ubuntu-drivers devices
# Install recommended drivers
sudo ubuntu-drivers autoinstall
```

### Application Crashes Under Wayland

```bash
# Issue: Specific application crashes when using Wayland

# Solution 1: Run in X11 compatibility mode
GDK_BACKEND=x11 problematic-app

# Solution 2: Check for Wayland-specific environment variables
env | grep -i wayland
# Try unsetting problematic variables
unset WAYLAND_DISPLAY && problematic-app

# Solution 3: Check application logs
journalctl --user -f &
problematic-app
# Watch for error messages

# Solution 4: Run with debug output
GDK_DEBUG=all problematic-app 2>&1 | tee app-debug.log
```

### Screen Sharing Not Working

```bash
# Issue: Screen sharing fails in video calls or applications

# Solution 1: Ensure PipeWire and portals are running
systemctl --user status pipewire
systemctl --user status xdg-desktop-portal
systemctl --user status xdg-desktop-portal-gnome

# If not running, start them:
systemctl --user start pipewire
systemctl --user start xdg-desktop-portal-gnome

# Solution 2: Restart portal services
systemctl --user restart xdg-desktop-portal
systemctl --user restart xdg-desktop-portal-gnome

# Solution 3: Verify Firefox/Chrome portal support
# In Firefox, check about:config
# Set media.peerconnection.enabled = true
# Set media.navigator.mediadatadecoder_vpx_enabled = true

# Solution 4: Install missing portal components
sudo apt install --reinstall xdg-desktop-portal-gnome pipewire
```

### Input Issues (Keyboard/Mouse)

```bash
# Issue: Keyboard shortcuts, special keys, or mouse not working properly

# Solution 1: Check input method settings
gsettings get org.gnome.desktop.input-sources sources

# Solution 2: Reset input configuration
gsettings reset org.gnome.desktop.peripherals.keyboard repeat
gsettings reset org.gnome.desktop.peripherals.mouse speed

# Solution 3: For gaming mouse/keyboard, check permissions
ls -la /dev/input/event*
# Add user to input group if needed
sudo usermod -aG input $USER

# Solution 4: Check for conflicting input drivers
cat /var/log/Xorg.0.log | grep -i input
```

### Debugging Wayland Issues

```bash
# Enable Wayland debugging
# Run GNOME Shell with debug output
WAYLAND_DEBUG=1 gnome-shell --wayland 2>&1 | tee wayland-debug.log

# Check mutter (GNOME's compositor) logs
journalctl --user -u org.gnome.Shell -f

# Monitor Wayland protocol messages
# Install wlr-protocols for additional tools
sudo apt install wayland-utils

# Use wayland-info to check compositor capabilities
wayland-info | head -50

# For detailed system information
sudo apt install inxi
inxi -Gxx  # Graphics information
inxi -Sxx  # System information
```

### Creating a System Information Report

```bash
#!/bin/bash
# /usr/local/bin/wayland-report
# Generate a diagnostic report for Wayland issues
#
# Usage: wayland-report > ~/wayland-report.txt
# Share this report when seeking help with Wayland issues

echo "=== Wayland Diagnostic Report ==="
echo "Generated: $(date)"
echo ""

echo "=== Display Server ==="
echo "XDG_SESSION_TYPE: $XDG_SESSION_TYPE"
echo "WAYLAND_DISPLAY: $WAYLAND_DISPLAY"
echo ""

echo "=== System Information ==="
lsb_release -a 2>/dev/null
uname -a
echo ""

echo "=== Graphics Hardware ==="
lspci | grep -i vga
echo ""

echo "=== Graphics Driver ==="
if command -v nvidia-smi &> /dev/null; then
    nvidia-smi --query-gpu=driver_version,name --format=csv
fi
glxinfo | grep "OpenGL renderer" 2>/dev/null
echo ""

echo "=== GDM Configuration ==="
cat /etc/gdm3/custom.conf 2>/dev/null
echo ""

echo "=== Running Wayland Processes ==="
pgrep -a -i wayland
pgrep -a Xwayland
echo ""

echo "=== Portal Services ==="
systemctl --user status xdg-desktop-portal --no-pager
systemctl --user status pipewire --no-pager
echo ""

echo "=== Recent Wayland Errors ==="
journalctl -b --no-pager | grep -i "wayland\|mutter\|gnome-shell" | tail -20
echo ""

echo "=== End of Report ==="
```

## Summary

Enabling Wayland on Ubuntu provides a more secure and modern display server experience. Here's a quick reference:

| Task | Command/Action |
|------|----------------|
| Check current server | `echo $XDG_SESSION_TYPE` |
| Enable Wayland | Edit `/etc/gdm3/custom.conf`, set `WaylandEnable=true` |
| NVIDIA KMS | Add `nvidia-drm.modeset=1` to GRUB |
| Force X11 for app | `GDK_BACKEND=x11 app-name` |
| Screen recording | Use OBS with PipeWire or `wf-recorder` |
| Switch to X11 | Select "Ubuntu on Xorg" at login |

Wayland continues to mature rapidly, with more applications gaining native support. While some workflows may require XWayland compatibility, the security and performance benefits make Wayland the future of Linux desktop graphics.

---

**Monitor Your Linux Infrastructure with OneUptime**

Whether you're running Wayland or X11, ensuring your Ubuntu systems and applications remain healthy requires comprehensive monitoring. [OneUptime](https://oneuptime.com) provides enterprise-grade infrastructure monitoring that helps you:

- **Track system performance**: Monitor CPU, memory, disk, and GPU utilization across your Ubuntu workstations and servers
- **Application uptime monitoring**: Ensure critical applications running on your Linux systems stay available
- **Alert management**: Get notified immediately when display server issues, application crashes, or resource exhaustion occur
- **Log management**: Aggregate and search through system logs including Wayland, XWayland, and GDM logs in one place
- **Status pages**: Communicate system status to your team during display server migrations or updates

Start monitoring your Ubuntu infrastructure today with OneUptime's free tier and gain visibility into your entire Linux environment, from display servers to containerized applications.
