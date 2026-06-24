# How to Fix WebSocket Connection Issues in Portainer Behind a Proxy (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, WebSocket, Reverse Proxy, Troubleshooting, Nginx

Description: Configure reverse proxies to properly support WebSocket connections required by Portainer for container terminals, log streaming, and real-time statistics.

## Introduction

Portainer uses WebSocket connections for interactive console features such as the container console and Kubernetes shell. Container logs and container statistics in the UI use regular HTTP requests, but interactive shells depend on successful WebSocket upgrades. Without proper WebSocket support in your reverse proxy, these shell features fail with connection errors or disconnect after a few seconds.

## Features That Require WebSocket

| Feature | WebSocket Use |
|---------|--------------|
| Container Console/Terminal | Interactive shell via WebSocket |
| Container Attach | Interactive attached session via WebSocket |
| Kubernetes Shell | `kubectl exec` sessions |

## Step 1: Diagnose WebSocket Failure

```bash
# Check browser console for WebSocket errors

# F12 → Console tab → look for:
# "WebSocket connection to 'wss://...' failed"
# "Error during WebSocket handshake"
# "Unexpected response code: 400"

# Install wscat (used in Step 6 to test the actual Portainer exec WebSocket)
npm install -g wscat
```

## Step 2: Nginx - Complete WebSocket Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name portainer.yourdomain.com;

    ssl_certificate /etc/ssl/certs/portainer.crt;
    ssl_certificate_key /etc/ssl/private/portainer.key;

    location / {
        proxy_pass https://localhost:9443;

        # --- WebSocket Support --- (CRITICAL)
        # Required before nginx 1.29.7; safe to keep for compatibility
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # --- Standard Headers ---
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # --- Timeout Settings ---
        # Long timeout for terminal sessions
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        proxy_connect_timeout 60s;

        # --- Body Size ---
        # Allow large image uploads
        client_max_body_size 500m;
    }
}
```

## Step 3: Apache - WebSocket Configuration

```apache
<VirtualHost *:443>
    ServerName portainer.yourdomain.com

    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/portainer.crt
    SSLCertificateKeyFile /etc/ssl/private/portainer.key

    # Enable required modules:
    # sudo a2enmod proxy proxy_http proxy_wstunnel ssl rewrite headers

    # WebSocket requests (Upgrade header present)
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} =websocket [NC]
    RewriteRule /(.*)           wss://localhost:9443/$1 [P,L]

    # Regular HTTP requests
    ProxyPass / https://localhost:9443/
    ProxyPassReverse / https://localhost:9443/

    # SSL Verification for backend
    SSLProxyEngine on
    SSLProxyVerify none
    SSLProxyCheckPeerCN off
    SSLProxyCheckPeerName off

    # Headers
    RequestHeader set X-Forwarded-Proto "https"
    ProxyPreserveHost On

    # Timeouts
    ProxyTimeout 3600
    Timeout 3600
</VirtualHost>
```

## Step 4: Traefik - WebSocket Configuration

Traefik supports WebSocket natively, but needs proper configuration:

```yaml
# docker-compose.yml with Traefik
services:
  traefik:
    image: traefik:v3
    command:
      - "--entrypoints.websecure.address=:443"
      - "--providers.docker=true"
      # WebSocket is enabled by default in Traefik v2+

  portainer:
    image: portainer/portainer-ce:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.portainer.rule=Host(`portainer.yourdomain.com`)"
      - "traefik.http.routers.portainer.entrypoints=websecure"
      - "traefik.http.routers.portainer.tls=true"
      # Backend connection
      - "traefik.http.services.portainer.loadbalancer.server.port=9000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
```

For Traefik static configuration:

```yaml
# traefik.yml
entryPoints:
  websecure:
    address: ":443"
    transport:
      # Increase idle timeout for long-running shell sessions
      respondingTimeouts:
        idleTimeout: 3600s
```

## Step 5: HAProxy - WebSocket Configuration

```text
frontend portainer_frontend
    bind *:443 ssl crt /etc/ssl/portainer.pem
    mode http
    default_backend portainer_backend

    # WebSocket detection
    acl is_websocket hdr(Upgrade) -i WebSocket
    use_backend portainer_ws_backend if is_websocket

backend portainer_backend
    mode http
    option forwardfor
    option http-server-close
    server portainer1 localhost:9443 ssl verify none

backend portainer_ws_backend
    mode http
    option forwardfor
    # Keep WebSocket connections alive
    timeout tunnel 3600s
    server portainer1 localhost:9443 ssl verify none
```

## Step 6: Test WebSocket After Fix

```bash
# 1. Create an exec session through Portainer's Docker API proxy
curl -sS -X POST \
  -H "X-API-Key: YOUR_PORTAINER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"AttachStdin":true,"AttachStdout":true,"AttachStderr":true,"Tty":true,"Cmd":["sh"]}' \
  https://portainer.yourdomain.com/api/endpoints/1/docker/containers/YOUR_CONTAINER_ID/exec

# Response includes: {"Id":"<EXEC_ID>"}

# 2. Test the actual WebSocket endpoint that Portainer uses for the console
wscat -H "X-API-Key: YOUR_PORTAINER_API_KEY" \
  -c "wss://portainer.yourdomain.com/api/websocket/exec?endpointId=1&id=<EXEC_ID>"

# Success: "Connected (press CTRL+C to quit)"
# Failure: "error: Unexpected server response: 400/401/502/etc"
```

## Step 7: Fix Nginx "Connection Reset" During Long Console Sessions

If the container console or Kubernetes shell works initially then cuts out:

```nginx
# Increase the read timeout for long-running interactive sessions
proxy_read_timeout 86400s;  # 24 hours
```

## Step 8: Verify with Browser Network Tab

```bash
# In Chrome DevTools → Network tab:
# 1. Filter by "WS" (WebSocket)
# 2. Connect to a container terminal in Portainer
# 3. You should see a WebSocket connection with:
#    - Status: 101 (Switching Protocols)
#    - Type: websocket
# 4. Click the connection to see Messages tab

# If you see 400 or 502: proxy is not upgrading the connection correctly
# If you see 401 or 403: authentication/session handling is failing
# If connection closes immediately: proxy timeout is too short
```

## Conclusion

WebSocket support in Portainer reverse proxy configurations mainly matters for interactive console features such as the container console, attach session, and Kubernetes shell. On Nginx, forwarding the `Upgrade` and `Connection` headers is essential, and `proxy_http_version 1.1` is required on older Nginx releases and remains a safe compatibility setting. Increase proxy timeouts to prevent session drops during long-running terminal sessions.
