# How to Set Up VNC Remote Desktop Access on RHEL Using TigerVNC

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, VNC, TigerVNC, Remote Desktop, Linux

Description: Set up VNC remote desktop access on RHEL using TigerVNC to access the graphical desktop from remote clients.

---

TigerVNC is a high-performance VNC server available on RHEL that lets you access the graphical desktop remotely. This is useful for managing RHEL workstations or servers with a GUI from any VNC client.

## Install TigerVNC Server

```bash
# Install TigerVNC server
sudo dnf install -y tigervnc-server

# Install a desktop environment if not already present
sudo dnf groupinstall -y "Server with GUI"
```

## Configure VNC for a Specific User

```bash
# Set a VNC password for the user
# Run this as the user who will connect via VNC
vncpasswd
# Enter and confirm a password (view-only password is optional)
```

## Configure the VNC Server Instance

```bash
# Create the systemd user mapping file
# Map display :1 to your user
sudo tee /etc/tigervnc/vncserver.users > /dev/null << 'EOF'
:1=your_username
EOF

# Configure VNC session settings
mkdir -p ~/.vnc
tee ~/.vnc/config > /dev/null << 'EOF'
# VNC session configuration
session=gnome
geometry=1920x1080
securitytypes=vncauth
EOF
```

## Start the VNC Server

```bash
# Start the VNC server for display :1
sudo systemctl start vncserver@:1

# Enable it to start at boot
sudo systemctl enable vncserver@:1

# Check the status
sudo systemctl status vncserver@:1
```

## Open Firewall Ports

```bash
# VNC display :1 uses port 5901, :2 uses 5902, etc.
sudo firewall-cmd --permanent --add-port=5901/tcp
sudo firewall-cmd --reload
```

## Connect from a VNC Client

From your local machine, use any VNC client (TigerVNC Viewer, RealVNC, etc.):

```bash
# Install TigerVNC viewer on the client machine
sudo dnf install -y tigervnc

# Connect to the VNC server
vncviewer your-server-ip:1
# Or
vncviewer your-server-ip:5901
```

## Secure VNC with SSH Tunneling

VNC traffic is unencrypted by default. Use SSH tunneling for security.

```bash
# On the client machine, create an SSH tunnel
ssh -L 5901:localhost:5901 your_username@your-server-ip

# Then connect VNC viewer to the local tunnel
vncviewer localhost:5901
```

## Configure Multiple VNC Sessions

```bash
# Map additional displays to different users
sudo tee /etc/tigervnc/vncserver.users > /dev/null << 'EOF'
:1=user1
:2=user2
:3=user3
EOF

# Start each display
sudo systemctl start vncserver@:1
sudo systemctl start vncserver@:2
sudo systemctl start vncserver@:3

# Open firewall ports for each
sudo firewall-cmd --permanent --add-port=5901-5903/tcp
sudo firewall-cmd --reload
```

## Troubleshooting

```bash
# Check VNC server logs
journalctl -u vncserver@:1 -f

# Check the user-specific log
cat ~/.vnc/*.log

# Kill a stuck VNC session
vncserver -kill :1

# List running VNC sessions
vncserver -list

# If the session shows a black screen, verify the desktop session type
# Edit ~/.vnc/config and set: session=gnome
```

TigerVNC provides a reliable way to access the RHEL graphical desktop remotely, and SSH tunneling ensures the connection remains secure.
