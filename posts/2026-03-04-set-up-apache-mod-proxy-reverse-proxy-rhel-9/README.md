# How to Set Up Apache mod_proxy for Reverse Proxy on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Apache, mod_proxy, Reverse Proxy, Linux

Description: A practical guide to configuring Apache as a reverse proxy using mod_proxy on RHEL, covering HTTP, WebSocket, and load balancing setups.

---

Apache's mod_proxy module turns your web server into a reverse proxy, forwarding client requests to backend application servers. This is useful for load balancing, SSL termination, and serving multiple applications behind a single public-facing server. This guide covers setting up mod_proxy on RHEL.

## Prerequisites

- A RHEL system with Apache installed and running
- A backend application running on a local or remote port
- Root or sudo access

## Step 1: Enable Required Modules

Apache on RHEL includes the proxy modules, but verify they are loaded:

```bash
# Check which proxy modules are loaded
httpd -M | grep proxy

# You should see:
# proxy_module
# proxy_http_module
# proxy_balancer_module
# proxy_connect_module

# If modules are missing, check the config file
grep -r "proxy" /etc/httpd/conf.modules.d/
```

The proxy modules are defined in `/etc/httpd/conf.modules.d/00-proxy.conf`.

## Step 2: Basic Reverse Proxy Configuration

Create a virtual host that proxies requests to a backend application:

```apache
# /etc/httpd/conf.d/reverse-proxy.conf

<VirtualHost *:80>
    ServerName app.example.com

    # Enable the proxy engine
    ProxyRequests Off

    # Preserve the original Host header
    ProxyPreserveHost On

    # Forward all requests to the backend application on port 3000
    ProxyPass / http://127.0.0.1:3000/
    ProxyPassReverse / http://127.0.0.1:3000/

    # Add proxy headers so the backend knows the original client info
    RequestHeader set X-Forwarded-Proto "http"
    RequestHeader set X-Real-IP "%{REMOTE_ADDR}s"

    ErrorLog logs/app-proxy-error.log
    CustomLog logs/app-proxy-access.log combined
</VirtualHost>
```

```mermaid
graph LR
    A[Client Browser] -->|HTTP Request| B[Apache Reverse Proxy :80]
    B -->|ProxyPass| C[Backend App :3000]
    C -->|Response| B
    B -->|ProxyPassReverse| A
```

## Step 3: Proxy Specific Paths

You can proxy only certain URL paths to different backends:

```apache
<VirtualHost *:80>
    ServerName www.example.com
    DocumentRoot /var/www/html

    # Proxy API requests to a Node.js backend
    ProxyPass /api http://127.0.0.1:3000/api
    ProxyPassReverse /api http://127.0.0.1:3000/api

    # Proxy admin panel to a different backend
    ProxyPass /admin http://127.0.0.1:8080/admin
    ProxyPassReverse /admin http://127.0.0.1:8080/admin

    # Serve static files directly from Apache
    ProxyPass /static !
    Alias /static /var/www/html/static

    # Everything else goes to the main backend
    ProxyPass / http://127.0.0.1:5000/
    ProxyPassReverse / http://127.0.0.1:5000/
</VirtualHost>
```

Note: ProxyPass rules are evaluated in order. The `!` tells Apache not to proxy that path.

## Step 4: WebSocket Proxy

Many modern applications use WebSockets. Configure mod_proxy_wstunnel:

```apache
<VirtualHost *:80>
    ServerName ws.example.com

    # Enable WebSocket proxying
    RewriteEngine On

    # Detect WebSocket upgrade requests and proxy them
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/?(.*) ws://127.0.0.1:3000/$1 [P,L]

    # Regular HTTP requests go through normal proxy
    ProxyPass / http://127.0.0.1:3000/
    ProxyPassReverse / http://127.0.0.1:3000/
</VirtualHost>
```

## Step 5: Load Balancing with mod_proxy_balancer

Distribute traffic across multiple backend servers:

```apache
<VirtualHost *:80>
    ServerName app.example.com

    # Define the load balancer cluster
    <Proxy "balancer://appcluster">
        # Backend server 1 (handles 3x the traffic)
        BalancerMember http://192.168.1.10:3000 loadfactor=3
        # Backend server 2
        BalancerMember http://192.168.1.11:3000 loadfactor=1
        # Hot standby server (only used if others are down)
        BalancerMember http://192.168.1.12:3000 status=+H

        # Use round-robin method (byrequests), bytraffic, or bybusyness
        ProxySet lbmethod=byrequests

        # Enable sticky sessions based on JSESSIONID cookie
        ProxySet stickysession=JSESSIONID
    </Proxy>

    ProxyPass / balancer://appcluster/
    ProxyPassReverse / balancer://appcluster/
</VirtualHost>
```

## Step 6: Configure SELinux for Proxy Connections

SELinux blocks Apache from making outbound network connections by default:

```bash
# Allow Apache to connect to network services (required for proxy)
sudo setsebool -P httpd_can_network_connect on

# If proxying to a specific port, you may also need
sudo setsebool -P httpd_can_network_relay on

# Verify the boolean is set
getsebool httpd_can_network_connect
```

## Step 7: Tune Proxy Settings

```apache
# Connection timeout to backend (seconds)
ProxyTimeout 60

# Number of seconds to wait for a connection to the backend
ProxyConnectTimeout 5

# Retry interval when a backend is down (seconds)
ProxyPass / http://127.0.0.1:3000/ retry=5

# Connection pooling settings
ProxyPass / http://127.0.0.1:3000/ keepalive=On
```

## Step 8: Test and Apply

```bash
# Check configuration syntax
sudo apachectl configtest

# Reload Apache
sudo systemctl reload httpd

# Test the proxy with curl
curl -v http://app.example.com/

# Check the error log for proxy issues
sudo tail -f /var/log/httpd/app-proxy-error.log
```

## Troubleshooting

```bash
# Check if SELinux is blocking proxy connections
sudo ausearch -m avc -ts recent | grep httpd

# Verify the backend is reachable from the server
curl http://127.0.0.1:3000/

# Check if proxy modules are loaded
httpd -M | grep proxy

# Look for proxy errors in the log
sudo grep "proxy" /var/log/httpd/error_log

# Enable debug logging for proxy
LogLevel proxy:debug
```

## Summary

Apache mod_proxy on RHEL lets you route traffic to backend applications, balance load across multiple servers, and handle WebSocket connections. The key configuration items are ProxyPass/ProxyPassReverse directives, the SELinux httpd_can_network_connect boolean, and proper timeout tuning for your backend applications.
