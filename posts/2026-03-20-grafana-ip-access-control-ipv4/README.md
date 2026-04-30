# How to Set Up Grafana IP-Based Access Control with IPv4 Ranges

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, IPv4, Access Control, Security, Configuration, Monitoring, Reverse Proxy

Description: Learn how to restrict Grafana access to specific IPv4 addresses and ranges using Grafana's configuration settings and a reverse proxy.

---

Restricting Grafana access by source IPv4 address helps prevent unauthorized users from reaching your monitoring dashboards. Grafana itself can be bound to a specific IPv4 interface, while source IP allow/deny rules are typically enforced at the reverse proxy or firewall layer.

## Method 1: Grafana HTTP Binding

Bind Grafana to a specific IPv4 address to prevent access from other interfaces. This limits which local interface Grafana listens on, but it does not filter client source IP ranges.

```ini
# /etc/grafana/grafana.ini

[server]
# Bind Grafana to a specific IPv4 address (e.g., internal network only)

# 0.0.0.0 = all interfaces; specify an IP to restrict
http_addr = 192.168.1.10

http_port = 3000

# Used as part of Grafana's root URL
domain = grafana.example.com
```

```bash
systemctl restart grafana-server
ss -tlnp | grep :3000   # Should show only 192.168.1.10:3000
```

## Method 2: Nginx Reverse Proxy with IP Restriction

Run Grafana on localhost only and expose it through Nginx with IP-based allow/deny.

```ini
# /etc/grafana/grafana.ini
[server]
http_addr = 127.0.0.1   # Only listen on loopback
http_port = 3000
domain = grafana.example.com
root_url = http://grafana.example.com/
```

```nginx
# /etc/nginx/sites-available/grafana
server {
    listen 192.168.1.10:80;
    server_name grafana.example.com;

    # Allow access from internal networks only
    allow 10.0.0.0/8;
    allow 192.168.0.0/16;

    # Allow specific admin workstations
    allow 203.0.113.5;

    # Deny all other IPs
    deny all;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Proxy Grafana Live WebSocket connections
    location /api/live/ {
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_pass http://127.0.0.1:3000;
    }
}
```

```bash
nginx -t && systemctl reload nginx
```

## Method 3: Grafana Auth Proxy Whitelist (Proxy IPs Only)

Grafana does not provide a documented `authorized_ip_ranges` setting for restricting end-user access by client IP. The documented Grafana IP whitelist is `auth.proxy.whitelist`, which only limits which reverse proxy IPs are allowed to send auth headers to Grafana.

```ini
# /etc/grafana/grafana.ini
[auth.proxy]
enabled = true
header_name = X-WEBAUTH-USER

# Only trust auth proxy headers from these IPs
whitelist = 127.0.0.1, 192.168.1.10
```

## Method 4: Firewall Rules

For all Grafana editions, use OS-level firewall rules.

```bash
# Allow Grafana access from the internal network
ufw allow from 192.168.1.0/24 to any port 3000

# Allow from a specific admin machine
ufw allow from 203.0.113.5 to any port 3000

# Deny all other access to port 3000
ufw deny 3000

# or with iptables:
iptables -A INPUT -p tcp --dport 3000 -s 192.168.1.0/24 -j ACCEPT
iptables -A INPUT -p tcp --dport 3000 -s 203.0.113.5 -j ACCEPT
iptables -A INPUT -p tcp --dport 3000 -j DROP
```

## Logging Access Denials

```bash
# If using Nginx, denied IPs appear in the error log
tail -f /var/log/nginx/error.log | grep "forbidden"

# Or enable access logging to see both allowed and denied
tail -f /var/log/nginx/access.log | awk '$9 == "403"'
```

## Key Takeaways

- Set `http_addr` in `grafana.ini` to bind Grafana to an internal IPv4 address only, but use a reverse proxy or firewall for source IP filtering.
- Use Nginx `allow`/`deny` rules in the reverse proxy for granular IP-based access control.
- Grafana's documented IP whitelist is `[auth.proxy] whitelist`, which trusts proxy IPs and is not a general client IP allowlist.
- Firewall rules (ufw/iptables) provide the deepest protection independent of Grafana or Nginx.
- Always pair IP restrictions with authentication (Grafana login) for defense in depth.
