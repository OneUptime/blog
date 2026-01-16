# How to Configure Multiple Monitors on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Multiple Monitors, Display, Desktop, Tutorial

Description: Complete guide to setting up and managing multiple monitors on Ubuntu.

---

Multiple monitors can dramatically boost your productivity by providing more screen real estate for multitasking, coding, monitoring dashboards, or creative work. Ubuntu offers excellent support for multi-monitor setups through both graphical tools and command-line utilities. This comprehensive guide covers everything you need to know about configuring multiple monitors on Ubuntu.

## Prerequisites

Before diving in, ensure you have:

- Ubuntu 20.04 LTS or later (this guide covers up to Ubuntu 24.04)
- Appropriate graphics drivers installed (proprietary NVIDIA/AMD drivers if applicable)
- Physical monitors connected via HDMI, DisplayPort, DVI, or VGA
- Sufficient GPU ports or adapters for your monitors

## Detecting Connected Monitors

### Using GNOME Settings

The simplest way to detect monitors is through the graphical interface:

1. Open **Settings** from the application menu or by running:

```bash
# Open GNOME Settings directly to the Displays panel
gnome-control-center displays
```

2. Connected monitors should appear automatically. If a monitor isn't detected, click the **Detect Displays** button.

### Using xrandr (Command Line)

For more detailed information, use `xrandr`:

```bash
# List all connected outputs and their supported resolutions
xrandr

# Example output:
# Screen 0: minimum 8 x 8, current 3840 x 1080, maximum 32767 x 32767
# DP-0 connected primary 1920x1080+0+0 (normal left inverted right x axis y axis) 527mm x 296mm
#    1920x1080     60.00*+  59.94    50.00
#    1680x1050     59.95
#    1280x1024     75.02    60.02
# HDMI-0 connected 1920x1080+1920+0 (normal left inverted right x axis y axis) 521mm x 293mm
#    1920x1080     60.00*+  59.94    50.00
# DP-1 disconnected (normal left inverted right x axis y axis)
```

```bash
# List only connected monitors with their names
xrandr --listmonitors

# Example output:
# Monitors: 2
#  0: +*DP-0 1920/527x1080/296+0+0  DP-0
#  1: +HDMI-0 1920/521x1080/293+1920+0  HDMI-0
```

### Checking for Display Issues

```bash
# View detailed EDID information from monitors
# This helps diagnose detection problems
sudo apt install read-edid
sudo get-edid | parse-edid

# Check kernel messages for display-related issues
dmesg | grep -i "drm\|display\|hdmi\|dp\|monitor"

# View Xorg log for display information (X11 only)
cat /var/log/Xorg.0.log | grep -i "monitor\|output\|connected"
```

## GNOME Settings Display Configuration

GNOME's Settings application provides an intuitive interface for multi-monitor configuration.

### Accessing Display Settings

```bash
# Open display settings
gnome-control-center displays

# Alternative: Use the Settings app
# Settings > Displays
```

### Configuration Options Available

In the Displays panel, you can:

1. **Arrange displays**: Drag monitor representations to match physical layout
2. **Set primary display**: Click on a monitor and toggle "Primary Display"
3. **Mirror displays**: Enable to show same content on all screens
4. **Adjust resolution**: Select from available resolutions per monitor
5. **Change refresh rate**: Choose optimal refresh rate for each display
6. **Set orientation**: Rotate displays (landscape, portrait, inverted)
7. **Configure scaling**: Adjust for HiDPI displays

### Applying Changes

After making changes:

1. Click **Apply** to test the configuration
2. A 20-second countdown appears - confirm to keep changes
3. If no confirmation, settings revert automatically (prevents lockouts)

## xrandr Commands for Multi-Monitor Setup

`xrandr` provides powerful command-line control over displays.

### Basic Monitor Configuration

```bash
# Enable a second monitor to the right of the primary
# --auto uses the preferred resolution
xrandr --output HDMI-0 --auto --right-of DP-0

# Enable a monitor to the left of primary
xrandr --output HDMI-0 --auto --left-of DP-0

# Position a monitor above the primary
xrandr --output HDMI-0 --auto --above DP-0

# Position a monitor below the primary
xrandr --output HDMI-0 --auto --below DP-0
```

### Setting Specific Resolutions

```bash
# Set a specific resolution for a monitor
xrandr --output HDMI-0 --mode 1920x1080

# Set resolution with specific refresh rate
xrandr --output HDMI-0 --mode 1920x1080 --rate 60

# Set different resolutions for multiple monitors
xrandr --output DP-0 --mode 2560x1440 --rate 144 \
       --output HDMI-0 --mode 1920x1080 --rate 60 --right-of DP-0
```

### Mirror Displays

```bash
# Mirror HDMI-0 to show the same content as DP-0
xrandr --output HDMI-0 --same-as DP-0

# Mirror with different resolutions (scales automatically)
xrandr --output HDMI-0 --same-as DP-0 --mode 1920x1080
```

### Disable and Enable Monitors

```bash
# Disable a monitor
xrandr --output HDMI-0 --off

# Re-enable a monitor
xrandr --output HDMI-0 --auto

# Disable all monitors except one
xrandr --output DP-0 --auto --output HDMI-0 --off --output DP-1 --off
```

### Rotate Displays

```bash
# Rotate monitor to portrait mode (90 degrees clockwise)
xrandr --output HDMI-0 --rotate right

# Rotate counter-clockwise (270 degrees)
xrandr --output HDMI-0 --rotate left

# Flip upside down (180 degrees)
xrandr --output HDMI-0 --rotate inverted

# Reset to normal orientation
xrandr --output HDMI-0 --rotate normal
```

### Precise Positioning

```bash
# Position monitor at exact coordinates
# Format: --pos WIDTHxHEIGHT (offset from top-left of virtual screen)
xrandr --output HDMI-0 --pos 1920x0

# Complex three-monitor setup example
xrandr --output DP-0 --primary --mode 2560x1440 --pos 1920x0 \
       --output HDMI-0 --mode 1920x1080 --pos 0x180 \
       --output DP-1 --mode 1920x1080 --pos 4480x180 --rotate right
```

## Primary Monitor Selection

The primary monitor is where panels, notifications, and new windows appear by default.

### Setting Primary Monitor with GNOME Settings

1. Open Settings > Displays
2. Click on the desired monitor
3. Toggle **Primary Display** to ON
4. Click Apply

### Setting Primary Monitor with xrandr

```bash
# Set DP-0 as the primary monitor
xrandr --output DP-0 --primary

# Combine with other settings
xrandr --output DP-0 --primary --mode 2560x1440 \
       --output HDMI-0 --mode 1920x1080 --right-of DP-0
```

### Verifying Primary Monitor

```bash
# Check which monitor is primary (marked with *)
xrandr --listmonitors

# Output shows * next to primary:
# Monitors: 2
#  0: +*DP-0 2560/597x1440/336+0+0  DP-0
#  1: +HDMI-0 1920/521x1080/293+2560+0  HDMI-0
```

## Display Arrangement

Proper display arrangement ensures your mouse moves naturally between screens.

### Physical vs Logical Layout

Your logical (software) arrangement should match your physical desk setup:

```bash
# Three monitors in a row: Left | Center (Primary) | Right
xrandr --output HDMI-0 --mode 1920x1080 --pos 0x0 \
       --output DP-0 --primary --mode 2560x1440 --pos 1920x0 \
       --output DP-1 --mode 1920x1080 --pos 4480x0

# Vertical arrangement: Top monitor above bottom monitor
xrandr --output DP-1 --mode 1920x1080 --pos 0x0 \
       --output DP-0 --primary --mode 1920x1080 --pos 0x1080

# L-shaped setup: Main monitor with one above-right
xrandr --output DP-0 --primary --mode 2560x1440 --pos 0x600 \
       --output HDMI-0 --mode 1920x1080 --pos 2560x0
```

### Aligning Monitors of Different Sizes

When monitors have different resolutions, align them for comfortable cursor movement:

```bash
# Align bottoms of monitors with different heights
# 1440p monitor (1440 pixels tall) next to 1080p monitor (1080 pixels tall)
# Offset the smaller monitor by the difference (1440-1080=360)
xrandr --output DP-0 --primary --mode 2560x1440 --pos 0x0 \
       --output HDMI-0 --mode 1920x1080 --pos 2560x360

# Align tops instead
xrandr --output DP-0 --primary --mode 2560x1440 --pos 0x0 \
       --output HDMI-0 --mode 1920x1080 --pos 2560x0

# Center alignment
# Offset = (1440-1080)/2 = 180
xrandr --output DP-0 --primary --mode 2560x1440 --pos 0x0 \
       --output HDMI-0 --mode 1920x1080 --pos 2560x180
```

## Different Resolutions and Refresh Rates

### Listing Available Modes

```bash
# Show all available resolutions and refresh rates
xrandr

# Filter for a specific output
xrandr | grep -A 20 "HDMI-0 connected"
```

### Setting Custom Resolutions

```bash
# Set optimal resolution and refresh rate for gaming monitor
xrandr --output DP-0 --mode 2560x1440 --rate 144

# Set standard resolution for secondary monitor
xrandr --output HDMI-0 --mode 1920x1080 --rate 60

# Use highest available refresh rate
xrandr --output DP-0 --mode 2560x1440 --rate 165
```

### Adding Custom Resolutions

Sometimes you need a resolution not detected automatically:

```bash
# Generate modeline for desired resolution
# cvt WIDTH HEIGHT REFRESH_RATE
cvt 1920 1200 60

# Output example:
# Modeline "1920x1200_60.00"  193.25  1920 2056 2256 2592  1200 1203 1209 1245 -hsync +vsync

# Create new mode
xrandr --newmode "1920x1200_60.00" 193.25 1920 2056 2256 2592 1200 1203 1209 1245 -hsync +vsync

# Add mode to output
xrandr --addmode HDMI-0 "1920x1200_60.00"

# Apply the new mode
xrandr --output HDMI-0 --mode "1920x1200_60.00"
```

### Variable Refresh Rate (FreeSync/G-Sync)

```bash
# Check if VRR is supported (requires compatible GPU and monitor)
cat /sys/class/drm/card*/device/vrr_capable

# Enable VRR for AMDGPU (add to kernel parameters)
# Edit /etc/default/grub:
# GRUB_CMDLINE_LINUX_DEFAULT="amdgpu.freesync_video=1"

# For NVIDIA, enable in nvidia-settings or xorg.conf
```

## Scaling for HiDPI Displays

High-DPI displays require scaling to make UI elements readable.

### GNOME Fractional Scaling

```bash
# Enable fractional scaling (GNOME on Wayland)
gsettings set org.gnome.mutter experimental-features "['scale-monitor-framebuffer']"

# For X11, use a different key
gsettings set org.gnome.mutter experimental-features "['x11-randr-fractional-scaling']"

# After enabling, scaling options (125%, 150%, 175%) appear in Settings > Displays
```

### Integer Scaling with xrandr

```bash
# Scale entire screen by 2x (for 4K on smaller screen)
xrandr --output DP-0 --scale 0.5x0.5

# Scale down (make things smaller)
xrandr --output DP-0 --scale 1.5x1.5

# Reset to normal scaling
xrandr --output DP-0 --scale 1x1
```

### Per-Monitor Scaling with Mixed DPI

```bash
# Setup: 4K primary monitor with 1080p secondary
# Scale the 4K monitor to 2x, adjust secondary position accordingly
xrandr --output DP-0 --primary --mode 3840x2160 --scale 0.5x0.5 --pos 0x0 \
       --output HDMI-0 --mode 1920x1080 --scale 1x1 --pos 1920x0

# Alternative: Use panning for complex scaling scenarios
xrandr --output DP-0 --mode 3840x2160 --panning 3840x2160 --scale 1x1
```

### GTK and Qt Scaling

```bash
# Set GTK scaling factor (affects GTK applications)
export GDK_SCALE=2
export GDK_DPI_SCALE=0.5

# Set Qt scaling factor (affects Qt applications)
export QT_SCALE_FACTOR=2

# Add to ~/.profile for persistence
echo 'export GDK_SCALE=2' >> ~/.profile
echo 'export GDK_DPI_SCALE=0.5' >> ~/.profile
echo 'export QT_SCALE_FACTOR=2' >> ~/.profile
```

## Wayland vs X11 Considerations

Ubuntu supports both Wayland (default since 22.04) and X11 display servers.

### Checking Your Display Server

```bash
# Check current display server
echo $XDG_SESSION_TYPE

# Output: "wayland" or "x11"

# Alternative method
loginctl show-session $(loginctl | grep $(whoami) | awk '{print $1}') -p Type
```

### Wayland Multi-Monitor Features

Wayland offers several advantages for multi-monitor setups:

```bash
# Wayland handles per-monitor scaling natively
# Each monitor can have independent scaling in GNOME Settings

# Check Wayland compositor information
wlr-randr  # For wlroots-based compositors

# GNOME Wayland uses mutter, configure via gsettings
gsettings list-recursively org.gnome.mutter | grep -i display
```

### X11-Specific Configuration

```bash
# X11 uses xrandr for display configuration
# Configuration persists differently than Wayland

# Generate xorg.conf for current settings
sudo nvidia-xconfig  # For NVIDIA
sudo amdconfig --initial  # For AMD (legacy)

# View current X11 configuration
cat /etc/X11/xorg.conf
```

### Switching Between Wayland and X11

```bash
# At login screen (GDM), click the gear icon to select session type

# Or modify GDM configuration to default to X11
sudo nano /etc/gdm3/custom.conf
# Uncomment: WaylandEnable=false

# Force X11 for specific applications (on Wayland)
GDK_BACKEND=x11 application-name
```

### Compatibility Notes

| Feature | Wayland | X11 |
|---------|---------|-----|
| Per-monitor scaling | Native | Limited |
| Screen sharing | Requires portal | Native |
| xrandr | Not available | Full support |
| NVIDIA support | Improved (545+) | Full |
| Remote desktop | PipeWire/RDP | VNC/X forwarding |

## Persistent Configuration

### GNOME Monitors Configuration

GNOME automatically saves display settings:

```bash
# GNOME stores monitor configuration in:
cat ~/.config/monitors.xml

# This file is created/updated when you apply changes in Settings > Displays
# It's automatically loaded on login
```

Example `monitors.xml` structure:

```xml
<monitors version="2">
  <configuration>
    <logicalmonitor>
      <x>0</x>
      <y>0</y>
      <scale>1</scale>
      <primary>yes</primary>
      <monitor>
        <monitorspec>
          <connector>DP-0</connector>
          <vendor>DEL</vendor>
          <product>DELL U2720Q</product>
          <serial>ABC123</serial>
        </monitorspec>
        <mode>
          <width>2560</width>
          <height>1440</height>
          <rate>144.000</rate>
        </mode>
      </monitor>
    </logicalmonitor>
    <logicalmonitor>
      <x>2560</x>
      <y>180</y>
      <scale>1</scale>
      <monitor>
        <monitorspec>
          <connector>HDMI-0</connector>
          <vendor>SAM</vendor>
          <product>S24E510C</product>
          <serial>XYZ789</serial>
        </monitorspec>
        <mode>
          <width>1920</width>
          <height>1080</height>
          <rate>60.000</rate>
        </mode>
      </monitor>
    </logicalmonitor>
  </configuration>
</monitors>
```

### Autostart Script for xrandr

Create a script that runs on login:

```bash
# Create display configuration script
mkdir -p ~/.local/bin
nano ~/.local/bin/setup-displays.sh
```

```bash
#!/bin/bash
# setup-displays.sh - Configure multi-monitor display
# This script sets up a dual-monitor configuration

# Wait for display server to be ready
sleep 2

# Define monitor configuration
PRIMARY="DP-0"
SECONDARY="HDMI-0"

# Check if monitors are connected
if xrandr | grep -q "$PRIMARY connected" && xrandr | grep -q "$SECONDARY connected"; then
    # Both monitors connected - configure dual display
    xrandr --output "$PRIMARY" --primary --mode 2560x1440 --rate 144 --pos 0x0 \
           --output "$SECONDARY" --mode 1920x1080 --rate 60 --pos 2560x180
    echo "Dual monitor configuration applied"
elif xrandr | grep -q "$PRIMARY connected"; then
    # Only primary connected
    xrandr --output "$PRIMARY" --primary --mode 2560x1440 --rate 144 --pos 0x0
    echo "Single monitor (primary) configuration applied"
elif xrandr | grep -q "$SECONDARY connected"; then
    # Only secondary connected
    xrandr --output "$SECONDARY" --primary --mode 1920x1080 --rate 60 --pos 0x0
    echo "Single monitor (secondary) configuration applied"
else
    echo "No configured monitors detected"
fi
```

```bash
# Make script executable
chmod +x ~/.local/bin/setup-displays.sh

# Create autostart entry
mkdir -p ~/.config/autostart
nano ~/.config/autostart/setup-displays.desktop
```

```ini
[Desktop Entry]
Type=Application
Name=Setup Displays
Comment=Configure multi-monitor display
Exec=/home/username/.local/bin/setup-displays.sh
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
X-GNOME-Autostart-Delay=5
```

### Using xorg.conf for X11

For X11, create a persistent Xorg configuration:

```bash
# Create Xorg configuration directory
sudo mkdir -p /etc/X11/xorg.conf.d/

# Create monitor configuration file
sudo nano /etc/X11/xorg.conf.d/10-monitor.conf
```

```
# /etc/X11/xorg.conf.d/10-monitor.conf
# Persistent multi-monitor configuration for X11

Section "Monitor"
    Identifier  "DP-0"
    Option      "Primary" "true"
    Option      "PreferredMode" "2560x1440"
    Option      "Position" "0 0"
EndSection

Section "Monitor"
    Identifier  "HDMI-0"
    Option      "PreferredMode" "1920x1080"
    Option      "Position" "2560 180"
    Option      "RightOf" "DP-0"
EndSection

Section "Screen"
    Identifier "Screen0"
    Monitor    "DP-0"
    DefaultDepth 24
    SubSection "Display"
        Depth   24
        Virtual 4480 1440
    EndSubSection
EndSection
```

### udev Rules for Hotplug

Automatically configure displays when connected:

```bash
# Create udev rule for display hotplug
sudo nano /etc/udev/rules.d/95-monitor-hotplug.rules
```

```
# /etc/udev/rules.d/95-monitor-hotplug.rules
# Trigger display configuration on monitor connect/disconnect

ACTION=="change", SUBSYSTEM=="drm", RUN+="/home/username/.local/bin/setup-displays.sh"
```

```bash
# Reload udev rules
sudo udevadm control --reload-rules
```

## Virtual Monitors

Virtual monitors are useful for screen sharing, remote access, or testing multi-monitor setups.

### Creating Virtual Monitors with xrandr

```bash
# Create a virtual output (requires dummy driver or specific GPU support)
# First, check for available virtual outputs
xrandr --listproviders

# For Intel/AMD with virtual output support
xrandr --setprovideroutputsource modesetting VIRTUAL

# Add a virtual mode
xrandr --newmode "1920x1080_virtual" 173.00 1920 2048 2248 2576 1080 1083 1088 1120 -hsync +vsync
xrandr --addmode VIRTUAL-1 "1920x1080_virtual"
xrandr --output VIRTUAL-1 --mode "1920x1080_virtual" --right-of DP-0
```

### Using xserver-xorg-video-dummy

```bash
# Install dummy video driver
sudo apt install xserver-xorg-video-dummy

# Create configuration for virtual display
sudo nano /etc/X11/xorg.conf.d/20-virtual.conf
```

```
# /etc/X11/xorg.conf.d/20-virtual.conf
# Virtual monitor configuration using dummy driver

Section "Device"
    Identifier "DummyDevice"
    Driver "dummy"
    VideoRam 256000
EndSection

Section "Monitor"
    Identifier "DummyMonitor"
    HorizSync 28.0-80.0
    VertRefresh 48.0-75.0
    Modeline "1920x1080" 172.80 1920 2040 2248 2576 1080 1081 1084 1118
EndSection

Section "Screen"
    Identifier "DummyScreen"
    Device "DummyDevice"
    Monitor "DummyMonitor"
    DefaultDepth 24
    SubSection "Display"
        Depth 24
        Modes "1920x1080"
    EndSubSection
EndSection
```

### Virtual Monitors for Screen Sharing

```bash
# Create a virtual monitor for screen sharing applications
# Useful when you want to share only a specific "screen"

# Using xrandr to create a virtual screen area
xrandr --fb 5760x1080  # Extend framebuffer for virtual space
xrandr --output VIRTUAL1 --mode 1920x1080 --pos 3840x0

# For Wayland, use wl-mirror or OBS virtual camera
# Install OBS for virtual screen capabilities
sudo apt install obs-studio
```

### Headless Virtual Display

For servers or remote access without physical monitors:

```bash
# Create Xvfb (X Virtual Framebuffer)
sudo apt install xvfb

# Start virtual X server
Xvfb :99 -screen 0 1920x1080x24 &
export DISPLAY=:99

# Run applications on virtual display
firefox &

# For VNC access to virtual display
sudo apt install x11vnc
x11vnc -display :99 -forever -shared
```

## Troubleshooting Display Issues

### Monitor Not Detected

```bash
# Check physical connections first, then:

# 1. Check if kernel sees the display
dmesg | grep -i "drm\|hdmi\|dp\|display" | tail -20

# 2. Check xrandr for disconnected outputs
xrandr | grep -i disconnected

# 3. Force display detection
xrandr --auto

# 4. For NVIDIA, check nvidia-smi
nvidia-smi

# 5. Check for EDID issues
sudo apt install edid-decode
sudo cat /sys/class/drm/card0-HDMI-A-1/edid | edid-decode

# 6. Force enable an output that should be connected
xrandr --output HDMI-0 --auto
```

### Wrong Resolution or Refresh Rate

```bash
# 1. Check available modes
xrandr --verbose | grep -A 5 "HDMI-0"

# 2. Verify cable supports desired resolution/refresh
# HDMI 1.4: 4K@30Hz max, HDMI 2.0: 4K@60Hz, HDMI 2.1: 4K@120Hz
# DisplayPort 1.2: 4K@60Hz, DP 1.4: 4K@120Hz

# 3. Add custom resolution if needed
cvt 2560 1440 144
# Use output modeline with xrandr --newmode

# 4. Check for GPU limitations
glxinfo | grep "Max texture size"
```

### Screen Flickering

```bash
# 1. Try different refresh rate
xrandr --output DP-0 --rate 60

# 2. Disable compositor (testing)
# GNOME: Alt+F2, then type 'lg' and run 'Meta.disable_unredirect_for_display(global.display)'

# 3. Check for driver issues
dmesg | grep -i error | grep -i "gpu\|drm\|display"

# 4. For NVIDIA, adjust PowerMizer
nvidia-settings -a "[gpu:0]/GpuPowerMizerMode=1"

# 5. Check cable quality - use certified cables for high refresh rates
```

### Displays in Wrong Order

```bash
# 1. Check current arrangement
xrandr --listmonitors

# 2. Reconfigure positions
# Match physical layout (left monitor should have lower X position)
xrandr --output HDMI-0 --pos 0x0 --output DP-0 --pos 1920x0

# 3. Update GNOME monitors.xml
# Delete and reconfigure in Settings > Displays
rm ~/.config/monitors.xml
gnome-control-center displays
```

### Display Scaling Issues

```bash
# 1. Reset scaling
xrandr --output DP-0 --scale 1x1
gsettings reset org.gnome.desktop.interface scaling-factor

# 2. For blurry text (fractional scaling)
gsettings set org.gnome.mutter experimental-features "['scale-monitor-framebuffer']"

# 3. Per-application scaling issues
# Force X11 backend for problematic apps
GDK_BACKEND=x11 problematic-app

# 4. Check font DPI
gsettings get org.gnome.desktop.interface text-scaling-factor
# Reset if wrong: gsettings reset org.gnome.desktop.interface text-scaling-factor
```

### Black Screen After Configuration

```bash
# If you can't see anything after xrandr changes:

# 1. Wait 15 seconds - GNOME may auto-revert
# 2. Press Ctrl+Alt+F3 to switch to TTY
# 3. Login and reset xrandr
DISPLAY=:0 xrandr --auto

# 4. If still broken, reset GNOME monitors config
rm ~/.config/monitors.xml
sudo systemctl restart gdm3

# 5. For X11, remove custom xorg.conf
sudo rm /etc/X11/xorg.conf
sudo rm /etc/X11/xorg.conf.d/10-monitor.conf
sudo systemctl restart gdm3
```

### NVIDIA-Specific Issues

```bash
# 1. Use nvidia-settings for configuration
nvidia-settings

# 2. Save configuration to xorg.conf
sudo nvidia-settings --save

# 3. Check NVIDIA driver version
nvidia-smi

# 4. For hybrid graphics (laptops), configure PRIME
prime-select query
sudo prime-select nvidia  # or 'intel' or 'on-demand'

# 5. Enable overclocking/custom resolutions
sudo nvidia-xconfig --cool-bits=28
```

### Wayland-Specific Issues

```bash
# 1. Fall back to X11 if Wayland has issues
# Edit /etc/gdm3/custom.conf, set WaylandEnable=false

# 2. Check Wayland logs
journalctl --user -b | grep -i "mutter\|wayland\|gnome-shell"

# 3. For screen sharing issues, ensure xdg-desktop-portal is installed
sudo apt install xdg-desktop-portal-gnome

# 4. Reset mutter/GNOME Shell
dconf reset -f /org/gnome/shell/
dconf reset -f /org/gnome/mutter/
```

### Diagnostic Commands Summary

```bash
# Complete diagnostic script for display issues
#!/bin/bash
echo "=== Display Diagnostics ==="

echo -e "\n--- Display Server ---"
echo $XDG_SESSION_TYPE

echo -e "\n--- Connected Monitors ---"
xrandr --listmonitors

echo -e "\n--- Full xrandr Output ---"
xrandr

echo -e "\n--- GPU Information ---"
lspci | grep -i vga

echo -e "\n--- Driver in Use ---"
lspci -k | grep -A 2 -i vga

echo -e "\n--- Recent Display Errors ---"
dmesg | grep -i "drm\|display\|hdmi\|dp" | tail -10

echo -e "\n--- GNOME Monitor Config ---"
cat ~/.config/monitors.xml 2>/dev/null || echo "No monitors.xml found"

echo -e "\n--- Display Environment Variables ---"
env | grep -i "display\|wayland\|x11\|scale\|dpi"
```

## Complete Multi-Monitor Setup Example

Here's a complete example bringing together all concepts:

```bash
#!/bin/bash
# complete-display-setup.sh
# Comprehensive multi-monitor configuration script
#
# Setup: Three monitors
# - Center: 27" 1440p 144Hz (Primary, for main work)
# - Left: 24" 1080p 60Hz (Portrait, for code/docs)
# - Right: 24" 1080p 60Hz (Landscape, for monitoring/chat)

# Monitor identifiers (adjust based on your xrandr output)
CENTER="DP-0"
LEFT="HDMI-0"
RIGHT="DP-1"

# Function to check if monitor is connected
is_connected() {
    xrandr | grep -q "$1 connected"
}

# Function to configure displays
configure_displays() {
    local cmd="xrandr"

    # Configure center monitor (primary)
    if is_connected "$CENTER"; then
        cmd+=" --output $CENTER --primary --mode 2560x1440 --rate 144 --pos 1080x0 --rotate normal"
        echo "Configured $CENTER as primary (2560x1440@144Hz)"
    fi

    # Configure left monitor (portrait)
    if is_connected "$LEFT"; then
        # Position: Left of center, rotated 90 degrees
        # Y offset: (1440-1080)/2 = 180 pixels to center-align bottoms
        cmd+=" --output $LEFT --mode 1920x1080 --rate 60 --pos 0x0 --rotate left"
        echo "Configured $LEFT in portrait mode (1080x1920@60Hz)"
    fi

    # Configure right monitor (landscape)
    if is_connected "$RIGHT"; then
        # Position: Right of center
        # X offset: 1080 (left portrait width) + 2560 (center width) = 3640
        # Y offset: (1440-1080)/2 = 180 pixels for vertical centering
        cmd+=" --output $RIGHT --mode 1920x1080 --rate 60 --pos 3640x180 --rotate normal"
        echo "Configured $RIGHT as secondary landscape (1920x1080@60Hz)"
    fi

    # Apply configuration
    eval "$cmd"

    if [ $? -eq 0 ]; then
        echo "Display configuration applied successfully"
    else
        echo "Error applying display configuration"
        return 1
    fi
}

# Function to set up scaling for HiDPI
setup_scaling() {
    # Enable fractional scaling if needed
    gsettings set org.gnome.mutter experimental-features "['scale-monitor-framebuffer']"

    # Set text scaling for better readability
    gsettings set org.gnome.desktop.interface text-scaling-factor 1.0
}

# Main execution
echo "Starting display configuration..."
echo "================================="

# Wait for display server
sleep 2

# Apply configuration
configure_displays

# Set up scaling
setup_scaling

echo "================================="
echo "Display setup complete!"
echo ""
echo "Current monitor configuration:"
xrandr --listmonitors
```

## Summary

Configuring multiple monitors on Ubuntu can be accomplished through:

1. **GNOME Settings**: Best for simple configurations with a graphical interface
2. **xrandr**: Powerful command-line tool for complex setups and scripting
3. **Persistent configurations**: Use `~/.config/monitors.xml` (GNOME) or xorg.conf files
4. **Wayland considerations**: Modern systems use Wayland by default with excellent multi-monitor support
5. **Troubleshooting**: Check connections, drivers, and logs systematically

Key commands to remember:

```bash
# Quick reference
xrandr                                    # List displays and modes
xrandr --listmonitors                    # Show active monitors
xrandr --output NAME --auto              # Enable display with defaults
xrandr --output NAME --primary           # Set primary display
xrandr --output NAME --mode WxH          # Set resolution
xrandr --output NAME --rate HZ           # Set refresh rate
xrandr --output NAME --pos XxY           # Set position
xrandr --output NAME --rotate DIRECTION  # Rotate display
xrandr --output NAME --off               # Disable display
gnome-control-center displays            # Open GNOME display settings
```

---

## Monitor Your Infrastructure with OneUptime

While you are setting up multiple monitors to enhance your productivity and keep an eye on your work, do not forget to monitor what truly matters - your infrastructure and applications.

[OneUptime](https://oneuptime.com) is a comprehensive open-source observability platform that helps you monitor your servers, applications, and services. With OneUptime, you can:

- **Uptime Monitoring**: Get instant alerts when your services go down
- **Performance Metrics**: Track response times and system performance
- **Incident Management**: Streamline your incident response workflow
- **Status Pages**: Keep your users informed with beautiful status pages
- **Log Management**: Centralize and analyze logs from all your systems
- **APM**: Monitor application performance with detailed tracing

Just like having multiple monitors gives you visibility into different aspects of your work, OneUptime gives you complete visibility into your entire infrastructure. Start monitoring today and ensure your services are always running smoothly.

Visit [https://oneuptime.com](https://oneuptime.com) to get started with free monitoring for your projects.
