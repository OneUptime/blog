# How to Configure Mumble/Murmur Server with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Mumble, Murmur, IPv6, Voice Chat, Linux, Open Source, Self-Hosted

Description: Install and configure a Mumble (Murmur) voice server to listen on IPv6, enabling low-latency voice communication for users connecting from IPv6 networks.

---

Mumble is an open-source, low-latency voice over IP application. Murmur is its server component. It supports IPv6 natively and can be bound to IPv6 addresses for serving voice connections.

## Installing Murmur

```bash
# Ubuntu/Debian

sudo apt install mumble-server -y

# RHEL/CentOS
sudo dnf install murmur -y

# Check version
murmurd --version

# Enable service
sudo systemctl enable mumble-server
```

## Configuring Murmur for IPv6

```ini
# /etc/mumble-server.ini (or /etc/murmur.ini)

# Bind to all interfaces including IPv6
# Leave host empty to bind to all interfaces (IPv4 + IPv6)
host=

# Or bind to specific IPv6 address
# host=2001:db8::1

# Server port
port=64738

# Server password (leave empty for public)
serverpassword=

# Maximum users
users=100

# Server name
registerName=My IPv6 Mumble Server

# Welcome text
welcometext=<br />Welcome to our <b>IPv6</b> Mumble server!

# Logging
uname=mumble-server
logfile=/var/log/mumble-server/mumble-server.log
pidfile=/var/run/mumble-server/mumble-server.pid

# SSL certificate (auto-generated if not specified)
# sslCert=/etc/ssl/certs/mumble.crt
# sslKey=/etc/ssl/private/mumble.key

# Bandwidth limit per user
bandwidth=72000

# Opus codec threshold
opusthreshold=100

# Logging to database
database=/var/lib/mumble-server/mumble-server.sqlite
```

## Enabling Dual-Stack (IPv4 + IPv6)

```ini
# The host= directive accepts only a single IP/hostname.
# Leaving host blank is the supported way to bind to all
# available addresses (both IPv4 and IPv6) on a dual-stack host:
host=

# To bind to a single specific IPv6 address only:
# host=2001:db8::1

# To listen on more than one specific address, run multiple
# Murmur instances each with its own ini file and host= value.
```

## Systemd Service Management

```bash
# Start Murmur
sudo systemctl start mumble-server

# Enable on boot
sudo systemctl enable mumble-server

# Check status
sudo systemctl status mumble-server

# View logs
sudo journalctl -u mumble-server -f

# Reload configuration (without restart)
sudo systemctl reload mumble-server
```

## Firewall Rules for Murmur IPv6

```bash
# Mumble uses TCP and UDP on port 64738
sudo ip6tables -A INPUT -p tcp --dport 64738 -j ACCEPT
sudo ip6tables -A INPUT -p udp --dport 64738 -j ACCEPT

# Save rules (requires iptables-persistent)
sudo ip6tables-save > /etc/iptables/rules.v6

# Verify listening state
ss -6 -tlnp | grep 64738
ss -6 -ulnp | grep 64738
```

## Managing Murmur via mumble-server-cli

```bash
# Get SuperUser password (set on first run)
sudo dpkg-reconfigure mumble-server

# Or check logs for SuperUser password
sudo grep -i "superuser\|password" /var/log/mumble-server/mumble-server.log | head -5

# Use mumble-server-cli for management (requires Ice to be enabled in mumble-server.ini)
# Default connection string: Meta:tcp -h 127.0.0.1 -p 6502
sudo mumble-server-cli -c "Meta:tcp -h 127.0.0.1 -p 6502"
```

## Testing IPv6 Connectivity

```bash
# Check if Murmur is listening on IPv6
ss -6 -tlnp | grep 64738

# Test TCP port over IPv6
nc -6 -w 3 2001:db8::1 64738 && echo "Murmur TCP accessible over IPv6"

# Test UDP port
nmap -6 -sU -p 64738 2001:db8::1

# DNS setup
# mumble.example.com. IN AAAA 2001:db8::1
```

Murmur's IPv6 support through the `host=` configuration directive enables open-source voice communication servers to serve users on IPv6 networks, with its low-latency UDP-based audio transmission functioning seamlessly over both IPv4 and IPv6 connections.
