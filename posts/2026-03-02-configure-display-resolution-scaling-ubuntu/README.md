# How to Configure Display Resolution and Scaling on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Display, Resolution, HiDPI, Scaling

Description: Learn how to configure display resolution and scaling on Ubuntu for both standard and HiDPI displays, covering GNOME settings, xrandr, and fractional scaling.

---

Getting display resolution and scaling right is one of the first things to address after installing Ubuntu on new hardware. On standard displays the defaults usually work fine, but HiDPI monitors (4K, Retina displays), older hardware with unusual resolutions, and mixed-DPI multi-monitor setups all require some configuration to look right.

## Checking Current Resolution and Display Information

```bash
# Check current resolution on X11
xrandr | grep '*'  # asterisk marks the current mode

# Full display information
xrandr

# On Wayland, also use:
xrandr  # Works via XWayland

# Check using xdpyinfo
xdpyinfo | grep -E "dimensions|resolution"

# System information including display
inxi -G

# Check display DPI
xdpyinfo | grep resolution
```

## Setting Resolution with xrandr (X11)

```bash
# List available resolutions for a display
xrandr | grep -A 20 "connected"

# Set a specific resolution
xrandr --output HDMI-1 --mode 1920x1080

# Set resolution and refresh rate
xrandr --output HDMI-1 --mode 1920x1080 --rate 60

# Set the highest available resolution automatically
xrandr --output HDMI-1 --auto

# Set resolution for the internal display
xrandr --output eDP-1 --mode 2560x1600 --rate 60

# For a 4K display at native resolution
xrandr --output DP-1 --mode 3840x2160 --rate 60
```

## Configuring Resolution via GNOME Settings

On the graphical desktop:

1. Open Settings > Displays
2. Select the monitor you want to configure
3. Click on the Resolution dropdown
4. Choose your desired resolution
5. Click Apply, then Keep Changes if the display looks correct

The preview timeout is 20 seconds - if you do not click Keep Changes, it reverts to the previous setting (useful safety net when trying a resolution that might not display correctly).

## HiDPI Scaling in GNOME

For 4K/HiDPI displays, text and UI elements appear tiny at native resolution without scaling:

```bash
# Check current scaling factor
gsettings get org.gnome.desktop.interface scaling-factor
gsettings get org.gnome.desktop.interface text-scaling-factor

# Set 2x scaling (recommended for 4K monitors)
gsettings set org.gnome.desktop.interface scaling-factor 2

# Or through GNOME Settings > Displays > Scale
# Options: 100%, 200%
```

### Fractional Scaling on Wayland

GNOME on Wayland supports fractional scaling (150%, 125%, etc.) with an experimental feature:

```bash
# Enable fractional scaling on Wayland
gsettings set org.gnome.mutter experimental-features "['scale-monitor-framebuffer']"

# Now GNOME Settings > Displays will show fractional options
# 100%, 125%, 150%, 175%, 200%, 225%

# Verify the setting is active
gsettings get org.gnome.mutter experimental-features

# Disable fractional scaling if it causes issues
gsettings set org.gnome.mutter experimental-features "[]"
```

### Fractional Scaling on X11

On X11, fractional scaling works differently and can cause blurriness in some applications:

```bash
# X11 fractional scaling via GDM/GNOME
# Note: this uses a different mechanism and may cause some blurriness
gsettings set org.gnome.settings-daemon.plugins.xsettings overrides \
  "{'Gdk/WindowScalingFactor': <2>}"

# For Qt applications (like KDE apps)
export QT_SCALE_FACTOR=1.5
export QT_AUTO_SCREEN_SCALE_FACTOR=0

# For GTK applications
export GDK_SCALE=2
export GDK_DPI_SCALE=0.5

# Set these in ~/.profile for permanent effect
tee -a ~/.profile << 'EOF'
# HiDPI scaling for GTK apps
export GDK_SCALE=2
export GDK_DPI_SCALE=0.5
# HiDPI scaling for Qt apps
export QT_SCALE_FACTOR=2
export QT_AUTO_SCREEN_SCALE_FACTOR=0
EOF
```

## Text Scaling (Without Changing Display Scaling)

If you want larger text without scaling the entire UI:

```bash
# Increase text scale factor (1.0 is default, 1.25 is 25% larger)
gsettings set org.gnome.desktop.interface text-scaling-factor 1.25

# Reset to default
gsettings set org.gnome.desktop.interface text-scaling-factor 1.0

# Via GNOME Tweaks
sudo apt install -y gnome-tweaks
# Fonts > Scaling Factor
```

## xrandr Scaling

xrandr's scale option transforms the output, useful for virtual resolution or working around driver limitations:

```bash
# Scale down a 4K display to appear as 1080p (useful if UI elements are tiny)
# This renders at 4K then scales down - crisp but uses GPU resources
xrandr --output DP-1 --mode 3840x2160 --scale 2x2

# This makes the display render at a virtual 1920x1080
# (scale up - makes everything appear larger but at lower resolution)
xrandr --output HDMI-1 --mode 1920x1080 --scale 0.5x0.5

# Physical size hint for correct DPI calculation
xrandr --output HDMI-1 --mode 1920x1080 \
  --dpi 96 \
  --fbmm 527x296  # Physical monitor size in millimeters
```

## Adding Custom Resolutions

When the desired resolution is not listed:

```bash
# Generate the modeline for 2560x1080 at 60Hz (ultrawide)
cvt 2560 1080 60
# Output:
# Modeline "2560x1080_60.00"  230.00  2560 2720 2992 3424  1080 1083 1093 1120 -hsync +vsync

# Some displays use GTF instead of CVT
gtf 2560 1080 60
# Output:
# Modeline "2560x1080_60.00"  228.96  2560 2736 3016 3472  1080 1081 1084 1118 -hsync +vsync

# Create the new mode
xrandr --newmode "2560x1080_60.00" 230.00 2560 2720 2992 3424 1080 1083 1093 1120 -hsync +vsync

# Add it to your display
xrandr --addmode HDMI-1 "2560x1080_60.00"

# Set it as current mode
xrandr --output HDMI-1 --mode "2560x1080_60.00"
```

To persist custom modes across reboots:

```bash
# Add to X configuration
sudo tee /etc/X11/xorg.conf.d/10-custom-modes.conf << 'EOF'
Section "Monitor"
    Identifier "HDMI-1"
    Modeline "2560x1080_60.00" 230.00 2560 2720 2992 3424 1080 1083 1093 1120 -hsync +vsync
    Option "PreferredMode" "2560x1080_60.00"
EndSection
EOF
```

## Scaling for Specific Applications

Different applications may need different scaling approaches:

```bash
# Electron applications (VS Code, Slack, etc.)
# Force device pixel ratio
code --force-device-scale-factor=1.5

# For permanent VS Code scaling, add to argv.json:
tee -a ~/.config/code/argv.json << 'EOF'
{
  "force-device-scale-factor": 1.5
}
EOF

# Firefox HiDPI
# In about:config, set:
# layout.css.devPixelsPerPx = 1.5

# Or set via environment variable
MOZ_USE_XINPUT2=1 firefox &

# Java applications (Swing/AWT)
java -Dsun.java2d.uiScale=2 -jar application.jar

# Chromium/Chrome
chromium --force-device-scale-factor=1.5
```

## Configuring KDE Plasma Scaling

For KDE Plasma desktop:

```bash
# Via GUI: System Settings > Display and Monitor > Display Configuration > Scale

# Via command line (KDE)
kscreen-doctor output.HDMI-1.scale.1.5

# Set per-display scaling
# System Settings > Display and Monitor > Global Scale

# For HiDPI:
# System Settings > Display and Monitor > Global Scale: 150% or 200%
```

## Persisting Resolution and Scaling Settings

### GNOME Settings (Automatic Persistence)

GNOME automatically saves display configuration to `~/.config/monitors.xml` and reapplies it at login.

### xrandr Settings (Manual Persistence)

For X11 with xrandr, settings do not persist. Use autostart:

```bash
# Create startup script
tee /usr/local/bin/display-config.sh << 'EOF'
#!/bin/bash
# Wait for display to be fully ready
sleep 2

# Configure displays
xrandr --output eDP-1 --mode 1920x1080 --rate 60 --primary
xrandr --output HDMI-1 --mode 2560x1440 --rate 60 --right-of eDP-1
xrandr --output HDMI-1 --scale 1x1

# Set text scaling
gsettings set org.gnome.desktop.interface text-scaling-factor 1.0
EOF

chmod +x /usr/local/bin/display-config.sh

# Add to GNOME autostart
tee ~/.config/autostart/display-config.desktop << 'EOF'
[Desktop Entry]
Type=Application
Name=Display Configuration
Exec=/usr/local/bin/display-config.sh
NoDisplay=true
X-GNOME-Autostart-enabled=true
EOF
```

## Troubleshooting

```bash
# Display shows wrong resolution after boot
# Check if xrandr sees the correct modes
xrandr --verbose | grep -A 10 "HDMI-1 connected"

# Black screen after changing resolution
# Wait 20 seconds - GNOME will revert automatically
# Or switch to TTY (Ctrl+Alt+F3) and:
export DISPLAY=:0
xrandr --output HDMI-1 --auto

# Blurry display at 4K resolution
# Scale is probably set to 1x - try 2x
gsettings set org.gnome.desktop.interface scaling-factor 2

# Scaling makes some apps blurry (common with fractional scaling)
# This is normal for X11 apps on Wayland fractional scaling
# Set each app's own scaling as described above

# Check the actual DPI being used
xdpyinfo | grep resolution
# If it shows 96x96 but your monitor is HiDPI, GNOME is managing scaling
```

Getting display resolution and scaling right often requires knowing whether you are on X11 or Wayland, what your actual monitor DPI is, and which applications handle scaling themselves versus relying on the desktop compositor. The GNOME settings approach handles most cases correctly, and the xrandr and gsettings tools fill in the gaps for edge cases and automation.
