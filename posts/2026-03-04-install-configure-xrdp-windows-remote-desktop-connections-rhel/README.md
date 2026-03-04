# How to Install and Configure XRDP for Windows Remote Desktop Connections to RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, XRDP, Remote Desktop, RDP, Windows, Linux

Description: Install and configure XRDP on RHEL to allow Windows Remote Desktop clients to connect directly to the RHEL graphical desktop using the RDP protocol.

---

XRDP is an open source RDP server that allows Windows Remote Desktop clients (mstsc.exe) to connect to a RHEL desktop session. This eliminates the need for a separate VNC client on Windows machines.

## Install XRDP

XRDP is available from the EPEL repository.

```bash
# Enable EPEL repository
sudo dnf install -y epel-release

# Install XRDP and the TigerVNC backend
sudo dnf install -y xrdp tigervnc-server

# Install a desktop environment if needed
sudo dnf groupinstall -y "Server with GUI"
```

## Enable and Start XRDP

```bash
# Enable XRDP to start at boot
sudo systemctl enable xrdp

# Start the service
sudo systemctl start xrdp

# Verify it is running
sudo systemctl status xrdp

# XRDP listens on port 3389 by default
ss -tlnp | grep 3389
```

## Open the Firewall

```bash
# Allow RDP traffic
sudo firewall-cmd --permanent --add-port=3389/tcp
sudo firewall-cmd --reload
```

## Configure SELinux

```bash
# Allow XRDP to connect to the VNC backend
sudo setsebool -P xrdp_connect_all_unreserved_ports on

# If you encounter SELinux denials, check the audit log
sudo ausearch -m avc -ts recent | grep xrdp
```

## Configure the Desktop Session

```bash
# Create a .Xclients file for each user who will use XRDP
echo "gnome-session" > ~/.Xclients
chmod +x ~/.Xclients

# Or configure the default session globally
sudo tee /etc/xrdp/startwm.sh > /dev/null << 'SCRIPT'
#!/bin/sh
if [ -r /etc/default/locale ]; then
  . /etc/default/locale
  export LANG LANGUAGE
fi

# Set the session type
export XDG_SESSION_TYPE=x11
export GDK_BACKEND=x11

# Start GNOME session
exec gnome-session
SCRIPT
sudo chmod +x /etc/xrdp/startwm.sh
```

## Connect from Windows

1. Open the Windows Remote Desktop Connection (mstsc.exe)
2. Enter the RHEL server's IP address or hostname
3. Click "Connect"
4. Log in with your RHEL username and password
5. The GNOME desktop should appear

## Configure XRDP Settings

```bash
# Edit the main XRDP configuration
sudo vi /etc/xrdp/xrdp.ini

# Key settings:
# max_bpp=32          - Maximum color depth
# xserverbpp=24       - X server color depth
# crypt_level=high    - Encryption level
# security_layer=tls  - Use TLS encryption

# Restart XRDP after changes
sudo systemctl restart xrdp
```

## Enable TLS Encryption

```bash
# Generate a self-signed certificate for XRDP
sudo openssl req -x509 -newkey rsa:2048 \
  -keyout /etc/xrdp/key.pem \
  -out /etc/xrdp/cert.pem \
  -days 365 -nodes \
  -subj "/CN=$(hostname)"

# Update xrdp.ini to use TLS
sudo vi /etc/xrdp/xrdp.ini
# Set:
# security_layer=tls
# certificate=/etc/xrdp/cert.pem
# key_file=/etc/xrdp/key.pem

sudo systemctl restart xrdp
```

## Troubleshooting

```bash
# Check XRDP logs
sudo journalctl -u xrdp -f
cat /var/log/xrdp.log

# If you get a black screen after login, check:
# 1. The .Xclients file exists and is executable
# 2. The desktop environment packages are installed
# 3. SELinux is not blocking the connection

# Test the XRDP session log for the user
cat /var/log/xrdp-sesman.log
```

XRDP provides a seamless way for Windows users to connect to RHEL desktops using the built-in Remote Desktop client without installing additional software.
