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

Configure NoMachine to use Xfce by adding the `DefaultDesktopCommand` directive to the node configuration:

```bash
# Append the directive to /usr/NX/etc/node.cfg
echo 'DefaultDesktopCommand "/usr/bin/startxfce4"' | sudo tee -a /usr/NX/etc/node.cfg

# Changes to DefaultDesktopCommand take effect on the next session,
# so a service restart is not required.
```

## Server Configuration

The main configuration file is at `/usr/NX/etc/server.cfg`:

```bash
# View important settings
grep -E "^(Port|NXPort|SSHPort|EnableNetworkAdaptation|AcceptedAuthenticationMethods)" \
    /usr/NX/etc/server.cfg
```

Common operations:

```bash
# Change the listening port: uncomment and edit the NXPort key in
# /usr/NX/etc/server.cfg, then restart the server
sudo sed -i 's/^#\?NXPort.*/NXPort 4000/' /usr/NX/etc/server.cfg
sudo /usr/NX/bin/nxserver --restart

# Set a NoMachine password for an existing system user
sudo /usr/NX/bin/nxserver --passwd <username>

# Check server status and list running sessions
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

Useful node.cfg keys for tuning:

```ini
# Limit the server-side frame rate (frames per second). Lowering this
# reduces bandwidth on slow links. Default is unset (no limit).
DisplayServerVideoFrameRate 30

# Force the server to honor the frame rate cap above.
DisplayServerUseVideoFrameRate 1

# Pass extra options to the NX display server (e.g. to tune encoding).
# See "DisplayServerExtraOptions" in the NoMachine KB for accepted values.
# DisplayServerExtraOptions ""
```

NoMachine recommends leaving these at their defaults unless you know what you are changing - see [The server.cfg and node.cfg files explained](https://kb.nomachine.com/AR02N00877) for the authoritative reference.

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

Concurrent connections to the server are governed by the `ConnectionsLimit` key in `server.cfg` (and `ConnectionsUserLimit` for the per-user cap). Since NoMachine 7.6.2 these default to `0`, which means unlimited:

```bash
# Check the current limits (a value of 0 means unlimited)
grep -E "^(ConnectionsLimit|ConnectionsUserLimit|VirtualDesktopsLimit|VirtualDesktopsUserLimit)" \
    /usr/NX/etc/server.cfg
```

Note that the NoMachine Free Edition itself is licensed for personal use and accepts only one remote connection at a time. To support multiple concurrent users you need an Enterprise/Workstation license, even though the config keys above accept higher values.

## Automatic Resolution and DPI

NoMachine automatically adjusts resolution to match the client display. To force a specific resolution for the headless display that NoMachine creates on a server without a monitor, set the following keys in `/usr/NX/etc/node.cfg`:

```ini
# Create a virtual display when no physical one is attached
CreateDisplay 1

# Resolution for that virtual display, in WxH format (default 800x600)
DisplayGeometry 1920x1080
```

## Troubleshooting

```bash
# View NoMachine logs
sudo tail -f /usr/NX/var/log/nxserver.log

# Check service status (nxserver is the only systemd unit;
# the nxnode and nxd daemons are managed internally by nxserver)
sudo systemctl status nxserver

# Restart all NoMachine services
sudo /usr/NX/bin/nxserver --restart

# Test that NoMachine is listening
ss -tlnp | grep 4000

# Check for desktop environment issues
# (Virtual desktop creation fails if Xorg or the WM is misconfigured)
sudo tail -50 /usr/NX/var/log/nxnode.log
```

## Uninstalling NoMachine

```bash
# Remove NoMachine
sudo dpkg -r nomachine

# Or purge completely
sudo dpkg -P nomachine
```

NoMachine is one of the better remote desktop solutions for Ubuntu. The free version is feature-complete for most single-user or small team scenarios. For production deployments with many users, evaluate whether the enterprise version's session management features are worth the cost compared to alternatives like Apache Guacamole for browser-based access.
