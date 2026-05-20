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
# SSHFS umask for client-side folder sharing
# umask="0117"

[limit groups]
# Limit members of a group to one simultaneous x2go session
# x2gogroup=1

[x2goagent]
# Randomize tunnel ports used by x2goagent
port_randomization="pure-random"

[log]
# possible levels: emerg, alert, crit, err, warning, notice, info, debug
loglevel=notice
```

### Configure SSH for x2go

x2go requires SSH login and TCP forwarding. If you have hardened SSH, verify `/etc/ssh/sshd_config` has not disabled forwarding:

```bash
sudo grep -E "AllowTcpForwarding" /etc/ssh/sshd_config
```

Add or ensure this line exists:

```bash
sudo nano /etc/ssh/sshd_config
```

```text
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

x2go Client for macOS requires XQuartz. Install XQuartz first if it is not already installed:

```bash
brew install --cask xquartz
```

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

The session type is normally selected in the x2go client profile. If you use an Xsession/custom desktop profile and want a user-level startup script, x2goserver-xsession reads `~/.xsession-x2go`:

Create a user-level Xsession configuration:

```bash
cat > ~/.xsession-x2go << 'EOF'
#!/bin/bash
export DESKTOP_SESSION=xfce
exec xfce4-session
EOF
chmod +x ~/.xsession-x2go
```

## Shared Folders (Shared Desktop)

x2go supports mounting local folders in the remote session. In the x2go client:

1. Go to session settings
2. Click "Shared Folders" tab
3. Add local directories to share

In the x2go session, shared folders are mounted under `~/media/disk/`.

## Multiple Sessions and Session Resumption

A key x2go feature is session persistence - you can disconnect from a session and reconnect to it later, finding all your applications exactly where you left them.

```bash
# List running x2go sessions
x2golistsessions

# Kill a specific session
x2goterminate-session SESSION_ID
```

Sessions persist until explicitly terminated or the server restarts (unless you configure otherwise).

## x2go Desktop Sharing (Shadow Sessions)

To connect to an existing local X11 desktop instead of starting a new x2go desktop session, install the desktop sharing component:

```bash
sudo apt install x2goserver-desktopsharing
```

Start `x2godesktopsharing` inside the desktop you want to share, enable sharing from its tray icon, then create a client session with Session Type set to "Connect to local desktop".

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

### Adjust NX Compression

NX cache settings are negotiated by the client and x2go server. To tune performance, change the connection speed and compression method in the x2go client session settings rather than adding unsupported `cacheSize` settings to `x2goserver.conf`.

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

# Restrict SSH login to members of this group
sudo nano /etc/ssh/sshd_config
```

```text
AllowGroups x2gousers
```

```bash
sudo systemctl reload ssh
```

## Troubleshooting

**Black screen after connecting:**

This usually indicates the session type doesn't match the installed desktop environment.

```bash
# Check if XFCE is properly installed
which xfce4-session

# Check that the x2go XFCE command target exists
ls -l /usr/bin/xfce4-session
```

**Session dies immediately:**

```bash
# Check x2go messages in syslog
sudo journalctl -t x2goserver -t x2goruncommand -t x2gostartagent -f

# Check user session log (in home directory after an attempt)
cat ~/.x2go/C-$USER-*/session.log
```

**Slow performance:**

- Check network bandwidth with `iperf3`
- Lower JPEG quality in client settings
- Disable compositing in XFCE
- Try a different compression method in the client settings

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
