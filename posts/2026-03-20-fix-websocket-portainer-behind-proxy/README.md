# How to Fix WebSocket Connection Issues in Portainer Behind a Proxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Troubleshooting, WebSocket, Reverse Proxy, Nginx, Traefik, Networking

Description: Learn how to fix WebSocket connection failures in Portainer when deployed behind Nginx, Traefik, or Caddy, enabling the container console and log streaming features.

---

Portainer uses WebSocket connections for the container console (exec) and other interactive shell features. If a reverse proxy does not preserve WebSocket upgrade requests, these features break.

## How WebSocket Proxying Works

A WebSocket connection starts as an HTTP request with an `Upgrade: websocket` header. The proxy must:

1. Forward the `Upgrade` and `Connection` headers
2. For proxies that require an explicit upstream protocol version, use HTTP/1.1 for the upgrade handshake
3. Allow long-lived connections without short read timeouts

## Nginx Configuration

```nginx
# Place this map in the `http` context, not inside the `server` block.
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    listen 443 ssl;
    server_name portainer.example.com;

    location / {
        proxy_pass http://portainer:9000;
        proxy_http_version 1.1;

        # Required WebSocket headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Disable buffering for WebSocket streams
        proxy_buffering off;
        proxy_cache off;

        # Keep connection alive for long-lived WebSocket sessions
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
```

## Traefik Configuration

```yaml
# In Traefik labels for the Portainer service

labels:
  - "traefik.enable=true"
  - "traefik.http.routers.portainer.rule=Host(`portainer.example.com`)"
  - "traefik.http.routers.portainer.entrypoints=websecure"
  - "traefik.http.services.portainer.loadbalancer.server.port=9000"
  # Traefik handles WebSocket upgrades automatically
  # Ensure HTTP middleware is not stripping Upgrade headers
```

## Caddy Configuration

```caddy
portainer.example.com {
    # Caddy handles WebSocket upgrade automatically
    reverse_proxy portainer:9000
}
```

## Testing WebSocket Connectivity

Portainer's console WebSocket URLs are authenticated and include query parameters such as the environment and exec or attach ID. Because of that, testing a guessed endpoint like `/api/websocket` with `wscat` is not a reliable validation method.

## Verifying in Browser DevTools

Open DevTools Network tab and filter by **WS**. When you open a container console, you should see an entry with:

- Request path: `/api/websocket/exec` or `/api/websocket/attach`
- Status: `101 Switching Protocols`
- Type: `websocket`
