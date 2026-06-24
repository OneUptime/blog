# How to Configure Nginx Proxy Manager to Forward Traffic to Portainer (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Nginx Proxy Manager, Proxy, Configuration, Networking

Description: Learn how to configure Nginx Proxy Manager proxy hosts to route traffic to Portainer correctly, including WebSocket support, custom headers, and troubleshooting connection issues.

## Introduction

While Nginx Proxy Manager simplifies proxy configuration through its web UI, forwarding traffic to Portainer requires specific settings to handle WebSocket connections (used by Portainer's terminal), the correct scheme, and, when needed, longer proxy timeouts. This guide covers the NPM configuration for Portainer and common edge cases.

## Prerequisites

- Nginx Proxy Manager running and accessible
- Portainer running on the same Docker network as NPM
- A domain name pointing to your server

## Step 1: Verify Network Connectivity

Before configuring NPM, confirm Portainer is reachable from the NPM container:

```bash
# Get the NPM container name or ID

docker ps | grep nginx-proxy-manager

# Replace <npm-container> and <portainer-container> with the actual container names or IDs
# Match the scheme/port here to the one you will use in NPM
docker exec <npm-container> wget -qO- -T 5 http://portainer:9000 >/dev/null && echo "OK" || echo "FAILED"

# If that fails, check shared networks
docker inspect <npm-container> | jq '.[].NetworkSettings.Networks | keys'
docker inspect <portainer-container> | jq '.[].NetworkSettings.Networks | keys'

# Both must share at least one network
```

## Step 2: Configure Portainer Proxy Host in NPM

In the NPM web interface at `http://YOUR_SERVER:81`:

**Details Tab:**
```bash
Domain Names:        portainer.example.com
Scheme:              http           (use this when Portainer's HTTP listener on port 9000 is enabled)
Forward Hostname/IP: portainer      (service/container DNS name on the shared Docker network)
Forward Port:        9000
Block Common Exploits: ON
Websockets Support:  ON             (CRITICAL - required for Portainer terminal/console)
```

**For Portainer with HTTPS (port 9443) or when HTTP on 9000 is disabled:**
```text
Scheme:              https
Forward Port:        9443
```

## Step 3: SSL Configuration in NPM

**SSL Tab:**
```text
SSL Certificate:     Request a new SSL Certificate
Force SSL:           ON             (redirect HTTP to HTTPS)
HTTP/2 Support:      ON
HSTS Enabled:        ON
HSTS Subdomains:     OFF            (unless you want all subdomains forced HTTPS)
Email Address:       your-email@example.com
Use a DNS Challenge: OFF            (HTTP challenge for publicly accessible server)
                     ON             (DNS challenge for private/internal server)
```

## Step 4: Advanced Tab for Portainer-Specific Tuning

Under the **Advanced** tab, add custom Nginx configuration only if you need longer upstream timeouts:

```nginx
# NPM already sets the standard proxy headers.
# Use this box for Portainer-specific tuning such as longer timeouts.
# Increase timeouts for long-running Portainer operations
proxy_read_timeout 900;
proxy_send_timeout 900;
```

## Step 5: Configure Access Lists (Optional Security)

Restrict Portainer access to specific IPs via NPM Access Lists:

1. Go to **Access Lists** → **Add Access List**
2. Configure:

```text
Name: Internal Only
Satisfy Any: OFF        (if you add basic auth below, require both the allowlist and auth)
Pass Auth to Host: OFF

Access tab:
  Action: allow
  IP/CIDR: 192.168.1.0/24    (your internal network)
  Action: allow
  IP/CIDR: 10.0.0.0/8        (VPN range)

Authorization tab:
  (optional: add HTTP basic auth as a second factor)
```

3. In the Portainer proxy host, set **Access List** to "Internal Only"

## Step 6: Verify the Configuration

```bash
# Test HTTP to HTTPS redirect
curl -I http://portainer.example.com
# Expected: 301 Location: https://portainer.example.com

# Test HTTPS connection
curl -I https://portainer.example.com
# Expected: 200 OK

# Verify WebSocket handling by signing in and opening Portainer's console/exec UI.
# A plain curl -I request does not perform a WebSocket upgrade handshake.

# Check NPM logs for any proxy errors
docker logs <npm-container> 2>&1 | grep -i "error\|portainer"
```

## Step 7: Troubleshoot NPM to Portainer Forwarding

```bash
# 502 Bad Gateway:
# → NPM can't reach Portainer
# Fix: Verify same Docker network, check portainer container is running
docker network connect <shared-network-name> <portainer-container>    # Use the actual network and container names

# 504 Gateway Timeout:
# → Connection reached but Portainer didn't respond in time
# Fix: Increase proxy_read_timeout in Advanced tab

# WebSocket disconnects in Portainer console:
# → WebSocket support not enabled
# Fix: Enable "Websockets Support" in NPM proxy host Details tab

# HTTPS upstream errors when forwarding to Portainer on 9443:
# → Usually caused by the wrong upstream scheme/port or by HTTP on 9000 being disabled
# Fix: Set Scheme=https and Forward Port=9443; if you proxy to 9000 instead, make sure Portainer HTTP is enabled
```

## Conclusion

Forwarding traffic from Nginx Proxy Manager to Portainer requires enabling WebSocket support, setting the correct forward scheme and port, and configuring appropriate timeouts for long-running operations. The NPM Advanced tab's custom Nginx configuration provides fine-grained control over proxy behavior. For security, combine NPM's Access Lists with forced SSL to ensure Portainer is only accessible from trusted IP ranges over HTTPS.
