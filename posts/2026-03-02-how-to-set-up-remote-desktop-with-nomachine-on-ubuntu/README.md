# How to Set Up Remote Desktop with NoMachine on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Remote Desktop, NoMachine, GUI, Remote Access

Description: Learn how to install and configure NoMachine on Ubuntu for fast, feature-rich remote desktop access, including server setup, client configuration, and performance tuning.

---

NoMachine is a remote desktop solution that consistently outperforms VNC and RDP in latency and responsiveness, thanks to its NX protocol. It handles high-latency connections well, supports audio, clipboard, and USB sharing, and works across Linux, Windows, and macOS. For accessing an Ubuntu desktop from anywhere, NoMachine is often the best option.

## Understanding NoMachine Components

NoMachine has two parts:
- **Server** (NoMachine) - runs on Ubuntu, handles incoming connections
- **Client** (NoMachine Enterprise Client, or the free client) - runs on the machine you connect from

The free version supports all basic functionality. Enterprise versions add features like session brokering and centralized management.

## Installing NoMachine Server on Ubuntu

NoMachine does not distribute through Ubuntu's repositories, so download from their website:

```bash
# Download the current .deb package (check https://www.nomachine.com/download for latest version)
wget https://download.nomachine.com/download/8.14/Linux/nomachine_8.14.2_1_amd64.deb

# Install it
sudo dpkg -i nomachine_8.14.2_1_amd64.deb

# If there are dependency issues
sudo apt install -f

# Verify the service started
sudo systemctl status nxserver
```

NoMachine runs as a service and starts automatically at boot. The service listens on port 4000 (NX protocol) by default.

## Firewall Configuration

```bash
# Open the NoMachine port
sudo ufw allow 4000/tcp

# For tighter security, restrict to specific source IPs
sudo ufw allow from 192.168.1.0/24 to any port 4000 proto tcp

# If using SSH tunneling instead (recommended for internet access)
sudo ufw allow 22/tcp
# Then keep port 4000 closed to external access
```

## Desktop Environment Requirements

NoMachine needs a display server to connect to. On a headless Ubuntu server (no monitor), you need a virtual display.

### For Ubuntu Desktop (with GUI)

If Ubuntu Desktop is already installed, NoMachine connects to the existing GNOME/Xfce/etc. session. Nothing extra needed.

### For Ubuntu Server (headless)

Install a lightweight desktop environment:

```bash
# Option 1: Xfce (lightweight, good for remote use)
sudo apt install -y xfce4 xfce4-goodies xorg dbus-x11

# Option 2: GNOME (heavier, but familiar)
sudo apt install -y ubuntu-desktop

# Option 3: Minimal XFCE setup
sudo apt install -y xfce4 xfce4-terminal xorg

# Set the default session for NoMachine
# Create or edit /usr/NX/etc/node.cfg
```

Configure NoMachine to use Xfce:

```bash
# Edit the NoMachine node configuration
sudo tee /usr/NX/etc/node.cfg.d/desktop.cfg <<'EOF'
# Use Xfce as the virtual desktop
DefaultDesktopCommand "/usr/bin/startxfce4"
EOF

# Restart NoMachine to apply
sudo systemctl restart nxserver
```

## Server Configuration

The main configuration file is at `/usr/NX/etc/server.cfg`:

```bash
# View important settings
grep -E "^(Port|NXPort|SSHPort|EnableNetworkAdaptation|AcceptedAuthenticationMethods)" \
    /usr/NX/etc/server.cfg
```

Common settings to adjust:

```bash
# /usr/NX/etc/server.cfg
# (NoMachine uses its own config format - use nxserver commands to change settings)

# Change the listening port (default 4000)
sudo /usr/NX/bin/nxserver --changepassword

# List current configuration
sudo /usr/NX/bin/nxserver --status
sudo /usr/NX/bin/nxserver --list
```

### Enable SSH-Based Authentication

NoMachine can authenticate using your system SSH keys, which is more secure than password authentication:

```bash
# Check authentication methods
grep "AcceptedAuthenticationMethods" /usr/NX/etc/server.cfg

# NX authentication is the default - it uses system passwords
# SSH key authentication is also supported via the SSH subsystem
```

## Installing the NoMachine Client

On the machine you are connecting from:

1. Go to https://www.nomachine.com/download
2. Download the client for your operating system (Windows, macOS, or Linux)
3. Install and launch

### Client Connection Steps

1. Click "Add" to create a new connection
2. Protocol: NX (default)
3. Host: your server's IP or hostname
4. Port: 4000 (or your custom port)
5. Authentication: Password (or key)
6. Click Connect
7. Enter your Ubuntu username and password
8. Choose to connect to the existing physical desktop or create a virtual desktop

## SSH Tunneling for Security

For connecting over the internet, tunnel NoMachine through SSH rather than exposing port 4000:

```bash
# On the client machine, create an SSH tunnel
# This forwards local port 4444 to remote port 4000 through SSH
ssh -L 4444:localhost:4000 -N -f user@your-server-ip

# Then in NoMachine client:
# Host: localhost
# Port: 4444
```

Or use NoMachine's built-in SSH tunneling:

In the NoMachine client, when creating a connection:
- Protocol: NX over SSH
- Host: your server IP
- Port: 22 (SSH port)

This automatically tunnels the NX traffic through SSH.

## Performance Tuning

NoMachine adapts to connection quality automatically, but you can tune it further:

### On the Server

```bash
# The node.cfg controls performance settings
sudo nano /usr/NX/etc/node.cfg
```

Key performance settings:

```ini
# Maximum bandwidth NoMachine will use (in KB/s)
# 0 means unlimited
BandwidthThrottling 0

# Enable adaptive JPEG quality
AdaptiveJPEGQuality 1

# Cache size in MB
CacheSize 256
```

### On the Client

In the NoMachine client connection settings:
- Display settings: "Use default settings" for most connections
- For slow connections: Enable "Best quality" reduction (more compression, less bandwidth)
- For LAN: "Best speed" or "Unlimited" quality

## Session Management

```bash
# List active NoMachine sessions
sudo /usr/NX/bin/nxserver --list

# Terminate a specific session
sudo /usr/NX/bin/nxserver --terminate <session-id>

# Disconnect (not terminate) a session - it stays running on the server
# User can reconnect to the same session later
```

NoMachine's ability to reconnect to a running session (like tmux for graphical sessions) is one of its best features. Start work on one machine, disconnect, and reconnect from another device to the same session exactly where you left it.

## Enabling Multi-User Sessions

By default, multiple users can each have their own virtual sessions:

```bash
# Check how many concurrent sessions are allowed
grep "MaxSessions" /usr/NX/etc/server.cfg

# The free version allows up to 4 users
# The check is done when a session is created
```

## Automatic Resolution and DPI

NoMachine automatically adjusts resolution to match the client display. For HiDPI displays:

```bash
# Force a specific resolution for virtual desktops
# In /usr/NX/etc/node.cfg
# DefaultDisplayGeometry 1920x1080
```

## Troubleshooting

```bash
# View NoMachine logs
sudo tail -f /usr/NX/var/log/nxserver.log

# Check service status
sudo systemctl status nxserver nxnode nxd

# Restart all NoMachine services
sudo systemctl restart nxserver

# Test that NoMachine is listening
ss -tlnp | grep 4000

# Check for desktop environment issues
# (Virtual desktop creation fails if Xorg or the WM is misconfigured)
sudo /usr/NX/bin/nxserver --restart
cat /usr/NX/var/log/nxnode.log | tail -50
```

## Uninstalling NoMachine

```bash
# Remove NoMachine
sudo dpkg -r nomachine

# Or purge completely
sudo dpkg -P nomachine
```

NoMachine is one of the better remote desktop solutions for Ubuntu. The free version is feature-complete for most single-user or small team scenarios. For production deployments with many users, evaluate whether the enterprise version's session management features are worth the cost compared to alternatives like Apache Guacamole for browser-based access.
