# How to Set Up a VNC Server for Remote Desktop on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, VNC, Remote Desktop, GUI, Server, Tutorial

Description: Complete guide to setting up TigerVNC or TightVNC server on Ubuntu for secure remote desktop access over SSH tunnels.

---

VNC (Virtual Network Computing) provides graphical remote desktop access to your Ubuntu system. This guide covers installing and configuring a VNC server, securing connections with SSH tunnels, and optimizing performance.

## VNC Server Options

| Server | Best For |
|--------|----------|
| TigerVNC | Modern, well-maintained, good performance |
| TightVNC | Lightweight, wide compatibility |
| x11vnc | Share existing X session (physical display) |
| Vino | GNOME built-in (desktop sharing) |

This guide focuses on TigerVNC as it offers the best balance of features and performance.

## Prerequisites

- Ubuntu 20.04, 22.04, or 24.04 (server or desktop)
- Desktop environment installed
- SSH access configured
- Firewall access (or SSH tunnel)

## Installing Desktop Environment

If starting with Ubuntu Server:

```bash
# Update packages
sudo apt update

# Install lightweight desktop (XFCE recommended for VNC)
sudo apt install xfce4 xfce4-goodies -y

# Or GNOME (heavier)
# sudo apt install ubuntu-desktop -y

# Or MATE (medium weight)
# sudo apt install ubuntu-mate-desktop -y
```

## Installing TigerVNC Server

```bash
# Install TigerVNC server
sudo apt install tigervnc-standalone-server tigervnc-common -y

# Verify installation
vncserver -version
```

## Initial Configuration

### Set VNC Password

```bash
# Set password for current user
vncpasswd
```

You'll be prompted for:
- VNC password (for connections)
- View-only password (optional, for read-only access)

### Create Configuration Directory

```bash
# Create VNC config directory if it doesn't exist
mkdir -p ~/.vnc
```

### Configure Startup Script

Create the xstartup file to define which desktop to run:

```bash
# Create xstartup configuration
nano ~/.vnc/xstartup
```

For XFCE:

```bash
#!/bin/bash
# VNC startup script for XFCE desktop

# Unset session manager to prevent conflicts
unset SESSION_MANAGER
unset DBUS_SESSION_BUS_ADDRESS

# Start XFCE4 desktop
exec startxfce4
```

For GNOME:

```bash
#!/bin/bash
# VNC startup script for GNOME desktop

unset SESSION_MANAGER
unset DBUS_SESSION_BUS_ADDRESS

# Set XDG session type
export XDG_SESSION_TYPE=x11
export GNOME_SHELL_SESSION_MODE=classic

# Start GNOME classic session
exec gnome-session --session=gnome-classic
```

Make executable:

```bash
chmod +x ~/.vnc/xstartup
```

## Starting VNC Server

### Start Manually

```bash
# Start VNC server on display :1 (port 5901)
vncserver :1

# Start with specific resolution
vncserver :1 -geometry 1920x1080

# Start with color depth
vncserver :1 -geometry 1920x1080 -depth 24
```

### Check Running Sessions

```bash
# List running VNC sessions
vncserver -list
```

### Stop VNC Server

```bash
# Stop specific display
vncserver -kill :1

# Stop all sessions for current user
vncserver -kill :*
```

## Configure as Systemd Service

For automatic startup and management:

### Create Service File

```bash
# Create systemd service (replace 'username' with your user)
sudo nano /etc/systemd/system/vncserver@.service
```

```ini
[Unit]
Description=TigerVNC Server for %i
After=syslog.target network.target

[Service]
Type=forking
User=%i
Group=%i
WorkingDirectory=/home/%i

# Clean up any existing locks
ExecStartPre=/bin/sh -c '/usr/bin/vncserver -kill :%i > /dev/null 2>&1 || :'

# Start VNC server
ExecStart=/usr/bin/vncserver :%i -geometry 1920x1080 -depth 24 -localhost no

# Stop VNC server
ExecStop=/usr/bin/vncserver -kill :%i

# Restart on failure
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### Enable and Start Service

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable for user 'myuser' on display :1
sudo systemctl enable vncserver@myuser:1

# Start the service
sudo systemctl start vncserver@myuser:1

# Check status
sudo systemctl status vncserver@myuser:1
```

## Securing VNC with SSH Tunnel

VNC transmits data unencrypted. Always use SSH tunneling for security.

### Configure VNC for Localhost Only

Edit VNC to only accept local connections:

```bash
# Start VNC bound to localhost only
vncserver :1 -localhost yes
```

Or modify the service file to use `-localhost yes`.

### Create SSH Tunnel from Client

On your local machine:

```bash
# Create SSH tunnel (Linux/macOS)
# -L local_port:destination:remote_port
ssh -L 5901:localhost:5901 -N -f user@server_ip

# Then connect VNC client to localhost:5901
```

On Windows, use PuTTY:
1. Session → Host: your_server_ip
2. Connection → SSH → Tunnels
3. Source port: 5901
4. Destination: localhost:5901
5. Click "Add"
6. Connect and leave session open

### Connect Through Tunnel

Using any VNC client, connect to:
- Host: `localhost` or `127.0.0.1`
- Port: `5901` (or display :1)

## VNC Client Options

### Linux

```bash
# Install Remmina (recommended)
sudo apt install remmina remmina-plugin-vnc -y

# Or TigerVNC viewer
sudo apt install tigervnc-viewer -y
# Connect with: vncviewer localhost:5901
```

### macOS

Built-in Screen Sharing or:
- RealVNC Viewer
- TigerVNC Viewer

### Windows

- RealVNC Viewer (free)
- TightVNC Viewer
- TigerVNC Viewer

## Performance Optimization

### VNC Server Options

```bash
# Start with optimized settings
vncserver :1 \
  -geometry 1920x1080 \
  -depth 16 \
  -localhost yes \
  -alwaysshared \
  -dpi 96
```

Options explained:
- `-depth 16`: Reduce color depth for faster transmission
- `-alwaysshared`: Allow multiple connections
- `-dpi 96`: Set consistent DPI

### Client-Side Settings

In your VNC client:
- Enable compression
- Use JPEG encoding for slow connections
- Reduce color depth on slow networks
- Disable desktop effects in XFCE

### Disable Desktop Effects

For XFCE:

```bash
# Disable compositor for better VNC performance
xfconf-query -c xfwm4 -p /general/use_compositing -s false
```

## Multiple Displays

Run multiple VNC sessions for different purposes:

```bash
# Development environment - display :1
vncserver :1 -geometry 1920x1080

# Testing environment - display :2
vncserver :2 -geometry 1280x720

# Each uses a different port (5901, 5902, etc.)
```

## Firewall Configuration

### Using UFW

```bash
# Allow VNC port (only if NOT using SSH tunnel)
sudo ufw allow 5901/tcp

# Better: Only allow from specific IP
sudo ufw allow from 192.168.1.100 to any port 5901

# Best: Use SSH tunnel and keep VNC localhost-only
# No firewall rule needed - SSH handles access
```

### Check Open Ports

```bash
# Verify VNC is listening
ss -tlnp | grep vnc
```

## Using x11vnc (Share Physical Display)

To share the actual monitor (not a virtual display):

```bash
# Install x11vnc
sudo apt install x11vnc -y

# Start sharing current display
x11vnc -display :0 -auth guess -forever -loop -noxdamage -repeat -rfbauth ~/.vnc/passwd -rfbport 5900 -shared
```

This shares what's on the physical monitor.

## Troubleshooting

### "Connection refused"

```bash
# Check VNC is running
vncserver -list

# Check it's listening
ss -tlnp | grep 590

# Verify firewall allows connection
sudo ufw status
```

### Black Screen on Connect

Usually missing desktop configuration:

```bash
# Check xstartup exists and is executable
ls -la ~/.vnc/xstartup

# Verify desktop packages installed
dpkg -l | grep xfce

# Check VNC log
cat ~/.vnc/*.log
```

### Desktop Environment Not Starting

```bash
# Check xstartup content
cat ~/.vnc/xstartup

# Test desktop manually
startxfce4  # or gnome-session

# Install missing packages
sudo apt install xfce4 xfce4-goodies
```

### "Authentication failure"

```bash
# Reset VNC password
vncpasswd

# Restart VNC server
vncserver -kill :1
vncserver :1
```

### Clipboard Not Working

```bash
# Install clipboard support
sudo apt install autocutsel -y

# Add to xstartup before desktop command
autocutsel -fork
```

### Grey Screen or Flickering

```bash
# Kill existing session
vncserver -kill :1

# Remove stale lock files
rm -rf /tmp/.X1-lock /tmp/.X11-unix/X1

# Restart
vncserver :1
```

## Alternatives to VNC

Consider these alternatives for specific use cases:

- **XRDP**: Uses Windows RDP protocol, better Windows client support
- **NoMachine**: Better performance, proprietary
- **Apache Guacamole**: Browser-based access, no client needed
- **Remmina**: Multi-protocol client supporting VNC, RDP, SSH

---

VNC provides reliable remote desktop access to Ubuntu systems. Always secure connections with SSH tunnels, use lightweight desktops like XFCE for better performance, and configure automatic startup via systemd for servers. For better performance on slow connections, consider using XRDP with compression.
