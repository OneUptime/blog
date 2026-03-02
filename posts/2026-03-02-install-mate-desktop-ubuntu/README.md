# How to Install MATE Desktop on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Desktop, MATE, GUI, Linux Desktop

Description: Learn how to install and configure the MATE desktop environment on Ubuntu, including installation methods, customization options, and tips for optimal performance.

---

MATE is a desktop environment that continues the GNOME 2 tradition - a classic, straightforward interface with a panel at the top, a panel at the bottom, a menu, and no surprises. It is lightweight compared to modern GNOME, responsive on older hardware, and familiar to anyone who used Linux desktops in the early 2010s. On Ubuntu, you can install it alongside the existing desktop or use Ubuntu MATE as your primary distribution.

## Installation Methods

There are two main approaches: installing ubuntu-mate-desktop (full Ubuntu MATE experience) or installing mate-desktop-environment (minimal MATE on top of existing Ubuntu).

### Full Ubuntu MATE Desktop

```bash
# Update package lists
sudo apt update

# Install the full Ubuntu MATE desktop metapackage
# This includes the MATE desktop plus Ubuntu MATE-specific theming and applications
sudo apt install -y ubuntu-mate-desktop

# If asked about the display manager, choose lightdm for MATE
# or gdm3 if you want to keep using GNOME as well
```

This pulls in around 400-500 packages and takes significant disk space (several GB).

### Minimal MATE Installation

If you want a lighter footprint:

```bash
# Install only the core MATE components
sudo apt install -y mate-desktop-environment-core

# Or the full MATE environment without Ubuntu MATE extras
sudo apt install -y mate-desktop-environment
```

### Installing on Ubuntu Server (No Existing GUI)

On a server with no GUI, start with a display server:

```bash
# Install MATE with a display manager on a server
sudo apt update
sudo apt install -y mate-desktop-environment lightdm

# Configure lightdm as the display manager
sudo dpkg-reconfigure lightdm

# Enable the display manager service
sudo systemctl enable --now lightdm
```

## Choosing a Display Manager

The display manager handles the graphical login screen. For MATE, LightDM is the traditional choice:

```bash
# Install LightDM
sudo apt install -y lightdm lightdm-gtk-greeter lightdm-gtk-greeter-settings

# Set LightDM as the default display manager
sudo dpkg-reconfigure lightdm

# Check which display manager is active
cat /etc/X11/default-display-manager

# Start/restart LightDM
sudo systemctl restart lightdm
```

## Logging In to MATE

After installation, log out of your current session or reboot. At the login screen:

1. Click the gear/session icon near the login button
2. Select "MATE" from the session list
3. Enter your password and log in

From the command line, you can also check available sessions:

```bash
# List available desktop sessions
ls /usr/share/xsessions/
# Should show mate.desktop and others
```

## MATE Interface Overview

Once logged in, the default MATE desktop has:
- **Top panel**: Contains the Applications, Places, and System menus on the left; system tray and clock on the right
- **Bottom panel**: Contains the window list (taskbar) and workspace switcher
- **Desktop**: Right-click for desktop settings and new folder options

## Basic Configuration

### Changing the Theme

```bash
# From the GUI:
# System > Preferences > Look and Feel > Appearance

# Or install additional themes
sudo apt install -y mate-themes

# Popular themes available in repos
sudo apt install -y arc-theme numix-gtk-theme

# List installed themes
ls /usr/share/themes/
```

### Configuring the Panel

Right-click on any panel to add/remove applets, change properties, or add a new panel. Common applets to add:

- System Monitor (CPU/memory graph in the panel)
- Network Monitor
- Hardware Temperature Monitor
- Notification Area

```bash
# Install additional panel applets
sudo apt install -y mate-applets mate-sensors-applet
```

### Desktop Icons and File Manager

```bash
# Configure Caja (MATE's file manager) preferences
# Files > Edit > Preferences

# Show hidden files
# Files > View > Show Hidden Files (Ctrl+H)

# Enable desktop icon management
# System > Preferences > Look and Feel > Desktop
```

## Installing Additional MATE Applications

```bash
# Terminal emulator
sudo apt install -y mate-terminal

# Text editor
sudo apt install -y pluma

# Image viewer
sudo apt install -y eom

# Document viewer
sudo apt install -y evince

# Archive manager
sudo apt install -y engrampa

# System information tool
sudo apt install -y mate-system-monitor

# Calculator
sudo apt install -y mate-calc

# Screenshot tool
sudo apt install -y mate-utils  # includes mate-screenshot

# Network manager applet for the panel
sudo apt install -y network-manager-gnome
```

## Performance Tweaks

MATE is already lighter than GNOME, but you can tune it further:

```bash
# Disable compositing (desktop effects) for maximum speed
# System > Preferences > Look and Feel > Windows > disable compositing
# Or from command line:
gsettings set org.mate.Marco.general compositing-manager false

# Reduce animation speed
gsettings set org.mate.Marco.general reduced-resources true

# Check which compositor is running
pgrep -x marco  # MATE's window manager

# Disable desktop effects via marco
marco --replace --no-composite &
```

## MATE with Remote Desktop (VNC)

MATE works well with VNC for remote access:

```bash
# Install VNC server
sudo apt install -y tigervnc-standalone-server tigervnc-common

# Set VNC password
vncpasswd

# Create VNC startup script
mkdir -p ~/.vnc
tee ~/.vnc/xstartup << 'EOF'
#!/bin/bash
# Start MATE desktop in VNC session
export XKL_XMODMAP_DISABLE=1
exec mate-session
EOF
chmod +x ~/.vnc/xstartup

# Start VNC server on display :1
vncserver :1 -geometry 1920x1080 -depth 24

# Check VNC is running
vncserver -list

# Connect from another machine:
# On Linux: vncviewer your-server:5901
# On Windows: Use TigerVNC or RealVNC client
```

## Switching Between MATE and GNOME

You can have both desktop environments installed and choose at login:

```bash
# Both will appear in the session selector at the login screen
# MATE session: /usr/share/xsessions/mate.desktop
# GNOME session: /usr/share/xsessions/gnome.desktop

# To set the default session for a user
# Edit ~/.dmrc
tee ~/.dmrc << 'EOF'
[Desktop]
Session=mate
EOF

# Or for all users, configure LightDM default session
sudo tee /etc/lightdm/lightdm.conf.d/50-user-session.conf << 'EOF'
[Seat:*]
user-session=mate
EOF
```

## Keyboard Shortcuts

MATE uses mostly standard keyboard shortcuts. A few useful ones to know:

```
Alt+F1          Open Applications menu
Alt+F2          Run application dialog
Super+E         Open file manager (Caja)
Ctrl+Alt+T      Open terminal (if configured)
Ctrl+Alt+D      Show desktop
Print           Take screenshot
Alt+Print       Screenshot of active window
Ctrl+Alt+L      Lock screen
Super+L         Lock screen (alternate)
```

Configure custom shortcuts:

```bash
# System > Preferences > Hardware > Keyboard Shortcuts
# Or from command line:
gsettings set org.mate.keybindings.media-keys terminal '<Ctrl><Alt>t'
```

## Removing MATE if Needed

```bash
# Remove MATE while keeping other desktop environments
sudo apt remove --purge mate-desktop-environment ubuntu-mate-desktop
sudo apt autoremove

# Switch display manager back if needed
sudo dpkg-reconfigure gdm3
sudo systemctl enable gdm3
```

MATE's main appeal is predictability. It works the way Linux desktops worked before the major paradigm shifts of GNOME 3, and that familiarity has real value - especially on workstations where users should be focused on their work rather than learning a new interface. For older hardware or remote desktop use cases, MATE's performance advantage over GNOME is substantial.
