# How to Fix Container Console Not Loading Behind a Reverse Proxy (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Troubleshooting, Console, Terminal, Reverse Proxy

Description: Resolve issues where Portainer's container console (terminal) fails to load or connect when accessed through a reverse proxy, including WebSocket configuration and HTTPS requirements.

## Introduction

Portainer's container console (the in-browser terminal) uses a WebSocket connection to establish an interactive shell session. When Portainer is served over HTTPS, that connection is `wss://`. When this feature fails behind a reverse proxy, you'll see a blank terminal window, "Connecting..." that never completes, or an immediate error. This guide covers every configuration required.

## How the Container Console Works

1. User clicks "Console" in Portainer UI
2. Portainer UI creates an exec instance via `/api/endpoints/<ENVIRONMENT_ID>/docker/containers/<CONTAINER_ID>/exec`
3. Portainer UI opens a WebSocket connection to `/api/websocket/exec?id=<EXEC_ID>&endpointId=<ENVIRONMENT_ID>`
4. Portainer backend turns that WebSocket into Docker's `POST /exec/<EXEC_ID>/start`
5. Each keystroke is sent through the WebSocket to the container

Any break in this chain causes the console to fail.

## Step 1: Verify the Issue Is Proxy-Related

```bash
# Test the console without the proxy (direct access)

# Open https://your-host:9443 directly (or http://your-host:9000 if you still expose legacy HTTP)
# Try the container console

# If console works directly but not via proxy:
# → Proxy configuration is the issue

# If console fails both directly and via proxy:
# → Check Docker exec permissions and container access
```

## Step 2: Check Browser Console for Specific Errors

```text
F12 → Console tab

Common error messages:
- "WebSocket connection failed" → WebSocket not supported by proxy
- "Error 403" → CSRF or origin validation issue
- "Error 400" → WebSocket upgrade not happening
- Blank terminal, no error → Buffer/flush issue
```

## Step 3: Nginx - Console-Specific Configuration

```nginx
server {
    listen 443 ssl;
    server_name portainer.yourdomain.com;

    ssl_certificate /etc/ssl/certs/portainer.crt;
    ssl_certificate_key /etc/ssl/private/portainer.key;

    # General location block
    location / {
        proxy_pass https://localhost:9443;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Critical for container console
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        proxy_buffering off;  # Don't buffer terminal output
    }

    # Specific location for WebSocket endpoints (console, logs, stats)
    location /api/websocket {
        proxy_pass https://localhost:9443;
        proxy_http_version 1.1;

        # Mandatory WebSocket headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto https;

        # Long timeout for interactive sessions
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        proxy_buffering off;
        proxy_cache off;
    }
}
```

## Step 4: Verify the Frontend WebSocket Scheme Matches the Page

When the Portainer page is served over HTTPS, the browser opens the console over `wss://` to the reverse proxy. The reverse proxy can then connect to Portainer over either HTTP (`http://localhost:9000`) or HTTPS (`https://localhost:9443`) as long as `proxy_pass` matches the Portainer listener you actually exposed:

```bash
# Check which Portainer port is published
docker ps --format 'table {{.Names}}\t{{.Ports}}'

# Common cases:
# - 9443 published => Portainer HTTPS
# - 9000 published => Portainer legacy HTTP

# Match Nginx to the Portainer listener in use:
# proxy_pass https://localhost:9443;
# or
# proxy_pass http://localhost:9000;
```

## Step 5: Fix for Portainer Running on HTTP

If Portainer uses HTTP (port 9000) but proxy uses HTTPS:

```nginx
# Nginx handles TLS termination, talks HTTP to Portainer
server {
    listen 443 ssl;
    server_name portainer.yourdomain.com;

    location / {
        # Connect to Portainer's HTTP port
        proxy_pass http://localhost:9000;

        proxy_http_version 1.1;

        # WebSocket upgrade
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        proxy_read_timeout 3600s;
        proxy_buffering off;
    }
}
```

## Step 6: Create the Exec Session Used by the Console

```bash
# Use Portainer's HTTPS port by default.
# If you still expose legacy HTTP, change https://localhost:9443 to http://localhost:9000.
TOKEN=$(curl -sk -X POST https://localhost:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"yourpassword"}' | jq -r .jwt)

# Create the exec instance that /api/websocket/exec will attach to
EXEC_ID=$(curl -sk -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "https://localhost:9443/api/endpoints/1/docker/containers/CONTAINER_ID/exec" \
  -d '{
    "AttachStdin": true,
    "AttachStdout": true,
    "AttachStderr": true,
    "Tty": true,
    "Cmd": ["/bin/sh"]
  }' | jq -r .Id)

echo "$EXEC_ID"
```

## Step 7: Fix Connection Pooling Issues

Some proxy configurations reuse connections incorrectly for WebSocket:

```nginx
# Prevent connection reuse issues for WebSocket
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    location / {
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        # ...rest of config
    }
}
```

## Step 8: Fix for Kubernetes Portainer with Ingress

```yaml
# Kubernetes Ingress with WebSocket annotations
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: portainer-ingress
  namespace: portainer
  annotations:
    # Portainer defaults to HTTPS on 9443
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-body-size: "500m"
    # WebSocket support
    nginx.ingress.kubernetes.io/proxy-http-version: "1.1"
    nginx.ingress.kubernetes.io/configuration-snippet: |
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
spec:
  rules:
    - host: portainer.yourdomain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: portainer
                port:
                  number: 9443
```

## Step 9: Debugging with curl

```bash
# Simulate a WebSocket upgrade request to the console endpoint
# EXEC_ID must come from Step 6
curl -vk -N \
  --http1.1 \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  -H "Authorization: Bearer $TOKEN" \
  "https://portainer.yourdomain.com/api/websocket/exec?endpointId=1&id=$EXEC_ID"

# Look for: "< HTTP/1.1 101 Switching Protocols"
# Bad: "< HTTP/1.1 400 Bad Request" = proxy not upgrading
# Bad: "< HTTP/1.1 502 Bad Gateway" = backend connection failed
```

## Conclusion

Container console failures behind a reverse proxy are usually WebSocket or timeout configuration issues. The fix is ensuring your proxy sends the `Upgrade` and `Connection: upgrade` headers, sets `proxy_http_version 1.1` for compatibility, and has sufficient timeout values for interactive sessions. Additionally, if the Portainer page is served over HTTPS then the browser-side console connection will use `wss://`, while the reverse proxy should point `proxy_pass` at the Portainer listener you actually exposed (`https://localhost:9443` by default, or `http://localhost:9000` for legacy HTTP).
