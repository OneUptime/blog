# How to Configure Grafana to Listen on a Specific IPv4 Address

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, IPv4, Configuration, Monitoring, HTTP, Dashboard

Description: Configure Grafana to bind to a specific IPv4 address using grafana.ini, set the HTTP port and root URL, and restrict access with firewall rules.

## Introduction

Grafana defaults to listening on all interfaces (0.0.0.0:3000). Binding it to a specific IPv4 address is important when you want to place Grafana behind a reverse proxy on a different interface, or restrict it to the monitoring network.

## Grafana Configuration

```ini
# /etc/grafana/grafana.ini

[server]
# Specific IPv4 to bind to

http_addr = 10.0.0.5
http_port = 3000

# Protocol: http, https, h2, socket, or socket_h2
protocol = http

# Public-facing host/IP used for links and redirects
domain = 10.0.0.5

# Root URL (important for correct redirect URLs)
root_url = http://10.0.0.5:3000/

# For Unix socket binding, set protocol = socket and configure:
# socket = /run/grafana/grafana.sock
```

## Using HTTPS

```ini
# /etc/grafana/grafana.ini

[server]
http_addr = 10.0.0.5
http_port = 443
protocol = https
cert_file = /etc/grafana/ssl/grafana.crt
cert_key  = /etc/grafana/ssl/grafana.key
root_url = https://grafana.example.com/
```

## Behind a Reverse Proxy

```ini
# /etc/grafana/grafana.ini
# When Grafana is behind Nginx/Apache on a different IP

[server]
http_addr = 127.0.0.1    # Bind to localhost only
http_port = 3000
protocol = http
domain = grafana.example.com
root_url = https://grafana.example.com/

# Keep false unless Grafana is served from a sub-path
serve_from_sub_path = false
```

```nginx
# Nginx reverse proxy configuration
server {
    listen 10.0.0.5:443 ssl;
    server_name grafana.example.com;

    ssl_certificate /etc/nginx/ssl/grafana.crt;
    ssl_certificate_key /etc/nginx/ssl/grafana.key;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Security Settings

```ini
# /etc/grafana/grafana.ini

[security]
# Initial admin credentials (used on first start)
admin_user = admin
admin_password = StrongAdminPass!
secret_key = RandomSecretKeyHere

# Protect cookies
cookie_secure = true    # Only if using HTTPS
cookie_samesite = lax

[users]
# Disable user signup
allow_sign_up = false
```

## Applying and Verifying

```bash
sudo systemctl restart grafana-server

# Verify Grafana is listening on correct IP
sudo ss -tlnp | grep grafana
# Expected: 10.0.0.5:3000

# Test access
curl -s http://10.0.0.5:3000/api/health | python3 -m json.tool
# Expected: {"commit":"...","database":"ok","version":"..."}
```

## Firewall Rules

```bash
# Allow Grafana from admin workstations only
sudo ufw allow from 10.0.0.0/24 to any port 3000 proto tcp
sudo ufw deny 3000/tcp

# If behind reverse proxy:
# Only allow Nginx to access Grafana on localhost
# No external firewall rules needed for Grafana port
```

## Conclusion

Configure Grafana's bind address with `http_addr` in `grafana.ini`. Set `domain` and `root_url` to match the actual hostname/IP users use to access Grafana. When placing behind a reverse proxy, bind to `127.0.0.1` and configure `root_url` with the external URL. Always set a strong admin password and disable anonymous access for production deployments.
