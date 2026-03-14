# How to Set Up a Captive Portal on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Captive Portal, Hostapd, Iptables

Description: Learn how to set up a captive portal on Ubuntu to require authentication before granting internet access, using hostapd, dnsmasq, Nginx, and iptables.

---

A captive portal is the web page shown to users when they connect to a public WiFi network - the "sign in to continue" page you see at airports, hotels, and coffee shops. On Ubuntu, you can build a fully functional captive portal using hostapd (WiFi AP), dnsmasq (DHCP and DNS), Nginx (web server), and iptables (traffic control).

## Architecture Overview

The captive portal setup works by:
1. Assigning IP addresses to connected clients via DHCP
2. Intercepting all DNS queries and returning the portal server's IP (DNS hijacking)
3. Blocking all traffic except to the portal server using iptables
4. Redirecting HTTP requests to the login page via iptables DNAT rules
5. After authentication, adding the client's IP to an iptables allowlist

## Prerequisites

```bash
# Install required packages
sudo apt update
sudo apt install hostapd dnsmasq nginx iptables iptables-persistent -y

# For the web application (Python-based portal)
sudo apt install python3 python3-pip -y
pip3 install flask

# Stop services while configuring
sudo systemctl stop hostapd dnsmasq nginx
```

## Step 1: Set Up the WiFi Access Point

```bash
# Create hostapd configuration
sudo tee /etc/hostapd/hostapd.conf << 'EOF'
interface=wlan0
driver=nl80211
ssid=FreePublicWiFi
country_code=US
channel=6
hw_mode=g
ieee80211n=1
wmm_enabled=1

# Open network (no password) - typical for captive portals
auth_algs=1
wpa=0

# Or WPA2 with password (users still hit the portal after connecting)
# wpa=2
# wpa_key_mgmt=WPA-PSK
# rsn_pairwise=CCMP
# wpa_passphrase=wifipassword
EOF

# Point to the config
sudo sed -i 's|#DAEMON_CONF=""|DAEMON_CONF="/etc/hostapd/hostapd.conf"|' /etc/default/hostapd
```

## Step 2: Configure the AP Interface with a Static IP

```bash
sudo tee /etc/netplan/10-ap.yaml << 'EOF'
network:
  version: 2
  renderer: networkd
  ethernets:
    wlan0:
      dhcp4: false
      addresses:
        - 10.10.0.1/24
EOF

sudo netplan apply
```

## Step 3: Configure dnsmasq

The key captive portal trick: return the portal server's IP for ALL DNS queries.

```bash
sudo tee /etc/dnsmasq.conf << 'EOF'
# Listen only on the AP interface
interface=wlan0
bind-interfaces

# DHCP pool for clients
dhcp-range=10.10.0.10,10.10.0.200,255.255.255.0,1h

# Default gateway (the AP itself)
dhcp-option=3,10.10.0.1

# Return the portal IP for all DNS lookups (DNS hijacking)
# This redirects all domain queries to our portal server
address=/#/10.10.0.1

# Log DHCP leases for tracking
log-dhcp
log-facility=/var/log/dnsmasq.log
EOF
```

## Step 4: Set Up iptables Rules

```bash
# Enable IP forwarding
echo 'net.ipv4.ip_forward=1' | sudo tee /etc/sysctl.d/99-ip-forward.conf
sudo sysctl --system

# Flush existing rules
sudo iptables -F
sudo iptables -t nat -F
sudo iptables -t mangle -F

# Create a custom chain for captive portal clients
sudo iptables -N CAPTIVE_PORTAL

# Allow established connections
sudo iptables -A FORWARD -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow DNS and DHCP from clients (needed before authentication)
sudo iptables -A INPUT -i wlan0 -p udp --dport 53 -j ACCEPT
sudo iptables -A INPUT -i wlan0 -p udp --dport 67 -j ACCEPT

# Allow access to the portal server itself
sudo iptables -A INPUT -i wlan0 -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -i wlan0 -p tcp --dport 443 -j ACCEPT

# Redirect HTTP traffic to the captive portal (before clients authenticate)
sudo iptables -t nat -A PREROUTING -i wlan0 -p tcp --dport 80 -j DNAT --to-destination 10.10.0.1:80
sudo iptables -t nat -A PREROUTING -i wlan0 -p tcp --dport 443 -j DNAT --to-destination 10.10.0.1:443

# Block all other forwarding from unauthenticated clients
sudo iptables -A FORWARD -i wlan0 -j CAPTIVE_PORTAL
sudo iptables -A CAPTIVE_PORTAL -j DROP

# NAT for authenticated clients (those who have passed the portal)
# Authenticated clients are added dynamically via the allow script
sudo iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE

# Save the rules
sudo netfilter-persistent save
```

## Step 5: Build the Portal Web Application

```python
# /opt/captive-portal/portal.py - Simple Flask-based captive portal
from flask import Flask, request, redirect, render_template_string, session
import subprocess
import logging

app = Flask(__name__)
app.secret_key = 'change-this-to-a-random-secret-key'

# HTML template for the login page
LOGIN_TEMPLATE = '''
<!DOCTYPE html>
<html>
<head>
    <title>WiFi Login</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f0f0f0; }
        .portal { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 400px; width: 100%; }
        h1 { color: #333; margin-bottom: 20px; }
        input { width: 100%; padding: 10px; margin: 8px 0; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
        button { width: 100%; padding: 12px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
        .terms { font-size: 12px; color: #666; margin-top: 10px; }
        .error { color: red; margin-bottom: 10px; }
    </style>
</head>
<body>
    <div class="portal">
        <h1>Welcome to Free WiFi</h1>
        {% if error %}<div class="error">{{ error }}</div>{% endif %}
        <form method="post" action="/login">
            <input type="email" name="email" placeholder="Email address" required>
            <input type="text" name="name" placeholder="Your name" required>
            <button type="submit">Connect to Internet</button>
        </form>
        <p class="terms">By connecting, you agree to our Terms of Service. This network is monitored.</p>
    </div>
</body>
</html>
'''

SUCCESS_TEMPLATE = '''
<!DOCTYPE html>
<html>
<head>
    <title>Connected!</title>
    <meta http-equiv="refresh" content="3;url=https://www.google.com">
</head>
<body>
    <h1>You are now connected!</h1>
    <p>Redirecting you in 3 seconds...</p>
</body>
</html>
'''

def allow_client(ip_address):
    """Add the client IP to the iptables allowlist."""
    # Add rule before the DROP rule in the CAPTIVE_PORTAL chain
    cmd = [
        'iptables', '-I', 'CAPTIVE_PORTAL', '1',
        '-s', ip_address, '-j', 'ACCEPT'
    ]
    try:
        subprocess.run(['sudo'] + cmd, check=True)
        logging.info(f"Allowed client: {ip_address}")
    except subprocess.CalledProcessError as e:
        logging.error(f"Failed to allow client {ip_address}: {e}")

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def catch_all(path):
    return render_template_string(LOGIN_TEMPLATE, error=None)

@app.route('/login', methods=['POST'])
def login():
    email = request.form.get('email', '')
    name = request.form.get('name', '')
    client_ip = request.remote_addr

    if not email or not name:
        return render_template_string(LOGIN_TEMPLATE, error='Please fill in all fields.')

    # Log the registration
    logging.info(f"Portal registration: {name} <{email}> from {client_ip}")

    # Allow the client through the firewall
    allow_client(client_ip)

    return render_template_string(SUCCESS_TEMPLATE)

if __name__ == '__main__':
    logging.basicConfig(
        filename='/var/log/captive-portal.log',
        level=logging.INFO,
        format='%(asctime)s %(message)s'
    )
    # Listen on all interfaces, port 80
    app.run(host='0.0.0.0', port=8080, debug=False)
```

## Step 6: Set Up Nginx as a Reverse Proxy

```bash
# Create Nginx configuration
sudo tee /etc/nginx/sites-available/captive-portal << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    # Redirect Apple's captive portal check
    location /hotspot-detect.html {
        return 302 http://10.10.0.1/;
    }

    # Redirect Android's captive portal check
    location /generate_204 {
        return 302 http://10.10.0.1/;
    }

    # Proxy to Flask application
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/captive-portal /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl start nginx
```

## Step 7: Create systemd Service for the Portal App

```bash
sudo tee /etc/systemd/system/captive-portal.service << 'EOF'
[Unit]
Description=Captive Portal Web Application
After=network.target nginx.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/captive-portal
ExecStart=/usr/bin/python3 /opt/captive-portal/portal.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Set up the application directory
sudo mkdir -p /opt/captive-portal
sudo cp /tmp/portal.py /opt/captive-portal/
sudo chown -R www-data:www-data /opt/captive-portal

# Allow www-data to run iptables commands
echo "www-data ALL=(ALL) NOPASSWD: /usr/sbin/iptables -I CAPTIVE_PORTAL *" | sudo tee /etc/sudoers.d/captive-portal

sudo systemctl daemon-reload
sudo systemctl enable --now captive-portal
```

## Step 8: Start All Services

```bash
sudo systemctl start hostapd
sudo systemctl start dnsmasq
sudo systemctl start nginx
sudo systemctl start captive-portal

# Enable all at boot
sudo systemctl enable hostapd dnsmasq nginx captive-portal

# Verify all are running
sudo systemctl status hostapd dnsmasq nginx captive-portal
```

## Testing and Monitoring

```bash
# Monitor connected clients
iw dev wlan0 station dump

# Watch portal authentication logs
sudo tail -f /var/log/captive-portal.log

# Check iptables CAPTIVE_PORTAL chain for allowed clients
sudo iptables -L CAPTIVE_PORTAL -n -v

# Monitor DHCP leases
sudo tail -f /var/log/dnsmasq.log
```

This gives you a functional captive portal. For production use, add HTTPS support, session timeouts to revoke access after a period, and a database to track users.
