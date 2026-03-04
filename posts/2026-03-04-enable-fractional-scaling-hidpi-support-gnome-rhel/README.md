# How to Enable Fractional Scaling and HiDPI Support in GNOME on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, GNOME, HiDPI, Fractional Scaling, Display, Linux

Description: Enable fractional scaling and HiDPI display support in GNOME on RHEL for sharp rendering on high-resolution monitors.

---

Modern HiDPI displays (4K, 5K) require proper scaling to keep text and UI elements readable. GNOME on RHEL supports integer scaling (100%, 200%) by default, but fractional scaling (125%, 150%, 175%) requires additional configuration.

## Check Your Current Display Settings

```bash
# Check the current display resolution
xrandr | grep " connected"

# Check the current scale factor
gsettings get org.gnome.desktop.interface scaling-factor

# Check display settings via GNOME
gsettings get org.gnome.mutter experimental-features
```

## Enable Integer Scaling (100%, 200%)

Integer scaling is available through GNOME Settings without extra configuration.

```bash
# Open GNOME Settings
gnome-control-center display

# Or set scaling via command line
# 1 = 100%, 2 = 200%
gsettings set org.gnome.desktop.interface scaling-factor 2
```

## Enable Fractional Scaling on Wayland

Fractional scaling on Wayland is an experimental feature in GNOME.

```bash
# Enable the fractional scaling experimental feature
gsettings set org.gnome.mutter experimental-features "['scale-monitor-framebuffer']"

# Log out and log back in for the changes to take effect
```

After logging back in, go to Settings > Displays. You will now see additional scaling options like 125%, 150%, and 175%.

## Enable Fractional Scaling on X11

On X11, fractional scaling uses a different approach with xrandr.

```bash
# For 150% scaling on X11 using xrandr
# First, set a higher virtual resolution, then scale down
xrandr --output eDP-1 --scale 1.5x1.5

# Or use GNOME's built-in X11 fractional scaling
gsettings set org.gnome.mutter experimental-features "['x11-randr-fractional-scaling']"
```

## Configure Per-Monitor Scaling

If you have mixed-DPI monitors (e.g., a 4K laptop display and a 1080p external monitor):

```bash
# On Wayland, GNOME supports per-monitor scaling natively
# Go to Settings > Displays and set different scale factors for each monitor

# On X11, use xrandr to scale specific outputs
xrandr --output eDP-1 --scale 1x1 --output HDMI-1 --scale 1.5x1.5
```

## Adjust Font Scaling

If you prefer to scale only the fonts instead of the entire UI:

```bash
# Set a font scaling factor (1.0 = normal, 1.25 = 125%, 1.5 = 150%)
gsettings set org.gnome.desktop.interface text-scaling-factor 1.25

# This scales all text without affecting UI element sizes
```

## Configure Cursor Size for HiDPI

```bash
# Set a larger cursor size for HiDPI displays
gsettings set org.gnome.desktop.interface cursor-size 48

# Common values: 24 (default), 32, 48, 64, 96
```

## GDK and Qt Application Scaling

Some applications need environment variables for proper HiDPI rendering:

```bash
# For GTK applications (usually handled by GNOME automatically)
export GDK_SCALE=2
export GDK_DPI_SCALE=0.5

# For Qt applications
export QT_AUTO_SCREEN_SCALE_FACTOR=1
export QT_SCALE_FACTOR=1.5

# Make these persistent by adding them to ~/.bashrc or a profile script
echo 'export QT_AUTO_SCREEN_SCALE_FACTOR=1' >> ~/.bashrc
```

## Troubleshooting

```bash
# If fractional scaling causes blurry text
# Try disabling the experimental feature and using font scaling instead
gsettings reset org.gnome.mutter experimental-features
gsettings set org.gnome.desktop.interface text-scaling-factor 1.5

# Check the current DPI setting
xdpyinfo | grep -i dpi
```

Fractional scaling makes RHEL usable on HiDPI displays while maintaining crisp text and properly sized UI elements across different screen resolutions.
