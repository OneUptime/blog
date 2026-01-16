# How to Set Up Remote Desktop with XRDP on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, XRDP, Remote Desktop, RDP, Tutorial

Description: Complete guide to setting up XRDP server for Windows-compatible remote desktop on Ubuntu.

---

Remote desktop access is essential for managing servers, accessing workstations remotely, and providing support. XRDP brings the familiar Windows Remote Desktop Protocol (RDP) to Linux, allowing you to connect from any RDP client. This guide covers everything from basic installation to advanced multi-user configurations.

## Understanding XRDP

XRDP is an open-source implementation of Microsoft's Remote Desktop Protocol (RDP) server. It allows Windows, macOS, and Linux clients to connect to a Linux desktop using standard RDP clients like Microsoft Remote Desktop, Remmina, or FreeRDP.

### How XRDP Works

XRDP operates as a bridge between RDP clients and Linux display servers:

1. **Client Connection**: An RDP client connects to port 3389 on the Ubuntu server
2. **Authentication**: XRDP authenticates the user against PAM (Pluggable Authentication Modules)
3. **Session Creation**: XRDP spawns an Xvnc or Xorg session for the user
4. **Protocol Translation**: RDP commands are translated to X11 display commands
5. **Bidirectional Communication**: Screen updates, keyboard, and mouse events flow between client and server

### Key Components

- **xrdp**: The main RDP server daemon that handles client connections
- **xrdp-sesman**: Session manager that handles authentication and session spawning
- **Xvnc/Xorg**: Backend display servers that render the desktop
- **xrdp-chansrv**: Channel server for clipboard, audio, and drive redirection

## Installing XRDP

XRDP is available in Ubuntu's default repositories. Here's how to install it along with the necessary components.

### Basic Installation

```bash
# Update package lists to ensure we get the latest version
sudo apt update

# Install XRDP and the session manager
# This pulls in all necessary dependencies automatically
sudo apt install xrdp -y

# Verify installation by checking the version
xrdp --version
```

### Enable and Start the Service

```bash
# Enable XRDP to start automatically on boot
# This creates the necessary systemd symlinks
sudo systemctl enable xrdp

# Start the XRDP service immediately
sudo systemctl start xrdp

# Verify the service is running correctly
# Look for "active (running)" in the output
sudo systemctl status xrdp
```

### Add XRDP User to SSL Group

XRDP needs access to SSL certificates for encrypted connections:

```bash
# Add xrdp user to ssl-cert group for certificate access
# This is required for TLS encryption to work properly
sudo usermod -a -G ssl-cert xrdp

# Restart XRDP to apply the group membership change
sudo systemctl restart xrdp
```

## Basic Configuration

The main XRDP configuration files are located in `/etc/xrdp/`. Let's examine and customize the key settings.

### Main Configuration File

The primary configuration file `/etc/xrdp/xrdp.ini` controls server behavior:

```bash
# Create a backup before making changes
sudo cp /etc/xrdp/xrdp.ini /etc/xrdp/xrdp.ini.backup

# Open the configuration file for editing
sudo nano /etc/xrdp/xrdp.ini
```

Key settings to review in `/etc/xrdp/xrdp.ini`:

```ini
[Globals]
; Address to listen on - 0.0.0.0 means all interfaces
; For security, consider binding to specific IP if possible
address=0.0.0.0

; Default RDP port - standard is 3389
; Change this if you want security through obscurity (not recommended as sole measure)
port=3389

; Maximum bits per pixel for color depth
; 32 provides best quality but uses more bandwidth
; 16 is a good balance for slower connections
max_bpp=32

; Enable font smoothing (ClearType) for better text rendering
; Increases bandwidth usage slightly but improves readability
xserverbpp=24

; Security layer options: tls, rdp, negotiate
; Always use tls for production environments
security_layer=tls

; Cryptographic settings for security
; These are defaults - don't lower them
crypt_level=high

; Certificate and key paths for TLS
; These are auto-generated during installation
certificate=/etc/xrdp/cert.pem
key_file=/etc/xrdp/key.pem

; Session settings
; fork=yes creates separate process for each connection (recommended)
fork=yes

; Logging level: DEBUG, INFO, WARNING, ERROR
; Use INFO for production, DEBUG for troubleshooting
LogLevel=INFO
```

### Session Manager Configuration

The session manager (`/etc/xrdp/sesman.ini`) controls authentication and session handling:

```ini
[Globals]
; Listen address for session manager
; 127.0.0.1 means only local connections (from xrdp daemon)
ListenAddress=127.0.0.1

; Port for session manager communication
ListenPort=3350

; Allow root login - disable for security
; Users should use sudo instead of logging in as root
AllowRootLogin=false

; Maximum concurrent sessions
; Adjust based on your server's RAM (each session uses ~200-500MB)
MaxSessions=50

; Kill disconnected sessions after timeout (seconds)
; 0 means sessions persist until manually closed
KillDisconnected=false
DisconnectedTimeLimit=0

; Idle session timeout (seconds)
; Sessions with no activity will be terminated
; 0 disables idle timeout
IdleTimeLimit=0

[Security]
; Allow any user to connect (subject to PAM authentication)
AllowAnyUser=true

; PAM service name for authentication
PAMServiceName=xrdp-sesman

[Sessions]
; Session types available to users
; Xorg provides better performance than Xvnc
X11DisplayOffset=10
MaxDisplayLimit=99
```

## Desktop Environment Setup

XRDP needs a desktop environment to display. Ubuntu Server typically doesn't include one, and Ubuntu Desktop may have compatibility issues with the default GNOME session.

### Option 1: XFCE (Recommended for Remote Sessions)

XFCE is lightweight and works flawlessly with XRDP:

```bash
# Install XFCE desktop environment
# This is lightweight (~500MB) and fast over remote connections
sudo apt install xfce4 xfce4-goodies -y

# Configure XRDP to use XFCE for your user
# This creates a session startup script in your home directory
echo "xfce4-session" > ~/.xsession

# Make the session file readable
chmod +x ~/.xsession
```

### Option 2: Ubuntu GNOME Desktop

If you prefer GNOME, additional configuration is needed:

```bash
# Install Ubuntu desktop (full GNOME environment)
# Warning: This downloads ~2GB of packages
sudo apt install ubuntu-desktop -y

# Create session configuration for GNOME
# The D-Bus launch is required for GNOME to work properly with XRDP
cat > ~/.xsessionrc << 'EOF'
# Set up environment variables for GNOME session
export GNOME_SHELL_SESSION_MODE=ubuntu
export XDG_CURRENT_DESKTOP=ubuntu:GNOME
export XDG_SESSION_DESKTOP=ubuntu
export XDG_CONFIG_DIRS=/etc/xdg/xdg-ubuntu:/etc/xdg
EOF

# Configure the session startup
echo "gnome-session" > ~/.xsession
chmod +x ~/.xsession
```

### Option 3: KDE Plasma

For those who prefer KDE:

```bash
# Install KDE Plasma desktop
# This is heavier than XFCE but lighter than full Kubuntu
sudo apt install kde-plasma-desktop -y

# Configure XRDP to use KDE Plasma
echo "startplasma-x11" > ~/.xsession
chmod +x ~/.xsession
```

### System-Wide Desktop Configuration

To set a default desktop for all users:

```bash
# Create a system-wide startwm script
# This file is executed when a user connects without a personal .xsession
sudo nano /etc/xrdp/startwm.sh
```

Replace the contents with:

```bash
#!/bin/sh
# /etc/xrdp/startwm.sh - XRDP session startup script
# This script is executed when a user connects via RDP

# Unset problematic session variables that can cause issues
# These are set by the user's local session and conflict with XRDP
unset DBUS_SESSION_BUS_ADDRESS
unset XDG_RUNTIME_DIR

# Load user's shell profile for environment variables
if [ -r /etc/profile ]; then
    . /etc/profile
fi

# Check if user has a personal session preference
if [ -r ~/.xsession ]; then
    # Execute user's custom session
    . ~/.xsession
    exit 0
fi

# Default to XFCE if no user preference is set
# Change this to your preferred desktop environment
exec startxfce4
```

Make the script executable:

```bash
# Ensure the startwm script has execute permissions
sudo chmod +x /etc/xrdp/startwm.sh

# Restart XRDP to apply changes
sudo systemctl restart xrdp
```

## Security Configuration (SSL/TLS)

Securing XRDP connections is critical, especially when accessible over the internet.

### Generate Custom SSL Certificates

The default self-signed certificate works but generates browser warnings. For production, use proper certificates:

```bash
# Create directory for certificates
sudo mkdir -p /etc/xrdp/certs

# Generate a new RSA private key (4096-bit for strong security)
# This key should be kept secure and never shared
sudo openssl genrsa -out /etc/xrdp/certs/xrdp.key 4096

# Set restrictive permissions on the private key
# Only root and xrdp should be able to read this file
sudo chmod 600 /etc/xrdp/certs/xrdp.key

# Generate a self-signed certificate valid for 365 days
# For production, replace with a certificate from a trusted CA
sudo openssl req -new -x509 \
    -key /etc/xrdp/certs/xrdp.key \
    -out /etc/xrdp/certs/xrdp.crt \
    -days 365 \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=$(hostname -f)"
```

### Configure XRDP to Use Custom Certificates

Update `/etc/xrdp/xrdp.ini`:

```bash
# Edit the main configuration file
sudo nano /etc/xrdp/xrdp.ini
```

Update the certificate paths in the `[Globals]` section:

```ini
[Globals]
; Use custom certificates instead of defaults
certificate=/etc/xrdp/certs/xrdp.crt
key_file=/etc/xrdp/certs/xrdp.key

; Enforce TLS security
; 'negotiate' allows fallback but 'tls' is more secure
security_layer=tls

; Set high encryption level
crypt_level=high

; TLS cipher suites - use strong ciphers only
; This disables weak ciphers like RC4 and DES
ssl_protocols=TLSv1.2, TLSv1.3
```

### Using Let's Encrypt Certificates

For public-facing servers, use free Let's Encrypt certificates:

```bash
# Install certbot for Let's Encrypt certificate management
sudo apt install certbot -y

# Obtain a certificate (requires port 80 to be accessible)
# Replace your-domain.com with your actual domain
sudo certbot certonly --standalone -d your-domain.com

# Create symlinks to the Let's Encrypt certificates
sudo ln -sf /etc/letsencrypt/live/your-domain.com/fullchain.pem /etc/xrdp/certs/xrdp.crt
sudo ln -sf /etc/letsencrypt/live/your-domain.com/privkey.pem /etc/xrdp/certs/xrdp.key

# Grant XRDP access to the certificates
sudo chmod 750 /etc/letsencrypt/live/
sudo chmod 750 /etc/letsencrypt/archive/
sudo chgrp -R ssl-cert /etc/letsencrypt/
sudo usermod -a -G ssl-cert xrdp
```

Create a renewal hook to restart XRDP:

```bash
# Create post-renewal hook script
sudo nano /etc/letsencrypt/renewal-hooks/post/restart-xrdp.sh
```

Add the following content:

```bash
#!/bin/bash
# Restart XRDP after certificate renewal to use new certificates
systemctl restart xrdp
```

Make it executable:

```bash
sudo chmod +x /etc/letsencrypt/renewal-hooks/post/restart-xrdp.sh
```

## Firewall Setup

Proper firewall configuration is essential for security.

### Using UFW (Uncomplicated Firewall)

```bash
# Enable UFW if not already enabled
sudo ufw enable

# Allow SSH first to avoid being locked out
# IMPORTANT: Do this before enabling the firewall if connecting remotely
sudo ufw allow ssh

# Allow RDP connections on the default port
# This opens port 3389 for TCP connections
sudo ufw allow 3389/tcp comment 'XRDP Remote Desktop'

# For more security, restrict to specific IP ranges
# Replace with your actual allowed IP range
sudo ufw allow from 192.168.1.0/24 to any port 3389 proto tcp comment 'XRDP from local network'

# Verify the rules are applied
sudo ufw status verbose
```

### Using iptables Directly

For more granular control:

```bash
# Allow established connections (required for responses)
sudo iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow RDP from specific subnet only
# This is more secure than allowing from anywhere
sudo iptables -A INPUT -p tcp --dport 3389 -s 192.168.1.0/24 -j ACCEPT

# Drop all other RDP connection attempts
# Log them first for monitoring and security auditing
sudo iptables -A INPUT -p tcp --dport 3389 -j LOG --log-prefix "XRDP blocked: "
sudo iptables -A INPUT -p tcp --dport 3389 -j DROP

# Save rules to persist across reboots (Ubuntu/Debian)
sudo apt install iptables-persistent -y
sudo netfilter-persistent save
```

### Rate Limiting to Prevent Brute Force

```bash
# Limit new connections to prevent brute force attacks
# This allows only 3 new connections per minute per IP
sudo iptables -A INPUT -p tcp --dport 3389 -m state --state NEW \
    -m recent --set --name XRDP

sudo iptables -A INPUT -p tcp --dport 3389 -m state --state NEW \
    -m recent --update --seconds 60 --hitcount 4 --name XRDP -j DROP
```

## Connecting from Windows/macOS/Linux

### Connecting from Windows

Windows includes a built-in RDP client:

1. Press `Win + R` to open the Run dialog
2. Type `mstsc` and press Enter
3. Enter the server IP address or hostname
4. Click "Show Options" for advanced settings:
   - **Display**: Adjust resolution and color depth
   - **Local Resources**: Configure clipboard, audio, and drives
   - **Experience**: Optimize for connection speed
5. Click "Connect" and enter your Ubuntu credentials

For better security, save connection settings to an `.rdp` file:

```
full address:s:your-server-ip
username:s:your-username
authentication level:i:2
prompt for credentials:i:1
negotiate security layer:i:1
enablecredsspsupport:i:0
```

### Connecting from macOS

Install Microsoft Remote Desktop from the App Store:

```bash
# Or install via Homebrew
brew install --cask microsoft-remote-desktop
```

Configuration steps:
1. Open Microsoft Remote Desktop
2. Click "Add PC"
3. Enter the PC name (server IP or hostname)
4. Configure user account (add or select)
5. Adjust display and device settings as needed
6. Save and double-click to connect

### Connecting from Linux

Use Remmina or FreeRDP:

```bash
# Install Remmina with RDP plugin (GUI client)
sudo apt install remmina remmina-plugin-rdp -y

# Or use FreeRDP for command-line access
sudo apt install freerdp2-x11 -y
```

Connect using FreeRDP from command line:

```bash
# Basic connection with specified resolution
# Replace values with your server details
xfreerdp /v:192.168.1.100 /u:username /size:1920x1080

# Connection with audio and clipboard redirection
xfreerdp /v:192.168.1.100 /u:username \
    /sound:sys:alsa \
    /clipboard \
    /size:1920x1080 \
    /bpp:32

# Connection with drive redirection (share local folder)
xfreerdp /v:192.168.1.100 /u:username \
    /drive:home,/home/localuser/shared \
    /clipboard
```

## Session Management

Managing XRDP sessions is important for multi-user environments and resource management.

### Listing Active Sessions

```bash
# Show all active XRDP sessions
# Displays session ID, user, and X display number
xrdp-seslist

# Alternative: Check running Xvnc/Xorg processes
ps aux | grep -E "Xvnc|Xorg" | grep -v grep

# Show session details using loginctl (systemd)
loginctl list-sessions
```

### Terminating Sessions

```bash
# Kill a specific session by session ID
# Find the session ID using xrdp-seslist first
sudo xrdp-sesadmin -u username -k

# Kill all sessions for a specific user
pkill -u username -f Xvnc

# Force terminate a stuck session by PID
# Use ps aux to find the PID first
sudo kill -9 <PID>
```

### Session Reconnection

XRDP supports session persistence - if a user disconnects, they can reconnect to the same session:

Configure session persistence in `/etc/xrdp/sesman.ini`:

```ini
[Sessions]
; Keep sessions alive when user disconnects
; Users can reconnect to their existing session
KillDisconnected=false

; Optional: Terminate disconnected sessions after timeout (seconds)
; Set to 0 for infinite persistence
DisconnectedTimeLimit=3600

; Idle timeout - terminate sessions with no activity
; 0 disables idle timeout
IdleTimeLimit=0

; Policy for session reconnection
; always = always reconnect to existing session
; never = always create new session
; ask = prompt user (not supported by all clients)
Policy=Default
```

### Session Limits Per User

Prevent resource exhaustion by limiting sessions:

```bash
# Edit PAM limits configuration
sudo nano /etc/security/limits.conf
```

Add limits:

```
# Limit maximum number of XRDP sessions per user
# Prevents a single user from consuming all resources
*               hard    maxlogins       2
@developers     hard    maxlogins       5
```

## Sound Redirection

Audio redirection allows you to hear sounds from the remote desktop on your local machine.

### Install PulseAudio Module

```bash
# Install PulseAudio XRDP module for audio support
# This enables bidirectional audio between client and server
sudo apt install pulseaudio-module-xrdp -y

# The installation should automatically configure PulseAudio
# If not, manually load the module
pulseaudio --check || pulseaudio --start
pactl load-module module-xrdp-sink
pactl load-module module-xrdp-source
```

### Configure PulseAudio for XRDP

Create a PulseAudio configuration for XRDP sessions:

```bash
# Create PulseAudio configuration directory
mkdir -p ~/.config/pulse

# Create default.pa for XRDP audio
cat > ~/.config/pulse/default.pa << 'EOF'
# PulseAudio configuration for XRDP sessions
# This file is loaded when PulseAudio starts in an XRDP session

# Load essential modules
.include /etc/pulse/default.pa

# Load XRDP sink and source modules
# These redirect audio to/from the RDP client
load-module module-xrdp-sink
load-module module-xrdp-source

# Set the XRDP sink as default output
set-default-sink xrdp-sink
set-default-source xrdp-source
EOF
```

### Verify Audio Redirection

```bash
# Check if XRDP audio modules are loaded
pactl list short sinks | grep xrdp

# Test audio output
speaker-test -t wav -c 2 -l 1

# Check audio input (microphone)
pactl list short sources | grep xrdp
```

### Client-Side Configuration

On Windows, audio redirection is enabled by default. For other clients:

**FreeRDP**:
```bash
# Enable audio with specific backend
xfreerdp /v:server /u:user /audio-mode:0 /sound:sys:pulse
```

**Remmina**: Enable "Sound" in the connection settings under "Advanced" tab.

## Drive Redirection

Drive redirection allows you to access local drives from the remote session.

### Enable Drive Redirection in XRDP

The channel server (`xrdp-chansrv`) handles drive redirection. Verify it's running:

```bash
# Check if channel server is running
ps aux | grep chansrv

# The chansrv should start automatically with each session
# If not, check the XRDP logs for errors
sudo journalctl -u xrdp -f
```

### Configure FUSE for Drive Mounting

XRDP uses FUSE (Filesystem in Userspace) to mount redirected drives:

```bash
# Install FUSE if not already installed
sudo apt install fuse -y

# Add users to the fuse group
# This allows them to mount FUSE filesystems
sudo usermod -a -G fuse $USER

# Configure FUSE to allow non-root users
sudo nano /etc/fuse.conf
```

Uncomment or add:

```
# Allow non-root users to mount FUSE filesystems
user_allow_other
```

### Accessing Redirected Drives

When connected with drive redirection enabled, drives appear in:

```bash
# Redirected drives are mounted under thinclient_drives
# The exact path depends on XRDP version and configuration
ls ~/thinclient_drives/

# Or check the FUSE mounts
mount | grep fuse

# Common mount points:
# ~/thinclient_drives/DRIVENAME
# /tmp/.xrdp-chansrv-<session>/drives/
```

### Client Configuration for Drive Redirection

**Windows (mstsc)**:
1. Click "Show Options" -> "Local Resources" tab
2. Click "More..." under "Local devices and resources"
3. Expand "Drives" and select drives to share

**FreeRDP**:
```bash
# Share specific drive
xfreerdp /v:server /u:user /drive:SharedDocs,/home/user/Documents

# Share entire home directory
xfreerdp /v:server /u:user /drive:home,/home/user

# Share multiple drives
xfreerdp /v:server /u:user \
    /drive:Documents,/home/user/Documents \
    /drive:Downloads,/home/user/Downloads
```

**Remmina**:
1. Edit connection -> "Advanced" tab
2. Set "Share folder" to the local path you want to share

## Multi-User Configuration

Setting up XRDP for multiple users requires careful resource management and access control.

### Create User Accounts

```bash
# Create a new user for RDP access
# -m creates home directory, -s sets default shell
sudo useradd -m -s /bin/bash rdpuser1

# Set password for the new user
sudo passwd rdpuser1

# Add user to necessary groups for desktop access
sudo usermod -a -G audio,video,plugdev,netdev rdpuser1
```

### Configure User-Specific Desktops

Each user can have their own desktop environment preference:

```bash
# As the new user, set up their session
sudo -u rdpuser1 bash -c 'echo "xfce4-session" > ~/.xsession'

# Or for different users, different desktops
sudo -u rdpuser2 bash -c 'echo "startplasma-x11" > ~/.xsession'
```

### Resource Limits for Multi-User

Configure system limits to prevent resource exhaustion:

```bash
# Edit limits configuration
sudo nano /etc/security/limits.d/xrdp-users.conf
```

Add limits:

```
# /etc/security/limits.d/xrdp-users.conf
# Resource limits for XRDP users

# Limit maximum processes per user (prevents fork bombs)
@rdpusers        soft    nproc           500
@rdpusers        hard    nproc           1000

# Limit maximum memory per user (in KB)
@rdpusers        soft    as              2097152
@rdpusers        hard    as              4194304

# Limit maximum number of open files
@rdpusers        soft    nofile          4096
@rdpusers        hard    nofile          8192

# Limit maximum number of logins per user
@rdpusers        hard    maxlogins       2
```

Create the rdpusers group and add users:

```bash
# Create group for RDP users
sudo groupadd rdpusers

# Add users to the group
sudo usermod -a -G rdpusers rdpuser1
sudo usermod -a -G rdpusers rdpuser2
```

### Session Management Script

Create a script to manage multi-user sessions:

```bash
# Create session management script
sudo nano /usr/local/bin/xrdp-sessions
```

Add the following:

```bash
#!/bin/bash
# /usr/local/bin/xrdp-sessions
# Script to manage XRDP sessions for administrators

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to list all sessions
list_sessions() {
    echo -e "${GREEN}Active XRDP Sessions:${NC}"
    echo "----------------------------------------"

    # Get session information from various sources
    echo -e "${YELLOW}Session Manager View:${NC}"
    xrdp-seslist 2>/dev/null || echo "No sessions found"

    echo ""
    echo -e "${YELLOW}System Sessions:${NC}"
    loginctl list-sessions --no-legend | while read session uid user seat tty; do
        if loginctl show-session "$session" -p Type 2>/dev/null | grep -q "x11"; then
            echo "Session: $session, User: $user, UID: $uid"
        fi
    done
}

# Function to show resource usage per session
show_resources() {
    echo -e "${GREEN}Resource Usage by User:${NC}"
    echo "----------------------------------------"

    # Get users with active Xvnc or Xorg sessions
    ps aux | grep -E "Xvnc|Xorg" | grep -v grep | while read line; do
        user=$(echo "$line" | awk '{print $1}')
        pid=$(echo "$line" | awk '{print $2}')
        cpu=$(echo "$line" | awk '{print $3}')
        mem=$(echo "$line" | awk '{print $4}')
        echo "User: $user, PID: $pid, CPU: ${cpu}%, MEM: ${mem}%"
    done
}

# Function to kill a user's sessions
kill_user_sessions() {
    local username=$1
    if [ -z "$username" ]; then
        echo -e "${RED}Error: Username required${NC}"
        exit 1
    fi

    echo -e "${YELLOW}Killing sessions for user: $username${NC}"
    pkill -u "$username" -f "Xvnc\|Xorg" && \
        echo -e "${GREEN}Sessions terminated${NC}" || \
        echo -e "${RED}No sessions found or error occurred${NC}"
}

# Main script logic
case "$1" in
    list)
        list_sessions
        ;;
    resources)
        show_resources
        ;;
    kill)
        kill_user_sessions "$2"
        ;;
    *)
        echo "Usage: $0 {list|resources|kill <username>}"
        echo ""
        echo "Commands:"
        echo "  list      - List all active XRDP sessions"
        echo "  resources - Show resource usage per session"
        echo "  kill      - Kill all sessions for a specific user"
        exit 1
        ;;
esac
```

Make it executable:

```bash
sudo chmod +x /usr/local/bin/xrdp-sessions
```

## Troubleshooting

Common issues and their solutions.

### Black Screen After Connection

This is the most common issue, usually caused by desktop environment problems:

```bash
# Check XRDP logs for errors
sudo journalctl -u xrdp -n 50

# Check session manager logs
sudo journalctl -u xrdp-sesman -n 50

# Verify .xsession file exists and is correct
cat ~/.xsession

# Check if the desktop environment is installed
which startxfce4  # For XFCE
which gnome-session  # For GNOME

# Fix common GNOME issues by creating proper session file
cat > ~/.xsessionrc << 'EOF'
export GNOME_SHELL_SESSION_MODE=ubuntu
export XDG_CURRENT_DESKTOP=ubuntu:GNOME
export XDG_SESSION_DESKTOP=ubuntu
export XDG_CONFIG_DIRS=/etc/xdg/xdg-ubuntu:/etc/xdg
EOF
```

### Authentication Failures

```bash
# Check PAM configuration
cat /etc/pam.d/xrdp-sesman

# Verify user exists and password is set
id username
sudo passwd -S username

# Check for SELinux or AppArmor blocking
sudo aa-status  # AppArmor
sudo sestatus   # SELinux (if installed)

# Review auth logs
sudo tail -f /var/log/auth.log
```

### Connection Refused or Timeout

```bash
# Verify XRDP is running
sudo systemctl status xrdp

# Check if port 3389 is listening
sudo ss -tlnp | grep 3389
# Or
sudo netstat -tlnp | grep 3389

# Verify firewall rules
sudo ufw status
# Or
sudo iptables -L -n | grep 3389

# Test local connection first
xfreerdp /v:127.0.0.1 /u:$USER

# Check for port conflicts
sudo lsof -i :3389
```

### Session Disconnects Unexpectedly

```bash
# Check system logs for OOM killer or resource issues
sudo dmesg | tail -50
sudo journalctl -xe

# Monitor resource usage during session
top -u $USER

# Check XRDP session manager logs
sudo tail -f /var/log/xrdp-sesman.log

# Increase log verbosity for debugging
# Edit /etc/xrdp/xrdp.ini and set:
# LogLevel=DEBUG
sudo systemctl restart xrdp
```

### Slow Performance

```bash
# Check network latency
ping -c 10 server-ip

# Reduce color depth for better performance
# On client, set display to 16-bit color

# Use compression (FreeRDP)
xfreerdp /v:server /u:user /compression-level:2

# Check server load
uptime
free -h
df -h

# Monitor bandwidth usage
sudo apt install iftop -y
sudo iftop -i eth0
```

### Clipboard Not Working

```bash
# Check if chansrv is running
ps aux | grep chansrv

# Restart the channel server
pkill chansrv

# Verify clipboard is enabled in xrdp.ini
grep -i clipboard /etc/xrdp/xrdp.ini

# Check for xclip or xsel
sudo apt install xclip xsel -y
```

### Audio Not Working

```bash
# Verify PulseAudio module is installed
dpkg -l | grep pulseaudio-module-xrdp

# Check if module is loaded
pactl list short modules | grep xrdp

# Manually load the module
pulseaudio --kill
pulseaudio --start
pactl load-module module-xrdp-sink
pactl load-module module-xrdp-source

# Test audio
speaker-test -t wav -c 2
```

### Complete Diagnostic Script

Create a comprehensive diagnostic script:

```bash
# Create diagnostic script
sudo nano /usr/local/bin/xrdp-diagnose
```

Add the following:

```bash
#!/bin/bash
# /usr/local/bin/xrdp-diagnose
# XRDP diagnostic script for troubleshooting

echo "=========================================="
echo "XRDP Diagnostic Report"
echo "Generated: $(date)"
echo "=========================================="
echo ""

# Service Status
echo "=== Service Status ==="
systemctl is-active xrdp && echo "XRDP: Running" || echo "XRDP: NOT RUNNING"
systemctl is-active xrdp-sesman && echo "XRDP-Sesman: Running" || echo "XRDP-Sesman: NOT RUNNING"
echo ""

# Port Status
echo "=== Port Status ==="
ss -tlnp | grep -E "3389|3350" || echo "No XRDP ports found listening"
echo ""

# Process Status
echo "=== XRDP Processes ==="
ps aux | grep -E "xrdp|Xvnc|Xorg" | grep -v grep
echo ""

# Firewall Status
echo "=== Firewall Status ==="
if command -v ufw &> /dev/null; then
    sudo ufw status | grep 3389
else
    sudo iptables -L -n | grep 3389
fi
echo ""

# Configuration Check
echo "=== Configuration Files ==="
echo "xrdp.ini: $(test -f /etc/xrdp/xrdp.ini && echo 'EXISTS' || echo 'MISSING')"
echo "sesman.ini: $(test -f /etc/xrdp/sesman.ini && echo 'EXISTS' || echo 'MISSING')"
echo "startwm.sh: $(test -f /etc/xrdp/startwm.sh && echo 'EXISTS' || echo 'MISSING')"
echo ""

# Desktop Environment
echo "=== Desktop Environment ==="
echo "XFCE: $(command -v startxfce4 &> /dev/null && echo 'INSTALLED' || echo 'NOT INSTALLED')"
echo "GNOME: $(command -v gnome-session &> /dev/null && echo 'INSTALLED' || echo 'NOT INSTALLED')"
echo "KDE: $(command -v startplasma-x11 &> /dev/null && echo 'INSTALLED' || echo 'NOT INSTALLED')"
echo ""

# User Session File
echo "=== User Session Configuration ==="
if [ -f ~/.xsession ]; then
    echo ".xsession content: $(cat ~/.xsession)"
else
    echo ".xsession: NOT FOUND"
fi
echo ""

# Recent Errors
echo "=== Recent XRDP Errors ==="
sudo journalctl -u xrdp -p err -n 10 --no-pager 2>/dev/null || echo "No recent errors"
echo ""

# SSL Certificate Status
echo "=== SSL Certificate ==="
if [ -f /etc/xrdp/cert.pem ]; then
    openssl x509 -in /etc/xrdp/cert.pem -noout -dates 2>/dev/null || echo "Certificate error"
else
    echo "Default certificate location not found"
fi
echo ""

echo "=========================================="
echo "Diagnostic complete"
echo "=========================================="
```

Make it executable:

```bash
sudo chmod +x /usr/local/bin/xrdp-diagnose
```

Run diagnostics:

```bash
sudo xrdp-diagnose
```

## Performance Optimization

Optimize XRDP for better performance:

```bash
# Edit XRDP configuration for performance
sudo nano /etc/xrdp/xrdp.ini
```

Add or modify these settings:

```ini
[Globals]
; Use Xorg backend for better performance (requires xorgxrdp package)
; Xorg provides better performance than Xvnc
use_vsock=false

; Enable compression for bandwidth optimization
; Higher values = more CPU usage but less bandwidth
bulk_compression=true

; Set appropriate bits per pixel
; 16 provides good balance between quality and performance
max_bpp=16

[Xorg]
; Xorg-specific performance settings
; Enable hardware cursor for smoother mouse movement
param=-nolisten
param=tcp
```

Install xorgxrdp for better performance:

```bash
# Install xorgxrdp for native Xorg backend
# This provides better performance than Xvnc
sudo apt install xorgxrdp -y

# Restart XRDP to use the new backend
sudo systemctl restart xrdp
```

---

Setting up XRDP on Ubuntu provides a robust remote desktop solution compatible with Windows RDP clients. Whether you're managing servers, providing remote support, or accessing your workstation from anywhere, XRDP delivers a familiar and reliable experience.

Remember to:
- Keep your system and XRDP updated for security patches
- Use strong passwords and consider implementing two-factor authentication
- Regularly review access logs for suspicious activity
- Limit access using firewall rules to only trusted networks

For monitoring your XRDP server's health, availability, and performance, consider using [OneUptime](https://oneuptime.com). OneUptime provides comprehensive infrastructure monitoring that can alert you to connection issues, service outages, and resource constraints before they impact your users. With features like uptime monitoring, alerting, and status pages, OneUptime helps ensure your remote desktop infrastructure remains accessible and performs optimally around the clock.
