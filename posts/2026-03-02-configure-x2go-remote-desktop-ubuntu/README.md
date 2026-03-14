# How to Configure x2go for Remote Desktop on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, X2go, Remote Desktop, XFCE, SSH

Description: Set up x2go server on Ubuntu to provide fast, SSH-tunneled remote desktop sessions, ideal for running graphical applications over low-bandwidth connections.

---

x2go is a remote desktop solution that runs graphical sessions over SSH. Unlike VNC which transmits the full screen framebuffer, x2go uses the NX protocol to compress and transmit only screen changes, making it significantly more efficient over slow or high-latency connections. All traffic is encrypted through SSH, with no need for additional SSL configuration.

x2go is particularly useful for running desktop applications on Ubuntu servers - you get a responsive graphical session without the bandwidth overhead of a full VNC setup.

## Installing x2go Server

The x2go project maintains its own PPA for Ubuntu:

```bash
# Add the x2go PPA
sudo apt-add-repository ppa:x2go/stable
sudo apt update

# Install x2go server
sudo apt install x2goserver x2goserver-xsession

# Verify installation
sudo systemctl status x2goserver
```

x2go sessions run over SSH, so the SSH server must be running:

```bash
sudo systemctl status ssh
# If not installed: sudo apt install openssh-server
```

## Installing a Desktop Environment

x2go works best with lightweight desktop environments. XFCE is the most reliable choice:

```bash
# XFCE (recommended)
sudo apt install xfce4 xfce4-goodies

# LXDE (very lightweight)
sudo apt install lxde

# MATE (for a more traditional desktop)
sudo apt install ubuntu-mate-desktop
```

Do NOT install Ubuntu's default GNOME desktop for x2go - it doesn't work well with x2go due to compositing. Stick with XFCE, LXDE, or MATE.

## Configuring x2go Server

The server configuration is at `/etc/x2go/x2goserver.conf`:

```bash
sudo nano /etc/x2go/x2goserver.conf
```

```ini
[security]
# Restrict x2go to a specific group (optional)
# AllowedUsers = x2gogroup

[nxserver]
# NX server configuration
nxport = 4000  # Not directly exposed - x2go uses SSH tunneling

[logfile]
logfile = /var/log/x2goserver.log
```

### Configure SSH for x2go

x2go requires some SSH settings. Verify `/etc/ssh/sshd_config` has:

```bash
sudo grep -E "X11Forwarding|AllowTcpForwarding" /etc/ssh/sshd_config
```

Add or ensure these lines exist:

```bash
sudo nano /etc/ssh/sshd_config
```

```text
# x2go requires X11 forwarding
X11Forwarding yes
AllowTcpForwarding yes
```

```bash
sudo systemctl reload ssh
```

## Installing x2go Client

On the machine you'll connect **from**, install the x2go client:

### Linux Client

```bash
sudo apt-add-repository ppa:x2go/stable
sudo apt update
sudo apt install x2goclient
```

### Windows Client

Download from https://wiki.x2go.org/doku.php/doc:installation:x2goclient

### macOS Client

```bash
brew install --cask x2goclient
```

## Connecting with x2go Client

Open the x2go client and create a new session:

1. Click "New Session" or the + button
2. Configure:
   - **Session Name**: Any label (e.g., "Ubuntu Server")
   - **Host**: Your server's IP or hostname
   - **Login**: Your Ubuntu username
   - **SSH Port**: 22 (or your custom SSH port)
   - **Session Type**: Select "XFCE" from the dropdown
3. Under Connection tab: select your connection speed (LAN, ADSL, etc.)
4. Click OK, then click your session to connect

x2go will prompt for your SSH password (or use your SSH key if configured).

## SSH Key Authentication

Using SSH keys with x2go avoids password prompts:

```bash
# On the client machine, generate a key if you don't have one
ssh-keygen -t ed25519 -C "x2go-client"

# Copy the key to the server
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@your-server-ip
```

In the x2go client session settings, under SSH, point to your private key file.

## Configuring Default Session Type

For headless Ubuntu servers where you always want XFCE sessions:

Create a user-level autostart configuration:

```bash
mkdir -p ~/.config/x2go

# Set default session type
cat > ~/.x2gosession << 'EOF'
#!/bin/bash
export DESKTOP_SESSION=xfce
startxfce4
EOF
chmod +x ~/.x2gosession
```

## Shared Folders (Shared Desktop)

x2go supports mounting local folders in the remote session. In the x2go client:

1. Go to session settings
2. Click "Shared Folders" tab
3. Add local directories to share

In the x2go session, the folder appears under the session's "Shared Folders" in the file manager.

## Multiple Sessions and Session Resumption

A key x2go feature is session persistence - you can disconnect from a session and reconnect to it later, finding all your applications exactly where you left them.

```bash
# List running x2go sessions
x2golistsessions

# Kill a specific session
x2goterminate-session SESSION_ID
```

Sessions persist until explicitly terminated or the server restarts (unless you configure otherwise).

## x2go with Persistent Virtual Desktop

For a persistent virtual display that multiple users can access:

```bash
# Install virtual framebuffer
sudo apt install xvfb

# Start a persistent XFCE session on display :1
Xvfb :1 -screen 0 1920x1080x24 &
DISPLAY=:1 startxfce4 &

# x2go can then shadow this display
```

## Performance Tuning

### Connection Quality Settings

In the x2go client session settings, under Connection:
- **LAN**: Use highest quality, JPEG quality 9
- **ADSL/Cable**: Medium compression
- **Modem**: Maximum compression, lower JPEG quality

These settings control how aggressively NX compresses screen updates.

### Server-Side Optimization

```bash
# Disable visual effects in XFCE for better remote performance
# Settings Manager -> Window Manager Tweaks -> Compositor
# Uncheck "Enable display compositing"
```

Compositing effects consume extra bandwidth. Disabling them significantly improves remote session performance.

### Adjust NX Cache Size

```bash
sudo nano /etc/x2go/x2goserver.conf
```

```ini
[nxproxy]
# Increase cache for better image caching (in KB)
cacheSize = 16384
```

## Audio Support

x2go supports audio forwarding using PulseAudio:

```bash
# On the server, install pulseaudio
sudo apt install pulseaudio pulseaudio-utils

# x2go client has built-in audio support
# Enable in session settings: Input/Output -> Audio
```

Audio from server applications plays on your local client's speakers.

## Clipboard Integration

Clipboard sharing between local and remote session is built into x2go. It works automatically - copy in the remote session, paste locally, and vice versa.

## Firewall Configuration

x2go only needs SSH port open - everything tunnels through SSH:

```bash
# Only port 22 needs to be accessible
sudo ufw allow ssh
sudo ufw status
```

No additional ports need to be exposed, which is a significant security advantage over VNC.

## Restricting Access to Specific Users

Create a group for x2go users:

```bash
sudo groupadd x2gousers
sudo usermod -aG x2gousers username

# Restrict x2go to members of this group
sudo nano /etc/x2go/x2goserver.conf
```

```ini
[security]
AllowedUsers = @x2gousers
```

## Troubleshooting

**Black screen after connecting:**

This usually indicates the session type doesn't match the installed desktop environment.

```bash
# Check if XFCE is properly installed
which startxfce4

# Test starting XFCE locally
DISPLAY=:0 startxfce4
```

**Session dies immediately:**

```bash
# Check x2go server logs
sudo tail -f /var/log/x2goserver.log

# Check user session log (in home directory after an attempt)
cat ~/.x2go/C-$USER-*/session.log
```

**Slow performance:**

- Check network bandwidth with `iperf3`
- Lower JPEG quality in client settings
- Disable compositing in XFCE
- Increase NX cache size in server config

**Connection refused:**

```bash
# Verify SSH is running
sudo systemctl status ssh

# Verify x2go server is installed correctly
x2golistsessions
```

## x2go vs VNC Comparison

| Feature | x2go | VNC |
|---------|------|-----|
| Encryption | Built-in (SSH) | Add-on (SSH tunnel) |
| Bandwidth | Low (NX compression) | High (framebuffer) |
| Session persistence | Yes | Depends on config |
| Low-bandwidth performance | Excellent | Poor |
| Multi-monitor support | Yes | Limited |
| Audio forwarding | Yes | Limited |

## Summary

x2go provides an efficient, secure remote desktop solution for Ubuntu servers. The NX protocol's compression makes it practical over connections where VNC is unusable, and the SSH-based encryption requires no additional certificate setup. For sysadmins who need occasional GUI access to Ubuntu servers - whether to run graphical tools, debug GUI applications, or provide desktop environments to users - x2go hits a good balance of performance, security, and simplicity.
