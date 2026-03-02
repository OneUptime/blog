# How to Set Up a Captive Portal with nodogsplash on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Captive Portal, Networking, WiFi, nodogsplash

Description: Set up a captive portal on Ubuntu using nodogsplash, creating a WiFi network that redirects unauthenticated users to a login or terms-of-service page before granting internet access.

---

A captive portal intercepts HTTP traffic from newly connected WiFi clients and redirects them to a webpage - typically a login page, terms of service acceptance, or a branded splash page. Hotels, coffee shops, conferences, and guest networks all use captive portals. `nodogsplash` is a lightweight captive portal daemon for Linux that integrates with hostapd and iptables.

## Architecture Overview

The captive portal works like this:

1. Client connects to WiFi and gets an IP via DHCP
2. Client attempts to visit any website
3. nodogsplash intercepts the HTTP request using iptables rules
4. Client is redirected to the splash page
5. Client accepts terms or logs in
6. nodogsplash marks the client as authenticated and allows full internet access

The system uses iptables to intercept traffic, so it only works with HTTP (port 80) by default. HTTPS connections require additional handling because browsers enforce certificate validation.

## Prerequisites

This guide assumes you already have:
- hostapd running as a WiFi access point on `wlan0`
- dnsmasq providing DHCP to clients
- IP forwarding enabled
- Internet access via `eth0`

If you haven't set this up, see the Ubuntu WiFi access point guide first.

## Installing nodogsplash

nodogsplash is not in the standard Ubuntu repositories. Install from source or use a PPA:

```bash
# Install build dependencies
sudo apt-get install -y \
    git \
    build-essential \
    libmicrohttpd-dev \
    make \
    iptables

# Clone the nodogsplash repository
git clone https://github.com/nodogsplash/nodogsplash.git
cd nodogsplash

# Build and install
make
sudo make install

# Verify installation
which nodogsplash
nodogsplash --version
```

## Configuring nodogsplash

The main configuration file:

```bash
sudo mkdir -p /etc/nodogsplash
sudo nano /etc/nodogsplash/nodogsplash.conf
```

```ini
# /etc/nodogsplash/nodogsplash.conf
# Basic captive portal configuration

# Network interface for the captive portal (the AP interface)
GatewayInterface wlan0

# IP address of this machine on the AP interface
# Must match the static IP set on wlan0
GatewayAddress 10.0.0.1

# Maximum number of clients
MaxClients 250

# ==================== Timeouts ====================

# How long (minutes) a client can be idle before being deauthenticated
ClientIdleTimeout 30

# How long (minutes) until an authenticated client must re-authenticate
ClientForceTimeout 360

# How long (seconds) to keep a rejected connection in the queue
PreauthIdleTimeout 30

# ==================== Splash Page ====================

# Directory containing splash page files
WebRoot /etc/nodogsplash/htdocs

# URL of the splash page (relative to WebRoot)
# When a client is redirected, they'll see this page
SplashPage splash.html

# ==================== Bandwidth Limiting ====================
# Optional: Limit bandwidth per client

# Upload limit (kbits/sec) - 0 = unlimited
UploadLimit 0

# Download limit (kbits/sec) - 0 = unlimited
DownloadLimit 0

# ==================== Authentication ====================

# How clients authenticate:
# login = username/password
# none = just click to agree to terms (simplest)
AuthenticationType none

# ==================== Logging ====================

# Log to syslog
Syslog 1
SyslogFacility LOG_DAEMON

# ==================== Whitelist ====================
# Allow access to these domains without authentication
# (for CDN resources needed by the splash page)

# Uncomment to allow specific IPs/domains without portal
# FirewallRuleSet trusted-users {
#   FirewallRule allow all
# }

# Allow DNS queries through without authentication
# (required for the portal to work at all)
FirewallRuleSet preauthenticated-users {
  FirewallRule allow tcp port 53
  FirewallRule allow udp port 53
}
```

## Creating the Splash Page

Create the directory structure and a basic splash page:

```bash
sudo mkdir -p /etc/nodogsplash/htdocs
```

```html
<!-- /etc/nodogsplash/htdocs/splash.html -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Guest WiFi</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background-color: #f5f5f5;
        }
        .portal-box {
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            max-width: 400px;
            width: 90%;
            text-align: center;
        }
        h1 { color: #333; }
        p { color: #666; line-height: 1.6; }
        .accept-btn {
            background-color: #007bff;
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 5px;
            font-size: 16px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            margin-top: 20px;
        }
        .accept-btn:hover { background-color: #0056b3; }
        .terms { font-size: 12px; color: #999; margin-top: 15px; }
    </style>
</head>
<body>
    <div class="portal-box">
        <h1>Guest WiFi Access</h1>
        <p>Welcome to our guest wireless network.</p>
        <p>By connecting, you agree to our terms of service and acceptable use policy.</p>
        <p>
            - No illegal activity<br>
            - No excessive bandwidth usage<br>
            - Usage may be monitored
        </p>
        <!-- nodogsplash replaces $authaction with the actual auth URL -->
        <a href="$authaction" class="accept-btn">Accept &amp; Connect</a>
        <p class="terms">Connection time: $remainingtime minutes remaining after authentication</p>
    </div>
</body>
</html>
```

### Template Variables in nodogsplash

nodogsplash provides template variables that are replaced when serving the splash page:

- `$authaction` - the URL to click to authenticate
- `$denyaction` - the URL to explicitly deny access
- `$gatewayname` - the gateway name from config
- `$tok` - unique token for this client
- `$redir` - original URL the client tried to visit
- `$remainingtime` - time before re-authentication required
- `$clientip` - client's IP address
- `$clientmac` - client's MAC address

## Creating a systemd Service

Create a service file to run nodogsplash automatically:

```bash
sudo nano /etc/systemd/system/nodogsplash.service
```

```ini
[Unit]
Description=NoDogSplash Captive Portal
After=network.target hostapd.service dnsmasq.service
Requires=hostapd.service

[Service]
Type=forking
PIDFile=/var/run/nodogsplash.pid
ExecStart=/usr/bin/nodogsplash
ExecStop=/usr/bin/ndsctl stop
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable nodogsplash
sudo systemctl start nodogsplash
sudo systemctl status nodogsplash
```

## Using ndsctl to Manage the Portal

`ndsctl` is the control tool for nodogsplash:

```bash
# Check nodogsplash status
sudo ndsctl status

# View connected and authenticated clients
sudo ndsctl clients

# View clients waiting for authentication
sudo ndsctl json status

# Manually authenticate a specific client by MAC address
sudo ndsctl auth AA:BB:CC:DD:EE:FF

# Deauthenticate a client
sudo ndsctl deauth AA:BB:CC:DD:EE:FF

# Get verbose client information
sudo ndsctl json clients

# Temporarily stop the portal (all traffic passes freely)
sudo ndsctl stop

# Restart after stopping
sudo ndsctl

# View connection counts
sudo ndsctl json status | python3 -m json.tool
```

## Handling HTTPS Connections

Modern browsers use HTTPS by default, which nodogsplash cannot redirect (due to certificate validation). A client connecting to `https://google.com` will see a certificate error rather than the splash page.

Strategies to handle this:

### DNS Pre-Redirect

Configure dnsmasq to redirect DNS queries to a local HTTP server for unauthenticated clients:

```bash
# In /etc/dnsmasq.conf, add:
# Redirect all DNS queries from unauthenticated clients to a local HTTP server
# (This requires more complex dnsmasq/iptables integration)

# Simpler: redirect a specific domain to the portal
address=/connectivitycheck.android.com/10.0.0.1
address=/captive.apple.com/10.0.0.1
address=/www.msftconnecttest.com/10.0.0.1
```

Modern operating systems (iOS, Android, Windows, macOS) send HTTP requests to known connectivity check URLs to detect captive portals. Intercepting these makes the captive portal notification appear in the client's OS notification bar.

### Adding a Web Server for the Portal

nodogsplash has a built-in web server for the splash page. For more advanced portals, use nginx:

```bash
# Install nginx for the portal web server
sudo apt-get install -y nginx

# Configure nginx to serve the portal on port 2050 (nodogsplash default)
sudo nano /etc/nginx/sites-available/captive-portal
```

```nginx
server {
    listen 10.0.0.1:80;

    root /var/www/captive-portal;
    index index.html;

    # Serve the splash page for all unauthenticated requests
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Log portal accesses
    access_log /var/log/nginx/captive-portal.access.log;
}
```

## Monitoring Captive Portal Usage

```bash
# View active authenticated clients with connection times
sudo ndsctl json clients | python3 -m json.tool | grep -E "mac|ip|auth|duration"

# Monitor connections in real-time
sudo journalctl -u nodogsplash -f

# View connection log
sudo cat /var/log/syslog | grep nodogsplash | tail -50

# Count authenticated vs total clients
sudo ndsctl json status | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(f\"Authenticated: {data.get('authenticated', 0)}\")
print(f\"Deauthenticated: {data.get('deauthenticated', 0)}\")
"
```

## Summary

nodogsplash provides a functional captive portal solution for Ubuntu-based access points. The key components:

- nodogsplash handles the iptables interception and portal logic
- A splash page (HTML template with `$authaction`) gives users the agree-and-connect interface
- `ndsctl` manages client authentication programmatically if needed
- HTTPS requires additional handling via DNS interception of connectivity check URLs

For production deployments, the splash page should be designed to load quickly (minimal external resources), since clients can't reach the internet until they authenticate through it.
