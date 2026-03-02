# How to Set Up Wayland vs X11 Display Server on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Wayland, X11, Display Server, Desktop

Description: Understand the differences between Wayland and X11 on Ubuntu, how to switch between them, and how to troubleshoot compatibility issues with applications.

---

Wayland is the modern display protocol that has been replacing X11 in Ubuntu since Ubuntu 21.04. Ubuntu 22.04 made Wayland the default for systems with compatible graphics drivers, and Ubuntu 24.04 pushes Wayland further as the primary session type. Understanding the differences between Wayland and X11, and knowing how to switch between them, matters when you encounter applications or workflows that require one or the other.

## Wayland vs X11: Key Differences

**X11 (X Window System)**:
- Been around since 1984, extremely mature
- Client-server architecture where X server handles display and input
- Network transparent by design (X11 forwarding over SSH)
- Applications can read each other's windows and input events (security concern)
- Wide compatibility with legacy applications
- Maintained by Xorg project

**Wayland**:
- Designed from scratch to address X11's architectural limitations
- Compositor is the display server - simpler architecture
- Stronger isolation between applications (cannot screenshot other apps without permission)
- Better performance for modern hardware, especially HiDPI
- Screen rotation and scaling work more consistently
- Requires XWayland compatibility layer for X11 applications

## Checking Your Current Session Type

```bash
# Check if running Wayland or X11
echo $XDG_SESSION_TYPE
# Output: wayland or x11

# Check WAYLAND_DISPLAY variable
echo $WAYLAND_DISPLAY
# Output: wayland-0 if on Wayland, empty if on X11

# Check DISPLAY variable
echo $DISPLAY
# Output: :0 on both X11 and Wayland (via XWayland)

# More detailed session information
loginctl show-session $(loginctl | grep $(whoami) | awk '{print $1}') | grep -E "Type|Desktop|Remote"

# Check with wmctrl on X11
wmctrl -m 2>/dev/null || echo "wmctrl not working (likely Wayland)"
```

## Switching Between Wayland and X11 at Login

### GDM3 (Ubuntu Default)

At the GDM login screen:
1. Click your username
2. Click the gear icon in the bottom-right corner
3. Select "Ubuntu on Wayland" or "Ubuntu" (X11) or "GNOME on Xorg"

The choice is remembered for subsequent logins.

### Changing the Default Session

To permanently change the default:

```bash
# Set X11 GNOME as default for a specific user
tee ~/.dmrc << 'EOF'
[Desktop]
Session=gnome-xorg
EOF

# Set Wayland GNOME as default
tee ~/.dmrc << 'EOF'
[Desktop]
Session=gnome
EOF
```

For system-wide default via GDM:

```bash
# Disable Wayland system-wide (forces X11 for all users)
sudo nano /etc/gdm3/custom.conf

# Uncomment or add this line:
# WaylandEnable=false

# File should contain:
# [daemon]
# WaylandEnable=false
```

```bash
sudo tee /etc/gdm3/custom.conf << 'EOF'
[daemon]
# Uncomment to disable Wayland
# WaylandEnable=false

# Uncomment to enable automatic login
# AutomaticLoginEnable=true
# AutomaticLogin=username

[security]

[xdmcp]

[chooser]

[debug]
# Uncomment to enable debugging
# Enable=true
EOF
```

## Enabling and Disabling Wayland

### Disable Wayland (Use X11 Only)

```bash
# Method 1: GDM configuration
sudo sed -i 's/#WaylandEnable=false/WaylandEnable=false/' /etc/gdm3/custom.conf
sudo systemctl restart gdm3

# Method 2: Using the udev rule
# This disables Wayland for systems with specific graphics configurations
sudo tee /etc/udev/rules.d/61-gdm.rules << 'EOF'
# Force X11 session
DRIVER=="nvidia", ENV{GDM_FORCE_X11}="1"
EOF

sudo udevadm control --reload-rules
```

### Enable Wayland (Re-enable After Disabling)

```bash
# Re-enable Wayland in GDM config
sudo sed -i 's/^WaylandEnable=false/#WaylandEnable=false/' /etc/gdm3/custom.conf
sudo systemctl restart gdm3

# Remove any force-X11 udev rules
sudo rm /etc/udev/rules.d/61-gdm.rules 2>/dev/null
sudo udevadm control --reload-rules
```

## XWayland: Running X11 Apps on Wayland

XWayland is a compatibility layer that runs X11 applications on a Wayland session. It is installed automatically with modern Ubuntu:

```bash
# Check if XWayland is running
ps aux | grep Xwayland

# XWayland should be running as:
# /usr/bin/Xwayland :0 -rootless -noreset ...

# Verify XWayland package
dpkg -l xwayland

# Install if missing
sudo apt install -y xwayland
```

Most X11 applications run seamlessly through XWayland without any configuration. Problems occur with:
- Applications that capture the mouse or keyboard globally
- Screen recording and screenshot tools
- Some clipboard managers
- Applications that use X11 extensions not supported in XWayland

## Application Compatibility Issues

### Applications That Fail on Wayland

```bash
# Common failure: application works on X11 but fails on Wayland

# Run a specific application with XWayland (force X11)
DISPLAY=:0 GDK_BACKEND=x11 application-name

# For GTK applications
GDK_BACKEND=x11 application-name

# For Qt applications
QT_QPA_PLATFORM=xcb application-name

# For SDL applications
SDL_VIDEODRIVER=x11 application-name

# Create a wrapper script to always force X11 for a specific app
sudo tee /usr/local/bin/myapp-x11 << 'EOF'
#!/bin/bash
GDK_BACKEND=x11 exec /usr/bin/myapp "$@"
EOF
sudo chmod +x /usr/local/bin/myapp-x11
```

### Screen Sharing and Recording

Screen sharing in video calls (Zoom, Teams, etc.) and screen recording work differently on Wayland:

```bash
# Install PipeWire and xdg-desktop-portal for screen sharing on Wayland
sudo apt install -y pipewire pipewire-pulse xdg-desktop-portal \
  xdg-desktop-portal-gnome

# Verify PipeWire is running
systemctl --user status pipewire

# Check portal is running
systemctl --user status xdg-desktop-portal

# For Electron apps (Slack, VS Code, etc.) that need screen sharing
# Add --enable-features=WebRTCPipeWireCapturer to launch options
# For VS Code:
echo "--enable-features=WebRTCPipeWireCapturer" >> ~/.config/code/argv.json
```

### SSH X11 Forwarding on Wayland

X11 forwarding over SSH does not work from a Wayland session the same way:

```bash
# On Wayland, X11 forwarding still works via XWayland
# but the DISPLAY variable must be set correctly

# Connect with X11 forwarding
ssh -X user@remote-server

# For more performance (trusted mode)
ssh -Y user@remote-server

# Test forwarding
ssh -X user@remote-server xclock

# If forwarding fails on Wayland, try:
ssh -X -o ForwardX11Trusted=yes user@remote-server

# Check XAUTHORITY file
echo $XAUTHORITY
ls -la $XAUTHORITY
```

## Performance Considerations

```bash
# Check if hardware acceleration is working on Wayland
# For GNOME, check if Mesa/Vulkan is available
glxinfo | grep -i "renderer\|version"
vulkaninfo 2>/dev/null | grep "GPU id" || echo "Vulkan not available"

# Check if GNOME is using GPU acceleration
# Via GNOME's built-in monitoring
dconf read /org/gnome/mutter/debug-enable-verbose-log

# Check for software rendering (indicates GPU issues)
LIBGL_DEBUG=verbose glxgears 2>&1 | head -5

# Force software rendering for testing
LIBGL_ALWAYS_SOFTWARE=1 glxgears
```

## Wayland Debugging

```bash
# Enable Wayland debug output
WAYLAND_DEBUG=1 application-name 2>&1 | head -50

# Check compositor errors
journalctl -b | grep -i "wayland\|compositor" | tail -50

# Check for Mutter (GNOME compositor) issues
journalctl -b --unit=gdm | grep -i "error\|warn" | tail -20

# Test with a Wayland-native application
# weston is a reference compositor
sudo apt install -y weston
weston  # Runs a nested Wayland compositor for testing
```

## Remote Desktop on Wayland

Wayland has implications for remote desktop:

```bash
# GNOME Remote Desktop (native Wayland approach, Ubuntu 22.04+)
# Enable in Settings > Sharing > Remote Desktop
# Or via command line:
gnome-remote-desktop-ctl status

# For RDP access (xrdp does not work well with Wayland yet)
# Use GNOME Remote Desktop instead
sudo apt install -y gnome-remote-desktop

# For VNC on Wayland
sudo apt install -y gnome-remote-desktop
# Settings > Sharing > Screen Sharing
```

## Checking Wayland Compositor Information

```bash
# Check which Wayland compositor is running
ps aux | grep -E "mutter|kwin|sway|weston" | grep -v grep

# GNOME uses Mutter as its compositor
# KDE uses KWin
# On non-desktop systems, Sway or Weston may be used

# Get compositor capabilities
wayland-info 2>/dev/null || \
  sudo apt install -y wayland-utils && wayland-info

# Check supported Wayland protocols
wayland-info | grep interface
```

The right choice between Wayland and X11 depends on your specific situation. For a modern desktop with current hardware and applications, Wayland is the better choice - it is more secure, handles HiDPI better, and is where active development is happening. For applications that are incompatible with Wayland, remote desktop scenarios relying on X11 forwarding, or situations requiring specific X11 extensions, sticking with X11 is pragmatic. Ubuntu makes switching easy, so there is little reason not to try Wayland and fall back to X11 if something does not work.
