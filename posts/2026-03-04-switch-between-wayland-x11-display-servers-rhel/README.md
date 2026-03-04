# How to Switch Between Wayland and X11 Display Servers on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Wayland, X11, GNOME, Display Server, Linux

Description: Switch between Wayland and X11 display servers on RHEL to resolve compatibility issues or meet specific application requirements.

---

RHEL 9 uses Wayland as the default display server for GNOME. While Wayland offers better security and performance, some applications (screen sharing tools, remote desktop software, certain graphics drivers) may still require X11. Switching between them is straightforward.

## Check the Current Display Server

```bash
# Check which display server is running
echo $XDG_SESSION_TYPE
# Output: wayland or x11

# Alternative method
loginctl show-session $(loginctl | grep $(whoami) | awk '{print $1}') -p Type
```

## Switch at the Login Screen (Per Session)

On the GDM login screen:
1. Click your username
2. Before entering your password, look for a gear icon in the lower right
3. Click it and choose either "GNOME" (Wayland) or "GNOME on Xorg" (X11)
4. Enter your password and log in

## Set X11 as the Default System-Wide

To permanently switch to X11 for all users:

```bash
# Edit the GDM custom configuration
sudo vi /etc/gdm/custom.conf

# Uncomment or add the WaylandEnable line in the [daemon] section:
```

```ini
[daemon]
WaylandEnable=false
```

```bash
# Restart GDM to apply the change
sudo systemctl restart gdm

# After logging back in, verify
echo $XDG_SESSION_TYPE
# Output: x11
```

## Switch Back to Wayland

```bash
# Edit the GDM configuration
sudo vi /etc/gdm/custom.conf

# Set WaylandEnable to true or comment out the line:
```

```ini
[daemon]
WaylandEnable=true
```

```bash
# Restart GDM
sudo systemctl restart gdm

# Verify
echo $XDG_SESSION_TYPE
# Output: wayland
```

## NVIDIA Driver Considerations

NVIDIA proprietary drivers have specific Wayland requirements:

```bash
# Check if NVIDIA driver is blocking Wayland
cat /usr/lib/udev/rules.d/61-gdm.rules

# For newer NVIDIA drivers (515+), Wayland may work
# Ensure the driver supports GBM
modinfo nvidia | grep version

# If NVIDIA is forcing X11, you can override by editing the udev rule
sudo cp /usr/lib/udev/rules.d/61-gdm.rules /etc/udev/rules.d/61-gdm.rules
# Edit the copy to remove or comment out the NVIDIA Wayland disable rule
```

## Running X11 Applications Under Wayland

Wayland sessions include XWayland, which provides X11 compatibility for legacy applications.

```bash
# Check if XWayland is running
ps aux | grep Xwayland

# Most X11 applications work transparently through XWayland
# To force an application to use XWayland explicitly:
GDK_BACKEND=x11 firefox

# Or for Qt applications:
QT_QPA_PLATFORM=xcb some-qt-app
```

## Troubleshooting

```bash
# Check GDM logs for display server issues
journalctl -u gdm -b

# Check for Wayland-specific errors
journalctl -b | grep -i wayland

# Check if required kernel modules are loaded
lsmod | grep drm
```

## When to Use X11 vs Wayland

Use X11 when:
- You need screen sharing in older video conferencing tools
- You use remote desktop tools that do not support Wayland
- Your GPU driver has poor Wayland support

Use Wayland when:
- You want better security (no keylogging between applications)
- You need smoother multi-monitor and HiDPI support
- Your applications are compatible with Wayland or XWayland

Both display servers are fully supported on RHEL, giving you flexibility to choose what works best for your environment.
