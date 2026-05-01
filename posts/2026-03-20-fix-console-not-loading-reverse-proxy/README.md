# How to Fix Container Console Not Loading Behind a Reverse Proxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Troubleshooting, Container Console, WebSocket, Nginx, Reverse Proxy

Description: Learn how to fix the Portainer container console (exec terminal) not loading when accessed behind a reverse proxy by configuring WebSocket and timeout settings.

---

The container console in Portainer uses WebSocket over the `/api/websocket` path. Behind a reverse proxy, the console commonly shows a blank terminal, an immediate disconnect, or a "Connection Lost" error. This guide covers the complete fix.

## Step 1: Diagnose the Failure Mode

Open browser DevTools (`F12`) > Network tab > Filter by **WS**. Click the container's Console button in Portainer:

| WebSocket Status | Meaning |
|---|---|
| No WS connection appears | Proxy blocking before upgrade |
| `400 Bad Request` | Missing Upgrade headers |
| `502 Bad Gateway` | Proxy cannot reach Portainer backend |
| `101` then immediate close | Timeout or proxy terminating idle connection |

## Step 2: Fix Nginx - Full Configuration

```nginx
server {
    listen 443 ssl;
    server_name portainer.example.com;

    ssl_certificate /etc/ssl/certs/portainer.crt;
    ssl_certificate_key /etc/ssl/private/portainer.key;

    # Required for exec endpoint (container console)
    location /api/websocket {
        proxy_pass http://portainer:9000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400s;  # 24 hours - console sessions can be long
        proxy_send_timeout 86400s;
        proxy_buffering off;
    }

    # All other Portainer traffic
    location / {
        proxy_pass http://portainer:9000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

## Step 3: Fix HAProxy

If using HAProxy as the load balancer:

```text
# HAProxy configuration for WebSocket

frontend portainer_frontend
    bind *:443 ssl crt /etc/ssl/portainer.pem
    default_backend portainer_backend

backend portainer_backend
    server portainer portainer:9000 check
    option http-server-close    # Recommended for WebSocket handling
    timeout tunnel 3600s        # Keep tunnel open for console sessions
```

## Step 4: Fix Apache2

```apache
<VirtualHost *:443>
    ServerName portainer.example.com

    ProxyPass /api/websocket http://portainer:9000/api/websocket upgrade=websocket
    ProxyPassReverse /api/websocket http://portainer:9000/api/websocket
    ProxyPass / http://portainer:9000/
    ProxyPassReverse / http://portainer:9000/
    ProxyTimeout 3600
</VirtualHost>
```

## Step 5: Verify the Fix

After updating the reverse proxy configuration, test the console:

1. Open Portainer and navigate to a running container.
2. Click the **>_ Console** tab.
3. Click **Connect**.

You should see a functioning terminal. If the terminal connects but immediately disconnects, increase the idle timeout on your reverse proxy (`proxy_read_timeout` in Nginx, `timeout tunnel` in HAProxy, or `ProxyTimeout` in Apache).
