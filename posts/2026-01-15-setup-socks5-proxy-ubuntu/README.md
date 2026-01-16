# How to Set Up a SOCKS5 Proxy Server on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, SOCKS5, Proxy, Networking, Security, Tutorial

Description: Complete guide to setting up a SOCKS5 proxy server on Ubuntu using Dante for secure network traffic forwarding.

---

SOCKS5 is a versatile proxy protocol that handles any type of traffic (HTTP, HTTPS, FTP, etc.) at the session layer. Unlike HTTP proxies, SOCKS5 can proxy any TCP/UDP traffic and supports authentication. This guide covers setting up a SOCKS5 proxy using Dante on Ubuntu.

## Use Cases

- Bypass network restrictions
- Anonymize network traffic
- Secure remote access
- Application-level proxying
- Testing geographically restricted services

## Prerequisites

- Ubuntu 20.04 or later
- Root or sudo access
- Static IP address recommended
- Open port for proxy (default: 1080)

## Method 1: Dante (Recommended)

### Install Dante Server

```bash
# Update packages
sudo apt update

# Install Dante server
sudo apt install dante-server -y
```

### Configure Dante

```bash
# Backup original config
sudo cp /etc/danted.conf /etc/danted.conf.bak

# Create new configuration
sudo nano /etc/danted.conf
```

### Basic Configuration (No Authentication)

```conf
# Dante SOCKS5 server configuration

# Logging
logoutput: /var/log/danted.log

# Internal interface (where to listen)
internal: eth0 port = 1080

# External interface (outgoing connections)
external: eth0

# Authentication method
socksmethod: none

# Client access rules
client pass {
    from: 0.0.0.0/0 to: 0.0.0.0/0
    log: error
}

# SOCKS rules
socks pass {
    from: 0.0.0.0/0 to: 0.0.0.0/0
    log: error
}
```

### Configuration with Authentication

```conf
# Dante SOCKS5 server with authentication

logoutput: /var/log/danted.log

internal: eth0 port = 1080
external: eth0

# Use username/password authentication
socksmethod: username

# Client rules
client pass {
    from: 0.0.0.0/0 to: 0.0.0.0/0
    log: error
}

# SOCKS rules with authentication
socks pass {
    from: 0.0.0.0/0 to: 0.0.0.0/0
    socksmethod: username
    log: error connect
}
```

### Create Proxy Users

```bash
# Create system user for proxy authentication
sudo useradd -r -s /bin/false proxyuser
sudo passwd proxyuser

# Or use existing system users
```

### Start Dante Server

```bash
# Start service
sudo systemctl start danted
sudo systemctl enable danted

# Check status
sudo systemctl status danted
```

## Method 2: SSH SOCKS Proxy (Simple)

Create a SOCKS proxy through SSH tunnel:

### On Client Machine

```bash
# Create SOCKS proxy via SSH
ssh -D 1080 -f -C -q -N user@your_server_ip

# Options:
# -D 1080: Create SOCKS proxy on local port 1080
# -f: Run in background
# -C: Enable compression
# -q: Quiet mode
# -N: No remote command
```

### Keep SSH Tunnel Alive

```bash
# Using autossh (auto-reconnect)
sudo apt install autossh -y

autossh -M 0 -D 1080 -f -C -q -N user@your_server_ip
```

### Create systemd Service

```bash
sudo nano /etc/systemd/system/socks-proxy.service
```

```ini
[Unit]
Description=SSH SOCKS Proxy
After=network.target

[Service]
Type=simple
User=your_user
ExecStart=/usr/bin/ssh -D 1080 -C -q -N -o ServerAliveInterval=60 -o ExitOnForwardFailure=yes user@your_server_ip
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

## Method 3: microsocks (Lightweight)

### Build microsocks

```bash
# Install build tools
sudo apt install build-essential git -y

# Clone and build
git clone https://github.com/rofl0r/microsocks.git
cd microsocks
make
sudo cp microsocks /usr/local/bin/
```

### Run microsocks

```bash
# Run without authentication
microsocks -p 1080

# Run with authentication
microsocks -p 1080 -u username -P password

# Bind to specific interface
microsocks -i 0.0.0.0 -p 1080 -u admin -P secretpass
```

### Create systemd Service

```bash
sudo nano /etc/systemd/system/microsocks.service
```

```ini
[Unit]
Description=Microsocks SOCKS5 Proxy
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/microsocks -i 0.0.0.0 -p 1080 -u proxyuser -P yourpassword
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

## Advanced Dante Configuration

### Restrict Access by IP

```conf
# Allow only specific IP ranges
client pass {
    from: 192.168.1.0/24 to: 0.0.0.0/0
    log: error
}

client pass {
    from: 10.0.0.0/8 to: 0.0.0.0/0
    log: error
}

# Block all others
client block {
    from: 0.0.0.0/0 to: 0.0.0.0/0
    log: error
}
```

### Multiple Listen Interfaces

```conf
internal: eth0 port = 1080
internal: eth1 port = 1080
internal: 127.0.0.1 port = 1080

external: eth0
```

### Bandwidth Limiting

```conf
# In socks pass rule
socks pass {
    from: 0.0.0.0/0 to: 0.0.0.0/0
    bandwidth: 10000000  # 10 Mbps
}
```

### Block Specific Destinations

```conf
# Block specific sites
socks block {
    from: 0.0.0.0/0 to: .facebook.com
    log: error
}

socks block {
    from: 0.0.0.0/0 to: .twitter.com
    log: error
}

# Allow everything else
socks pass {
    from: 0.0.0.0/0 to: 0.0.0.0/0
    log: error
}
```

## Firewall Configuration

```bash
# Allow SOCKS port
sudo ufw allow 1080/tcp

# Or restrict to specific IPs
sudo ufw allow from 192.168.1.0/24 to any port 1080

# Verify
sudo ufw status
```

## Test SOCKS5 Proxy

### Using curl

```bash
# Test without authentication
curl --socks5 server_ip:1080 https://ifconfig.me

# Test with authentication
curl --socks5 proxyuser:password@server_ip:1080 https://ifconfig.me

# Test SOCKS5 hostname resolution
curl --socks5-hostname server_ip:1080 https://ifconfig.me
```

### Using Python

```python
import requests

# SOCKS5 proxy configuration
proxies = {
    'http': 'socks5://proxyuser:password@server_ip:1080',
    'https': 'socks5://proxyuser:password@server_ip:1080'
}

# Make request through proxy
response = requests.get('https://ifconfig.me', proxies=proxies)
print(response.text)
```

### Using Firefox

1. Settings → Network Settings
2. Manual proxy configuration
3. SOCKS Host: server_ip
4. Port: 1080
5. Select SOCKS v5

### Using Chrome (Command Line)

```bash
google-chrome --proxy-server="socks5://server_ip:1080"
```

## Configure System-Wide Proxy

### Environment Variables

```bash
# Add to ~/.bashrc or /etc/environment
export ALL_PROXY="socks5://proxyuser:password@server_ip:1080"
export all_proxy="socks5://proxyuser:password@server_ip:1080"
```

### Using proxychains

```bash
# Install proxychains
sudo apt install proxychains4 -y

# Configure
sudo nano /etc/proxychains4.conf
```

```conf
[ProxyList]
socks5 server_ip 1080 proxyuser password
```

```bash
# Run command through proxy
proxychains4 curl https://ifconfig.me
```

## Logging and Monitoring

### Enable Detailed Logging

```conf
# In danted.conf
logoutput: /var/log/danted.log

# Log connect events
socks pass {
    from: 0.0.0.0/0 to: 0.0.0.0/0
    log: error connect disconnect
}
```

### View Logs

```bash
# View Dante logs
sudo tail -f /var/log/danted.log

# View system logs
sudo journalctl -u danted -f
```

### Monitor Connections

```bash
# Active connections
sudo ss -tlnp | grep :1080

# Connected clients
sudo netstat -anp | grep :1080
```

## Security Best Practices

1. **Always use authentication** in production
2. **Restrict access by IP** where possible
3. **Use strong passwords** for proxy users
4. **Enable logging** for audit trails
5. **Keep software updated**
6. **Use TLS/SSL** for additional security

### Add TLS (stunnel)

```bash
# Install stunnel
sudo apt install stunnel4 -y

# Generate certificate
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/stunnel/stunnel.pem \
    -out /etc/stunnel/stunnel.pem

# Configure stunnel
sudo nano /etc/stunnel/stunnel.conf
```

```ini
[socks]
accept = 1443
connect = 127.0.0.1:1080
cert = /etc/stunnel/stunnel.pem
```

## Troubleshooting

### Service Won't Start

```bash
# Check configuration syntax
danted -Vv

# Check logs
sudo journalctl -u danted -n 50

# Verify interface names
ip addr show
```

### Connection Refused

```bash
# Check if service is running
sudo systemctl status danted

# Check if port is listening
sudo ss -tlnp | grep :1080

# Check firewall
sudo ufw status
```

### Authentication Failed

```bash
# Verify user exists
id proxyuser

# Test password
su - proxyuser

# Check PAM configuration
cat /etc/pam.d/sockd
```

### Slow Performance

```bash
# Check DNS resolution
time dig google.com

# Use external DNS in danted.conf
# Or configure /etc/resolv.conf
```

---

A SOCKS5 proxy provides flexible traffic forwarding for various applications. Dante offers robust features for enterprise use, while SSH tunneling works well for personal use. For monitoring your proxy server, consider using OneUptime for uptime and performance tracking.
