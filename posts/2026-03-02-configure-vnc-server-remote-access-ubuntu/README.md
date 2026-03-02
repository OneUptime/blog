# How to Configure VNC Server for Remote Access on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, VNC, Remote Access, Desktop, Remote Desktop

Description: Step-by-step guide to setting up VNC server on Ubuntu for remote graphical desktop access, covering TigerVNC, configuration, security, and SSH tunneling.

---

VNC (Virtual Network Computing) lets you access a graphical desktop session on a remote Ubuntu machine as if you were sitting in front of it. Unlike SSH, which gives you a command line, VNC mirrors the full desktop including applications, windows, and GUI tools. This is useful for remote administration of machines that require graphical applications or for accessing your work desktop from home.

## Choosing a VNC Server

Ubuntu has several VNC server options:

- **TigerVNC**: Fast, well-maintained, recommended for new setups
- **TightVNC**: Older but still functional, good for low-bandwidth connections
- **x11vnc**: Shares an existing X session (useful for accessing a running desktop)
- **Vino**: GNOME's built-in VNC server (for sharing a live session)

This guide covers TigerVNC for standalone virtual desktops and x11vnc for sharing a live session.

## Installing TigerVNC

```bash
# Install TigerVNC server and a desktop environment
sudo apt update
sudo apt install -y tigervnc-standalone-server tigervnc-common

# Install a desktop environment if not already present
# For XFCE (lightweight, recommended for VNC)
sudo apt install -y xfce4 xfce4-goodies

# Or MATE
sudo apt install -y mate-desktop-environment
```

## Setting Up VNC Password

```bash
# Set VNC access password (as the user who will run VNC)
vncpasswd

# You will be prompted:
# Password: (enter your VNC password)
# Verify: (confirm)
# Would you like to enter a view-only password (y/n)? n

# Password is stored in ~/.vnc/passwd
ls -la ~/.vnc/
```

## Configuring the Startup Script

The VNC startup script defines what desktop launches in the VNC session:

```bash
# Create the VNC config directory
mkdir -p ~/.vnc

# Create startup script for XFCE
tee ~/.vnc/xstartup << 'EOF'
#!/bin/bash
# VNC session startup script

# Fix display issues
unset SESSION_MANAGER
unset DBUS_SESSION_BUS_ADDRESS

# Set keyboard and display settings
export XKL_XMODMAP_DISABLE=1
export XDG_SESSION_TYPE=x11

# Start D-Bus session if not running
[ -z "$DBUS_SESSION_BUS_ADDRESS" ] && eval $(dbus-launch --sh-syntax)

# Start XFCE desktop
exec startxfce4
EOF

chmod +x ~/.vnc/xstartup

# For GNOME (Note: GNOME on VNC can be slow - consider XFCE instead)
# tee ~/.vnc/xstartup << 'EOF'
# #!/bin/bash
# unset SESSION_MANAGER
# unset DBUS_SESSION_BUS_ADDRESS
# exec gnome-session
# EOF

# For MATE
# tee ~/.vnc/xstartup << 'EOF'
# #!/bin/bash
# unset SESSION_MANAGER
# unset DBUS_SESSION_BUS_ADDRESS
# export XKL_XMODMAP_DISABLE=1
# exec mate-session
# EOF
```

## Starting and Managing VNC Sessions

```bash
# Start a VNC server on display :1 (port 5901)
vncserver :1 -geometry 1920x1080 -depth 24

# Start with specific settings
vncserver :1 \
  -geometry 1280x800 \
  -depth 24 \
  -localhost no \
  -SecurityTypes VncAuth

# List running VNC sessions
vncserver -list

# Kill a VNC session
vncserver -kill :1

# Kill all VNC sessions
vncserver -killall
```

## Running VNC as a Systemd Service

For persistent access that survives reboots:

```bash
# Create a systemd user service
mkdir -p ~/.config/systemd/user

tee ~/.config/systemd/user/vncserver@.service << 'EOF'
[Unit]
Description=TigerVNC server on display :%i
After=syslog.target network.target

[Service]
Type=forking
User=%u
WorkingDirectory=%h

# Clean up lockfiles if VNC was not cleanly stopped
ExecStartPre=/bin/sh -c '/usr/bin/vncserver -kill :%i > /dev/null 2>&1 || :'

ExecStart=/usr/bin/vncserver :%i \
    -geometry 1920x1080 \
    -depth 24 \
    -localhost no

ExecStop=/usr/bin/vncserver -kill :%i

Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
EOF

# Enable and start the service for display :1
systemctl --user enable vncserver@1.service
systemctl --user start vncserver@1.service

# Enable lingering so the service starts at boot (not just at login)
sudo loginctl enable-linger $USER

# Check status
systemctl --user status vncserver@1.service
```

## Securing VNC with SSH Tunneling

VNC traffic is not encrypted by default. Always tunnel VNC over SSH in production:

```bash
# On the Ubuntu server, configure VNC to listen only on localhost
vncserver :1 -localhost yes -geometry 1920x1080 -depth 24

# From your client machine, create an SSH tunnel
# Replace user@server-ip with your details
ssh -L 5901:localhost:5901 -N -f user@server-ip

# Now connect your VNC client to localhost:5901
# The traffic is encrypted through SSH

# For persistent tunnel with autossh (reconnects on failure)
sudo apt install -y autossh  # Install on client

autossh -M 0 -f -N \
  -L 5901:localhost:5901 \
  -o "ServerAliveInterval 30" \
  -o "ServerAliveCountMax 3" \
  user@server-ip
```

## Using x11vnc to Share a Running Session

x11vnc is different from TigerVNC - it shares the currently running X display rather than creating a new virtual one:

```bash
# Install x11vnc
sudo apt install -y x11vnc

# Set a password
x11vnc -storepasswd /etc/x11vnc.pass

# Start x11vnc sharing the current display
x11vnc -display :0 \
  -auth guess \
  -passwd yourpassword \
  -rfbport 5900 \
  -loop \
  -noxdamage

# Or for SSH-only access (no password needed, tunneled through SSH)
x11vnc -display :0 -auth guess -localhost -rfbport 5900 -loop

# Create a systemd service for x11vnc
sudo tee /etc/systemd/system/x11vnc.service << 'EOF'
[Unit]
Description=x11vnc VNC Server
After=multi-user.target network.target

[Service]
Type=simple
ExecStart=/usr/bin/x11vnc \
    -display :0 \
    -auth /run/user/1000/gdm/Xauthority \
    -rfbauth /etc/x11vnc.pass \
    -rfbport 5900 \
    -loop \
    -noxdamage \
    -repeat

Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable --now x11vnc
```

## Firewall Configuration

```bash
# Allow VNC port through firewall (only if not using SSH tunneling)
# VNC display :1 = port 5901, :2 = 5902, etc.
sudo ufw allow from 192.168.1.0/24 to any port 5901 proto tcp

# Better: Allow only SSH and use SSH tunneling for VNC
sudo ufw allow ssh
sudo ufw deny 5900:5909/tcp

# Check rules
sudo ufw status
```

## Connecting from VNC Clients

```bash
# Linux - using vncviewer (TigerVNC client)
sudo apt install -y tigervnc-viewer

# Connect directly (insecure, use only on trusted networks)
vncviewer server-ip:5901

# Connect through SSH tunnel (recommended)
# First establish tunnel:
ssh -L 5901:localhost:5901 -N user@server-ip &
# Then connect:
vncviewer localhost:5901

# Linux - using Remmina (GUI application)
sudo apt install -y remmina remmina-plugin-vnc
# Launch Remmina and add a new VNC connection
```

## Performance Tuning

VNC can feel sluggish on slow connections. Tune for performance:

```bash
# Use quality settings for slow connections
vncserver :1 \
  -geometry 1280x720 \
  -depth 16 \           # 16-bit color uses less bandwidth than 24-bit
  -CompressLevel 6 \    # Compression level 0-9
  -QualityLevel 6       # JPEG quality 0-9

# Disable compositing in XFCE for faster rendering
# XFCE > Settings > Window Manager Tweaks > Compositor tab
# Uncheck "Enable display compositing"

# Or disable via command line
xfconf-query -c xfwm4 -p /general/use_compositing -s false

# Use TigerVNC's encoding options from client
vncviewer -PreferredEncoding Tight -QualityLevel 7 localhost:5901
```

## Troubleshooting

```bash
# VNC fails to start - check for stale lock files
ls ~/.vnc/*.pid
ls /tmp/.X*-lock

# Remove lock files if VNC is not running
rm ~/.vnc/hostname:1.pid
rm /tmp/.X1-lock

# Check what is using the VNC port
sudo ss -tlnp | grep 5901

# View VNC server logs
cat ~/.vnc/hostname:1.log

# Common error: "display :1 already exists"
# Kill the existing session first:
vncserver -kill :1

# XFCE not starting - test the startup script manually
DISPLAY=:1 bash ~/.vnc/xstartup

# Check X authentication
ls ~/.Xauthority
xauth list
```

VNC is a practical tool for remote graphical access, but the security story requires attention. Always tunnel over SSH for any connection crossing public networks, use strong VNC passwords, and consider restricting VNC to listen only on localhost to enforce SSH tunneling. For a more integrated remote desktop experience on Ubuntu, also consider GNOME Remote Desktop or RDP via xrdp as alternatives.
