# How to Configure VNC over IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VNC, IPv6, Remote Desktop, Linux, TigerVNC, Networking

Description: Configure VNC servers and clients on Linux to accept and establish graphical remote access sessions over IPv6 connections.

## Introduction

VNC (Virtual Network Computing) provides graphical remote access to desktop environments. Most modern VNC implementations support IPv6, but server bind addresses and client connection syntax must be configured explicitly to use IPv6 instead of defaulting to IPv4.

## Installing TigerVNC Server

TigerVNC is the most widely used VNC server on Linux:

```bash
# Install on Ubuntu/Debian

sudo apt update && sudo apt install -y tigervnc-standalone-server tigervnc-common

# Install on RHEL/Fedora
sudo dnf install -y tigervnc-server
```

## Configuring TigerVNC to Listen on IPv6

Recent TigerVNC versions (1.12+) listen on both IPv4 and IPv6 by default via the `-UseIPv4` and `-UseIPv6` parameters. To force dual-stack or IPv6-only listening, start the server with the `-rfbport`, `-localhost`, and `-interface` options adjusted:

```bash
# Start VNC server on display :1 listening on all interfaces
vncserver :1 -rfbport 5901 -localhost no

# To bind to the IPv6 wildcard address only
vncserver :1 -rfbport 5901 -interface :: -localhost no
```

For a systemd-managed VNC service, create a unit file:

```ini
# /etc/systemd/system/vncserver@.service
[Unit]
Description=TigerVNC Server (display %i)
After=network.target

[Service]
Type=forking
User=youruser
ExecStartPre=/bin/sh -c '/usr/bin/vncserver -kill :%i > /dev/null 2>&1 || :'
ExecStart=/usr/bin/vncserver :%i -rfbport 590%i -interface :: -localhost no
ExecStop=/usr/bin/vncserver -kill :%i

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now vncserver@1.service
```

## Verifying IPv6 Listening

Confirm VNC is bound to the IPv6 wildcard address:

```bash
# Check listening sockets
ss -tlnp | grep 5901

# Expected output:
# LISTEN  0  5  :::5901  :::*  users:(("Xvnc",pid=1234,fd=7))
```

## Opening the Firewall

Allow VNC ports for IPv6:

```bash
# Using UFW
sudo ufw allow 5901/tcp comment "VNC Display 1"

# Using ip6tables
sudo ip6tables -A INPUT -p tcp --dport 5901 -j ACCEPT
sudo ip6tables-save | sudo tee /etc/ip6tables.rules
```

## Connecting from a VNC Client

Use the bracket notation for IPv6 addresses in VNC clients:

```bash
# Using vncviewer (TigerVNC client) - display number form (display 1 = port 5901)
vncviewer [2001:db8::10]:1

# Explicit port form (double colon = literal TCP port)
vncviewer [2001:db8::10]::5901

# Using Remmina (GUI client) - enter in address field:
# [2001:db8::10]:5901
```

## Tunneling VNC over SSH with IPv6

For security, tunnel VNC through SSH using IPv6:

```bash
# Create an SSH tunnel to the remote VNC server over IPv6
ssh -L 5901:localhost:5901 -6 user@2001:db8::10

# In a separate terminal, connect VNC to the local tunnel
vncviewer localhost:5901
```

## Using x11vnc with IPv6

`x11vnc` can share an existing X display over IPv6:

```bash
# Install x11vnc
sudo apt install -y x11vnc

# Start x11vnc with IPv6 listening enabled (the -6 flag adds IPv6 alongside IPv4)
x11vnc -display :0 -rfbport 5900 -6 -passwd yourpassword -forever
```

## Troubleshooting

**Client shows "connection refused"**: Verify the server is listening on `:::5901` not `0.0.0.0:5901`.

**Firewall is open but still blocked**: Check cloud provider security groups for IPv6-specific inbound rules.

**Screen is gray or black**: Ensure a desktop environment is installed and the VNC session has an Xsession configured.

## Conclusion

VNC over IPv6 works well with TigerVNC once the server is configured to listen on `::` instead of just IPv4 interfaces. Use SSH tunneling for secure remote access and validate with `ss` that the correct address family is in use.
