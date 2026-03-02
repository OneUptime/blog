# How to Set Up Multi-Monitor Display on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Multi-Monitor, Display, Desktop, Configuration

Description: Complete guide to configuring multi-monitor setups on Ubuntu, including display arrangement, resolution settings, scaling, and command-line configuration.

---

Ubuntu handles multi-monitor setups well in most cases, but getting exactly the right arrangement - correct resolution, proper scaling, correct primary monitor, and persistence across reboots - sometimes requires going beyond the graphical display settings. This guide covers both the GUI approach and the command-line tools needed for complete control.

## Checking Connected Displays

Before configuring, identify what displays are connected and their capabilities:

```bash
# List all connected displays and their modes
xrandr
# Or on Wayland:
gnome-randr 2>/dev/null || xrandr

# More detailed display information
xrandr --verbose | head -100

# Show only connected displays
xrandr | grep " connected"

# Check display names (HDMI-1, DP-1, eDP-1, VGA-1, etc.)
xrandr | grep -E "^[A-Z]"

# For Wayland, use mutter's tool
# mutter --wayland --display-server 2>&1 | head -50
```

Typical display names:
- `eDP-1` or `LVDS-1`: Built-in laptop display
- `HDMI-1`, `HDMI-2`: HDMI outputs
- `DP-1`, `DP-2`: DisplayPort outputs
- `VGA-1`: VGA output

## Configuring Multi-Monitor via GNOME Settings

The easiest approach for GNOME:

1. Open Settings > Displays (or right-click desktop > Display Settings)
2. Drag monitors to arrange them to match physical placement
3. Click on a monitor to configure its resolution and scale
4. Select which monitor is Primary
5. Choose Join Displays, Mirror, or Single Display mode
6. Click Apply

Changes made in GNOME Settings persist through reboots automatically.

## Configuring with xrandr (X11)

xrandr gives complete control over display configuration from the command line:

```bash
# Example setup: laptop + external monitor side by side
# Internal display: eDP-1 at 1920x1080
# External display: HDMI-1 at 2560x1440

# Set up with HDMI-1 to the right of eDP-1
xrandr \
  --output eDP-1 --mode 1920x1080 --rate 60 --pos 0x0 --primary \
  --output HDMI-1 --mode 2560x1440 --rate 60 --pos 1920x0

# Set up with HDMI-1 to the left of eDP-1
xrandr \
  --output HDMI-1 --mode 2560x1440 --rate 60 --pos 0x0 --primary \
  --output eDP-1 --mode 1920x1080 --rate 60 --pos 2560x0

# Stacked vertically (HDMI-1 above eDP-1)
xrandr \
  --output HDMI-1 --mode 2560x1440 --rate 60 --pos 0x0 --primary \
  --output eDP-1 --mode 1920x1080 --rate 60 --pos 0x1440

# Mirror both displays at the same resolution
xrandr \
  --output eDP-1 --mode 1920x1080 \
  --output HDMI-1 --same-as eDP-1 --mode 1920x1080

# Turn off a display
xrandr --output HDMI-1 --off

# Turn on a display with auto-detected settings
xrandr --output HDMI-1 --auto
```

## Setting Display Rotation

```bash
# Rotate a display (useful for portrait monitors)
# Normal, left, right, inverted
xrandr --output HDMI-1 --rotate left

# Rotate the built-in display right
xrandr --output eDP-1 --rotate right

# Reset to normal rotation
xrandr --output HDMI-1 --rotate normal
```

## Adding Custom Resolutions

If your desired resolution is not available:

```bash
# Generate modeline for 2560x1440 at 60Hz
cvt 2560 1440 60

# Output example:
# # 2560x1440 59.96 Hz (CVT 3.69M9) hsync: 89.52 kHz; pclk: 312.25 MHz
# Modeline "2560x1440_60.00"  312.25  2560 2752 3024 3488  1440 1443 1448 1493 -hsync +vsync

# Create a new mode
xrandr --newmode "2560x1440_60.00" 312.25 2560 2752 3024 3488 1440 1443 1448 1493 -hsync +vsync

# Add it to the output
xrandr --addmode HDMI-1 "2560x1440_60.00"

# Set it
xrandr --output HDMI-1 --mode "2560x1440_60.00"
```

## Persisting xrandr Configuration

xrandr settings do not persist across reboots by default. Add them to a startup script:

```bash
# Create an autostart entry for X11 sessions
mkdir -p ~/.config/autostart

tee ~/.config/autostart/monitor-setup.desktop << 'EOF'
[Desktop Entry]
Type=Application
Name=Monitor Setup
Exec=/usr/local/bin/monitor-setup.sh
X-GNOME-Autostart-enabled=true
NoDisplay=true
EOF

# Create the setup script
tee /usr/local/bin/monitor-setup.sh << 'EOF'
#!/bin/bash
# Multi-monitor setup script
sleep 2  # Wait for displays to be detected

# Set up displays
xrandr \
  --output eDP-1 --mode 1920x1080 --rate 60 --pos 0x0 --primary \
  --output HDMI-1 --mode 2560x1440 --rate 60 --pos 1920x0

# If HDMI-1 is not connected, just use the internal display
if ! xrandr | grep "HDMI-1 connected"; then
    xrandr --output eDP-1 --mode 1920x1080 --primary
fi
EOF

chmod +x /usr/local/bin/monitor-setup.sh
```

## Configuring Displays on Wayland

On Wayland, xrandr mostly works through XWayland for X11 apps, but for native Wayland configuration use GNOME tools or mutter:

```bash
# GNOME on Wayland stores display configuration in:
cat ~/.config/monitors.xml

# View current configuration
cat ~/.config/monitors.xml 2>/dev/null | head -50

# Example monitors.xml for two monitors
# This file is managed by GNOME Settings daemon
# Manually editing it is possible but the Settings UI is more reliable

# For scripted Wayland configuration, use gnome-randr if available:
# gnome-randr modify --output HDMI-1 --mode 2560x1440

# Or use dconf to set properties
dconf read /org/gnome/mutter/experimental-features
```

## Per-Monitor Scaling

HiDPI monitors mixed with standard displays require per-monitor scaling:

```bash
# In GNOME Settings > Displays, set scaling per display
# 100% for standard displays, 200% for HiDPI

# For fractional scaling (150%, 125%, etc.) on Wayland
# Enable the experimental feature first
gsettings set org.gnome.mutter experimental-features "['scale-monitor-framebuffer']"

# Then use Settings > Displays to set fractional scale

# For X11 with xrandr, use the scale parameter
# Scale down a 4K display to appear as 2K
xrandr --output DP-1 --scale 2x2 --mode 3840x2160

# Scale up a 1080p display (makes content larger)
xrandr --output eDP-1 --scale 0.75x0.75
```

## Multiple Monitor Window Management

Configure how windows behave across monitors:

```bash
# GNOME: set which monitor gets new windows
# Typically follows the focused monitor

# Configure workspace behavior
# Each monitor can have its own workspaces (separate workspaces)
gsettings set org.gnome.mutter workspaces-only-on-primary false

# Or all monitors share workspaces (default)
gsettings set org.gnome.mutter workspaces-only-on-primary true

# KDE: configure in System Settings > Display and Monitor

# For keyboard shortcut to move window to next monitor
# GNOME uses Super+Shift+Left/Right to move between monitors
```

## Laptop Lid Behavior with External Monitor

```bash
# Configure what happens when you close the laptop lid with an external monitor connected
# Edit the logind configuration
sudo tee -a /etc/systemd/logind.conf << 'EOF'
# When lid is closed while on AC power with external display
HandleLidSwitch=ignore
# When lid is closed while on battery
HandleLidSwitchOnExternalPower=ignore
EOF

sudo systemctl restart systemd-logind
```

## Troubleshooting Multi-Monitor Issues

```bash
# Display not detected
# Check if the cable and display are powered on first
xrandr | grep connected

# Force detect connected displays
xrandr --auto

# Display shows wrong resolution or refresh rate
# Check available modes
xrandr | grep -A 20 "HDMI-1 connected"

# Display flickering - try a lower refresh rate
xrandr --output HDMI-1 --mode 1920x1080 --rate 60

# One monitor goes blank on wake
# Known issue with some hardware - workaround:
xrandr --output HDMI-1 --off
sleep 1
xrandr --output HDMI-1 --auto

# Screen tearing on external display
# Enable vsync for the compositor
# In GNOME: Extensions > Auto Move Windows
# Or check GPU driver settings for vsync

# Check for driver issues with multiple displays
journalctl -b | grep -iE "drm|kms|mode" | tail -50
```

## Using arandr for a GUI xrandr Frontend

arandr provides a graphical frontend for xrandr configuration:

```bash
# Install arandr
sudo apt install -y arandr

# Launch arandr
arandr

# After configuring in the GUI, save the configuration
# arandr saves as a shell script you can add to autostart
```

Multi-monitor setups on Ubuntu have improved considerably with each release. For most modern hardware with GNOME and either Intel or AMD graphics, the GNOME Settings display panel handles everything correctly. The command-line tools become essential for unusual hardware, automated deployment, or cases where the GUI settings do not persist correctly - both of which are common enough that knowing xrandr is a practical skill.
