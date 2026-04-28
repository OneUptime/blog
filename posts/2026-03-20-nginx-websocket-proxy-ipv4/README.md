# How to Configure Nginx to Proxy WebSocket Connections on IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Nginx, WebSocket, IPv4, Reverse Proxy, Networking, TLS

Description: Learn how to configure Nginx as a reverse proxy for WebSocket connections over IPv4, with the required Upgrade and Connection headers, TLS termination, and load balancing configuration.

## Why WebSocket Proxying Needs Special Configuration

Standard HTTP proxies buffer complete responses. WebSocket is a long-lived bidirectional connection that requires HTTP protocol upgrade - Nginx must be told to pass the `Upgrade` and `Connection` headers and use HTTP/1.1 for persistent connections.

## Basic WebSocket Proxy

```nginx
upstream ws_backend {
    server 127.0.0.1:8765;
    keepalive 32;
}

server {
    listen 80;
    server_name ws.example.com;

    location /ws {
        proxy_pass http://ws_backend;

        # Required for WebSocket upgrade
        proxy_http_version 1.1;
        proxy_set_header Upgrade    $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Forward client IP
        proxy_set_header Host            $host;
        proxy_set_header X-Real-IP       $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # Keep WebSocket connections alive (default is 60s)
        proxy_read_timeout  3600s;
        proxy_send_timeout  3600s;
        proxy_connect_timeout 5s;
    }
}
```

## WebSocket with TLS Termination (wss://)

```nginx
upstream ws_backend {
    server 127.0.0.1:8765;
    keepalive 32;
}

server {
    listen 443 ssl;
    server_name ws.example.com;

    ssl_certificate     /etc/ssl/ws.crt;
    ssl_certificate_key /etc/ssl/ws.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    location /ws {
        proxy_pass http://ws_backend;   # backend is plain ws://
        proxy_http_version 1.1;
        proxy_set_header Upgrade    $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host       $host;
        proxy_set_header X-Real-IP  $remote_addr;
        proxy_read_timeout 3600s;
    }

    # Regular HTTP endpoints on the same server
    location / {
        proxy_pass http://127.0.0.1:8080;
    }
}
```

## HTTP Redirect + WebSocket on Same Server

```nginx
# Separate server block for HTTP redirect

server {
    listen 80;
    server_name ws.example.com;
    return 301 https://$host$request_uri;
}
```

## Load Balancing WebSockets with Sticky Sessions

```nginx
upstream ws_pool {
    ip_hash;   # Pin each client IP to the same backend
    server 10.0.0.1:8765;
    server 10.0.0.2:8765;
    server 10.0.0.3:8765 backup;
    keepalive 64;
}

server {
    listen 80;
    location /ws {
        proxy_pass http://ws_pool;
        proxy_http_version 1.1;
        proxy_set_header Upgrade    $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600s;
    }
}
```

## Key Directive Reference

| Directive | Purpose |
|-----------|---------|
| `proxy_http_version 1.1` | Required - WebSocket's Upgrade mechanism is defined for HTTP/1.1 |
| `proxy_set_header Upgrade $http_upgrade` | Forward the WebSocket upgrade request |
| `proxy_set_header Connection "upgrade"` | Tell backend to keep the connection |
| `proxy_read_timeout 3600s` | Prevent Nginx from closing idle WebSocket connections |
| `ip_hash` | Sticky sessions for stateful WebSocket backends |

## Conclusion

The three lines `proxy_http_version 1.1`, `proxy_set_header Upgrade $http_upgrade`, and `proxy_set_header Connection "upgrade"` are the minimum required for Nginx WebSocket proxying. Set `proxy_read_timeout` to at least 3600 seconds to avoid premature connection drops. Use `ip_hash` for stateful servers that maintain per-connection state. For stateless servers with Redis pub/sub for shared state, standard round-robin is sufficient.
