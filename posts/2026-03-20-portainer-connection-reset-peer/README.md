# How to Fix 'Connection Reset by Peer' Errors in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Troubleshooting, Networking, Reverse Proxy

Description: Diagnose and fix 'Connection Reset by Peer' errors in Portainer, which commonly occur when using reverse proxies, WebSocket connections, or TLS misconfiguration.

## Introduction

"Connection Reset by Peer" (TCP RST) errors in Portainer typically indicate that a connection was established but then forcibly closed by the remote side. This is different from "Connection Refused" (which means no connection was established at all). The most common causes are reverse proxy timeouts, WebSocket upgrade failures, and TLS handshake issues.

## Common Causes

1. Reverse proxy timeout closing idle WebSocket connections
2. Missing WebSocket upgrade headers in proxy configuration
3. TLS certificate mismatch or SNI issues
4. Incorrect upstream protocol or port (`9000` for HTTP vs `9443` for HTTPS)
5. Network equipment (load balancers, firewalls) closing long-lived connections

## Step 1: Identify When the Error Occurs

```bash
# Check Portainer logs during the error

docker logs -f --tail 50 portainer

# Check for WebSocket-related errors
docker logs portainer 2>&1 | grep -Ei "websocket|reset|pipe|eof"
```

## Scenario 1: Error Occurs in Browser Console

If you see "ERR_CONNECTION_RESET" in Chrome or Firefox:

```bash
# Open browser developer tools → Network tab
# Look for failed WebSocket connections (protocol: ws:// or wss://)
# These are used for:
# - Container console/terminal
# - Log streaming
# - Real-time stats
```

This almost always indicates a reverse proxy WebSocket configuration issue.

## Scenario 2: Nginx Reverse Proxy - Fix WebSocket Support

```nginx
server {
    listen 443 ssl;
    server_name portainer.yourdomain.com;

    # Required for WebSocket connections in Portainer
    location / {
        proxy_pass http://localhost:9000;

        proxy_http_version 1.1;

        # WebSocket upgrade headers - CRITICAL
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Increase timeouts for long-running operations
        proxy_read_timeout 900s;
        proxy_connect_timeout 60s;
        proxy_send_timeout 900s;

        # Disable buffering for real-time log streaming
        proxy_buffering off;
        proxy_cache off;

        # Allow large request bodies for image uploads
        client_max_body_size 1000m;
    }
}
```

## Scenario 3: Apache Reverse Proxy - Fix WebSocket Support

```apache
<VirtualHost *:443>
    ServerName portainer.yourdomain.com

    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/portainer.crt
    SSLCertificateKeyFile /etc/ssl/private/portainer.key

    # Enable required Apache modules
    # a2enmod proxy proxy_http headers ssl

    ProxyPass / http://localhost:9000/ upgrade=websocket
    ProxyPassReverse / http://localhost:9000/

    # Headers
    RequestHeader set X-Forwarded-Proto "https"
    ProxyPreserveHost On

    # Timeout settings
    ProxyTimeout 900
    Timeout 900
</VirtualHost>
```

## Scenario 4: Traefik - Fix Connection Reset

Traefik handles WebSocket upgrades automatically, so the main fix is using the correct backend service:

```yaml
# traefik.yml dynamic configuration
http:
  routers:
    portainer:
      rule: "Host(`portainer.yourdomain.com`)"
      service: portainer
      tls:
        certResolver: letsencrypt

  services:
    portainer:
      loadBalancer:
        servers:
          - url: "http://portainer:9000/"
```

## Scenario 5: Cloudflare - Connection Reset by Peer

Cloudflare supports proxied WebSockets, but the zone WebSocket setting and tunnel origin settings can still cause issues:

```bash
# In Cloudflare dashboard:
# 1. Network → WebSockets → On
# 2. SSL/TLS → Edge Certificates → Minimum TLS Version → TLS 1.2 or higher
# 3. If Rocket Loader is enabled for the Portainer hostname, disable it and retest

# For the Cloudflare tunnel, ensure WebSocket support:
# Tunnels → Configuration → Add Public Hostname
# Service: http://portainer:9000
# Additional settings → HTTP Host Header: portainer.yourdomain.com
#
# If you must use https://portainer:9443, set No TLS Verify for a self-signed
# origin certificate or install a certificate that cloudflared trusts.
```

## Scenario 6: AWS ALB / Load Balancer

For AWS Application Load Balancers:

1. Ensure the target group protocol matches your backend (`HTTP` on `9000` or `HTTPS` on `9443`)
2. Set idle timeout to at least 600 seconds (default is 60)
3. If you use multiple target groups, verify the listener forwards Portainer to the intended one

```bash
# AWS CLI: update ALB target group idle timeout
aws elbv2 modify-load-balancer-attributes \
  --load-balancer-arn arn:aws:elasticloadbalancing:... \
  --attributes Key=idle_timeout.timeout_seconds,Value=600
```

## Scenario 7: Check for Network MTU Issues

```bash
# MTU mismatches are less common, but can cause TCP RST
# Check Docker network MTU
docker network inspect bridge --format '{{json .Options}}'

# Check the default route and active interface MTU
ip route show default
ip link show

# If Docker's bridge MTU needs to change, edit /etc/docker/daemon.json
sudo mkdir -p /etc/docker
sudoedit /etc/docker/daemon.json

# Add or update:
# {
#   "mtu": 1450
# }

sudo systemctl restart docker
```

## Conclusion

"Connection Reset by Peer" in Portainer is most often a proxy or network path issue. The most common fixes are using the correct backend port and protocol, ensuring WebSocket upgrades work end-to-end, and increasing idle timeouts for long-running operations like log streaming and container terminals. Apply the appropriate fix for your proxy (Nginx, Apache, Traefik, Cloudflare, or your load balancer) and the resets should stop once the underlying issue is corrected.
