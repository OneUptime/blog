# How to Troubleshoot 502 Bad Gateway Errors with Nginx and Portainer (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Nginx, Troubleshooting, 502, Networking

Description: Learn how to systematically diagnose and fix 502 Bad Gateway errors when using Nginx or Nginx Proxy Manager as a reverse proxy in front of Portainer.

## Introduction

A 502 Bad Gateway error means Nginx received an invalid response from the upstream server (Portainer). This can occur due to network misconfiguration, Portainer not running, wrong port settings, or SSL/TLS mismatch between Nginx and Portainer. This guide provides a systematic approach to identifying and fixing each cause.

## Prerequisites

- Nginx or Nginx Proxy Manager deployed as a proxy for Portainer
- Access to Nginx logs and Docker commands
- Basic understanding of Docker networking

## Step 1: Verify Portainer Is Running

The most common cause of 502 is the backend simply not running:

```bash
# Check Portainer container status

docker ps | grep portainer

# If stopped, check why it stopped
docker ps -a | grep portainer
docker logs portainer --tail=50

# Restart if stopped
docker start portainer

# Check what ports the container exposes
docker inspect portainer | jq '.[].Config.ExposedPorts'
docker ps --filter name=portainer --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
# Expected: 9443/tcp for current default HTTPS installs.
# Port 9000 is legacy HTTP and may also appear if enabled for compatibility.
```

## Step 2: Verify Network Connectivity

502 often means Nginx can't reach Portainer on the network:

```bash
# Replace these example names with your actual proxy container and shared network
PROXY_CONTAINER=nginx-proxy-manager
PROXY_NETWORK=proxy

# Check what networks Portainer is on
docker inspect portainer | jq '.[].NetworkSettings.Networks | keys'

# Check what networks the proxy is on
docker inspect "$PROXY_CONTAINER" | jq '.[].NetworkSettings.Networks | keys'

# They must share at least one network
# If not, connect Portainer to the proxy network
docker network connect "$PROXY_NETWORK" portainer

# Test connectivity from the proxy to Portainer's default HTTPS listener
docker exec "$PROXY_CONTAINER" wget -qO- --timeout=5 --no-check-certificate https://portainer:9443 && echo "SUCCESS" || echo "FAILED"

# If your deployment uses Portainer's legacy/internal HTTP listener instead
docker exec "$PROXY_CONTAINER" wget -qO- --timeout=5 http://portainer:9000 && echo "SUCCESS" || echo "FAILED"

# Try by IP if name resolution fails
PORTAINER_IP=$(docker inspect portainer | jq -r ".[].NetworkSettings.Networks[\"${PROXY_NETWORK}\"].IPAddress")
docker exec "$PROXY_CONTAINER" wget -qO- --timeout=5 --no-check-certificate "https://${PORTAINER_IP}:9443" && echo "SUCCESS" || echo "FAILED"
# Use http://${PORTAINER_IP}:9000 instead if you are proxying to legacy/internal HTTP
```

## Step 3: Check Nginx Error Logs

```bash
# For Nginx Proxy Manager
docker logs nginx-proxy-manager 2>&1 | grep -i "error\|upstream\|502\|connect"

# For standalone Nginx
docker exec nginx cat /var/log/nginx/error.log | tail -50

# For host-installed Nginx
sudo tail -50 /var/log/nginx/error.log

# Common error messages and meanings:
# "connect() failed (111: Connection refused)"
#   → Portainer not running or wrong port
# "no live upstreams while connecting to upstream"
#   → All backend servers are down/unreachable
# "upstream timed out (110: Connection timed out)"
#   → Network unreachable or firewall blocking
# "SSL_do_handshake() failed (SSL: error)"
#   → Nginx configured for HTTP but Portainer using HTTPS (or vice versa)
```

## Step 4: Fix Scheme Mismatch (HTTP vs HTTPS)

A frequent 502 cause is scheme mismatch between Nginx and Portainer. Current Portainer installs expose the UI on port 9443 with HTTPS by default; port 9000 is legacy HTTP and is still used in some reverse-proxy deployments:

```nginx
# WRONG if your Portainer upstream is serving HTTP on port 9000
location / {
    proxy_pass https://portainer:9000;    # Wrong! Port 9000 is HTTP
}

# CORRECT for Portainer's legacy/internal HTTP listener (port 9000)
location / {
    proxy_pass http://portainer:9000;
}

# CORRECT for Portainer's default HTTPS listener (port 9443)
location / {
    proxy_pass https://portainer:9443;
    proxy_ssl_verify off;    # Portainer uses a self-signed cert by default
}
```

```text
# In Nginx Proxy Manager GUI:
# If Portainer uses its default HTTPS port 9443:
#   Scheme: https, Forward Port: 9443
# Then add in Advanced tab: proxy_ssl_verify off;

# If Portainer uses HTTP port 9000:
#   Scheme: http, Forward Port: 9000
```

## Step 5: Fix Container Name Resolution

```bash
# Verify container name is correct
docker ps --format "{{.Names}}"

# If Portainer container is named differently (e.g., portainer_portainer_1)
docker ps | grep portainer

# Use exact container name in NPM/Nginx config
# Or use the container IP address as fallback
PROXY_NETWORK=proxy   # Replace with your shared network name
PORTAINER_IP=$(docker inspect portainer | jq -r ".[].NetworkSettings.Networks[\"${PROXY_NETWORK}\"].IPAddress")
echo "Use this IP: $PORTAINER_IP"

# In NPM: set Forward Hostname/IP to the IP instead of container name
```

## Step 6: Check for Port Conflicts

```bash
# Verify no other service is on the same published port
sudo ss -tlnp | grep -E ':(80|443|9000|9443)\b'

# Check if a firewall rule is blocking
sudo iptables -L INPUT -v -n | grep DROP
sudo ufw status verbose
```

## Step 7: WebSocket Issues Causing 502

Portainer's terminal and console use WebSockets. Missing WebSocket config can cause partial 502s:

```nginx
# Put this map in the http {} context
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

# Required Nginx configuration for Portainer WebSockets
location / {
    proxy_pass http://portainer:9000;         # Or https://portainer:9443 with proxy_ssl_verify off;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;     # WebSocket upgrade
    proxy_set_header Connection $connection_upgrade;
    proxy_set_header Host $host;
    proxy_read_timeout 900;                      # Long timeout for terminal sessions
}
```

```text
# In Nginx Proxy Manager:
# Details tab: "Websockets Support" checkbox must be ON
```

## Step 8: Complete Nginx Portainer Config

Working standalone Nginx configuration for reference:

```nginx
# Put this in the http {} context, outside the server block
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    listen 443 ssl;
    http2 on;
    server_name portainer.example.com;

    ssl_certificate /etc/letsencrypt/live/portainer.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/portainer.example.com/privkey.pem;

    location / {
        proxy_pass http://portainer:9000;    # Use https://portainer:9443 if your upstream is HTTPS
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 900;
        # proxy_ssl_verify off;              # Uncomment when proxying to Portainer's default self-signed HTTPS on 9443
    }
}
```

## Conclusion

502 Bad Gateway errors with Nginx and Portainer almost always come from one of three causes: Portainer not running, network isolation between containers, or scheme/port misconfiguration. For current Portainer installs, 9443/HTTPS is the default UI listener and 9000 is legacy HTTP. Always check network connectivity first from the proxy container using the exact scheme and port Portainer is actually serving, then verify the scheme matches Portainer's actual protocol, and ensure WebSocket support is enabled for Portainer's console functionality.
