# How to Configure IPv6 Captive Portals for Wi-Fi

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Captive Portal, Wi-Fi, Guest Network, Authentication, Hotspots

Description: Configure IPv6-compatible captive portals for Wi-Fi guest networks, handling IPv6 redirect challenges, DNS-based interception, and dual-stack portal authentication.

---

Captive portals intercept unauthenticated users and redirect them to a login page. IPv6 complicates captive portals because clients may bypass DNS-based redirection using direct IPv6 addresses, and browsers behave differently for IPv6 portal detection. A proper IPv6 captive portal handles both address families.

## IPv6 Captive Portal Challenges

```text
IPv6 Captive Portal Issues:
1. Clients may have multiple IPv6 addresses (SLAAC + DHCPv6 + privacy)
2. HTTPS interception breaks TLS and causes certificate errors
3. OS captive portal detection uses known probe URLs and may prefer IPv6 connectivity
4. IPv6 traffic may bypass iptables if only IPv4 rules are set

Solutions:
- Use nftables/ip6tables for IPv6 traffic interception
- Block direct IPv6 internet access until authenticated
- Support CAPPORT signaling (RFC 8910) and API (RFC 8908) for smooth portal detection
- Track sessions at the device or session level rather than assuming a single IP
```

## nftables IPv6 Captive Portal Rules

```bash
#!/bin/bash
# ipv6-captive-portal.sh - Set up IPv6 captive portal intercept

# Flush existing rules

nft flush ruleset

# Create nftables configuration
cat > /etc/nftables-captive.conf << 'EOF'
table ip6 captive_portal {

    # Authenticated clients set (populated by portal)
    set authenticated {
        type ipv6_addr
        flags timeout
        timeout 8h
    }

    chain prerouting {
        type nat hook prerouting priority dstnat; policy accept;

        # Allow authenticated clients through
        ip6 saddr @authenticated accept

        # Allow ICMPv6 (NDP, ping)
        meta l4proto icmpv6 accept

        # Allow DHCPv6
        udp dport 547 accept

        # Allow DNS (redirect to local DNS)
        udp dport 53 redirect to :53
        tcp dport 53 redirect to :53

        # Redirect HTTP to captive portal
        tcp dport 80 redirect to :8080

        # Do not intercept HTTPS. Point the CAPPORT API and portal hostname
        # at this gateway's IPv6 address instead.
    }

    chain forward {
        type filter hook forward priority filter; policy drop;

        # Allow authenticated clients to forward
        ip6 saddr @authenticated accept

        # Allow established connections
        ct state established,related accept

        # Allow ICMPv6
        meta l4proto icmpv6 accept

        # Block everything else
        drop
    }
}
EOF

nft -f /etc/nftables-captive.conf
echo "IPv6 captive portal rules loaded"
```

## Add Authenticated Client to Allow List

```bash
# When client authenticates, add their IPv6 to the set
# Note: Track by MAC as clients may have multiple IPv6 addresses

# Get all IPv6 addresses for a MAC (from NDP table)
CLIENT_MAC="aa:bb:cc:dd:ee:ff"
CLIENT_IPS=$(ip -6 neigh show | awk -v mac="$CLIENT_MAC" '$5 == mac {print $1}')

# Add all IPv6 addresses for this client
for IP in $CLIENT_IPS; do
    nft add element ip6 captive_portal authenticated { $IP timeout 8h }
    echo "Authenticated IPv6: $IP"
done

# Remove on logout/expiry (automatic with timeout flag)
# Or manual removal:
nft delete element ip6 captive_portal authenticated { 2001:db8:100::123 }
```

## CAPPORT API for IPv6 (RFC 8908)

```python
#!/usr/bin/env python3
# capport_api.py - CAPPORT API endpoint for IPv6 captive portal

from flask import Flask, Response, request, redirect
import json
import subprocess

app = Flask(__name__)

@app.route('/api/v1/status')
def captive_status():
    """CAPPORT API status endpoint (RFC 8908)."""
    client_ip = request.remote_addr

    # Check if client is authenticated
    is_authenticated = check_auth(client_ip)

    response = {
        "captive": not is_authenticated,
        "user-portal-url": "https://portal.example.com/login"
    }

    if is_authenticated:
        response["seconds-remaining"] = get_remaining_seconds(client_ip)
        response["can-extend-session"] = True
    else:
        response["can-extend-session"] = False

    return Response(
        json.dumps(response),
        content_type="application/captive+json",
        headers={"Cache-Control": "private"}
    )

def check_auth(ip):
    """Check if IP is in authenticated set."""
    result = subprocess.run(
        ['nft', 'get', 'element', 'ip6', 'captive_portal',
         'authenticated', '{', ip, '}'],
        capture_output=True, text=True
    )
    return result.returncode == 0

def get_remaining_seconds(ip):
    """Return session time remaining."""
    return 3600  # Placeholder

@app.route('/login', methods=['GET', 'POST'])
def login_portal():
    """Handle portal login."""
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        client_ip = request.remote_addr

        if authenticate_user(username, password):
            authorize_client(client_ip)
            return redirect("https://portal.example.com/success")

    return '''<html><body>
    <h2>Wi-Fi Login</h2>
    <form method="POST">
    Username: <input name="username"><br>
    Password: <input type="password" name="password"><br>
    <input type="submit" value="Login">
    </form></body></html>'''

def authenticate_user(username, password):
    return True  # Implement actual auth

def authorize_client(client_ip):
    subprocess.run(
        ['nft', 'add', 'element', 'ip6', 'captive_portal',
         'authenticated', '{', client_ip, 'timeout', '8h', '}'],
        check=True
    )

if __name__ == '__main__':
    # Use a certificate valid for the hostname advertised via RA/DHCPv6.
    app.run(host='::', port=443, ssl_context=('portal.crt', 'portal.key'))
```

## RA Options for Captive Portal Detection

```bash
# RFC 8910: Advertise captive portal API URI in RA
# radvd.conf
interface wlan0 {
    AdvSendAdvert on;
    # ...
    prefix 2001:db8:100::/64 {
        AdvAutonomous on;
        AdvOnLink on;
    };
    # Captive Portal API URI option (type 37)
    AdvCaptivePortalAPI "https://portal.example.com/api/v1/status";
};
```

```bash
# DHCPv6 captive portal option in ISC DHCP
# /etc/dhcp/dhcpd6.conf
option dhcp6.captive-portal code 103 = text;

subnet6 2001:db8:100::/64 {
    range6 2001:db8:100::100 2001:db8:100::200;
    option dhcp6.domain-search "guest.example.com";
    # option 103: Captive Portal API URI
    option dhcp6.captive-portal "https://portal.example.com/api/v1/status";
}
```

IPv6 captive portals often need to track clients at the device or session level because each device may use multiple IPv6 addresses, use nftables with named sets for efficient allow-listing, and implement CAPPORT signaling (RFC 8910) together with the CAPPORT API (RFC 8908) to enable smooth captive portal detection in modern operating systems.
