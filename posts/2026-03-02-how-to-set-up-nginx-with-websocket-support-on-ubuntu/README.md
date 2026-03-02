# How to Set Up Nginx with WebSocket Support on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Nginx, WebSocket, Reverse Proxy

Description: Learn how to configure Nginx as a reverse proxy with WebSocket support on Ubuntu, including proper header forwarding and connection upgrade handling.

---

WebSocket connections differ fundamentally from regular HTTP requests. While HTTP is request-response, WebSockets maintain a persistent, bidirectional connection. Nginx handles this well, but requires specific configuration to properly proxy WebSocket traffic.

## Understanding WebSocket Proxying

When a browser initiates a WebSocket connection, it sends an HTTP upgrade request. Nginx must forward this upgrade request to the backend and then transparently pass data in both directions. Without explicit configuration, Nginx will drop the connection upgrade headers and the WebSocket handshake will fail.

The key headers involved are:
- `Upgrade: websocket` - signals the protocol switch
- `Connection: Upgrade` - tells Nginx to keep the connection open for upgrading

## Prerequisites

You need Nginx installed and a backend application that serves WebSockets. If Nginx is not installed:

```bash
sudo apt update
sudo apt install nginx -y
```

Check the version to confirm it is 1.3.13 or later, which is when WebSocket support was added:

```bash
nginx -v
```

## Basic WebSocket Configuration

The simplest WebSocket proxy configuration looks like this. Create or edit a server block:

```nginx
# /etc/nginx/sites-available/myapp
server {
    listen 80;
    server_name example.com;

    location / {
        # Pass requests to the backend
        proxy_pass http://localhost:3000;

        # Required for WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Forward the real client IP
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

The `proxy_http_version 1.1` directive is critical. HTTP/1.0 does not support persistent connections, so WebSockets require at minimum HTTP/1.1.

Enable the site and test:

```bash
sudo ln -s /etc/nginx/sites-available/myapp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Separating WebSocket and HTTP Traffic

Many applications serve both regular HTTP and WebSocket endpoints. You can route them differently based on path:

```nginx
server {
    listen 80;
    server_name example.com;

    # Regular HTTP traffic goes to one backend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket connections go to a dedicated endpoint
    location /ws/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;

        # Disable buffering for WebSocket connections
        proxy_buffering off;
    }
}
```

## Using a Map Block for Flexible Connection Handling

A cleaner approach uses Nginx's `map` directive to handle both WebSocket upgrades and regular HTTP keep-alive connections properly:

```nginx
# Place this in http block, usually in /etc/nginx/nginx.conf or a conf.d file
http {
    # Map upgrade header to connection header value
    map $http_upgrade $connection_upgrade {
        default upgrade;
        ''      close;
    }

    server {
        listen 80;
        server_name example.com;

        location / {
            proxy_pass http://localhost:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection $connection_upgrade;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
    }
}
```

This map returns `upgrade` when an Upgrade header is present, and `close` otherwise, which is the correct behavior for HTTP keep-alive connections.

## Tuning Timeouts for Long-Lived Connections

By default, Nginx closes proxy connections after 60 seconds of inactivity. WebSocket applications often keep connections open much longer. Adjust timeouts accordingly:

```nginx
location /ws/ {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;

    # Extend the timeout to 1 hour for idle WebSocket connections
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;

    # Or use a more moderate value with client ping/pong
    # proxy_read_timeout 300s;

    # Disable buffering - WebSockets are streaming
    proxy_buffering off;
}
```

For chat applications or monitoring dashboards, 1 hour is reasonable. For real-time trading or gaming applications, you may want to set it even higher or configure the application to send periodic ping frames to keep the connection alive.

## Load Balancing WebSocket Connections

When running multiple backend instances, use the `ip_hash` or `sticky` approach to ensure a client consistently connects to the same backend:

```nginx
upstream websocket_backend {
    # ip_hash ensures a client always hits the same server
    # This is important for stateful WebSocket connections
    ip_hash;

    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
}

server {
    listen 80;
    server_name example.com;

    location /ws/ {
        proxy_pass http://websocket_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 3600s;
        proxy_buffering off;
    }
}
```

Without `ip_hash`, Nginx might send a client's WebSocket messages to different backend instances, breaking the application's state.

## SSL/TLS for Secure WebSockets (wss://)

Production applications should use WSS (WebSocket Secure). The SSL termination happens at Nginx, so the backend still receives plain WebSocket traffic:

```nginx
server {
    listen 443 ssl;
    server_name example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location /ws/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;

        # Tell the backend the original protocol was HTTPS
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 3600s;
        proxy_buffering off;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name example.com;
    return 301 https://$server_name$request_uri;
}
```

## Testing WebSocket Connectivity

After configuring Nginx, verify WebSocket connections work. Install `websocat` for command-line testing:

```bash
# Install websocat
wget -O /usr/local/bin/websocat https://github.com/vi/websocat/releases/latest/download/websocat.x86_64-unknown-linux-musl
chmod +x /usr/local/bin/websocat

# Test a WebSocket connection
websocat ws://localhost/ws/

# Test WSS
websocat wss://example.com/ws/
```

You can also use `curl` to check if the upgrade handshake is accepted:

```bash
# Check if Nginx properly handles the upgrade request
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  -H "Sec-WebSocket-Version: 13" \
  http://localhost/ws/
```

A successful response will show `HTTP/1.1 101 Switching Protocols`.

## Troubleshooting Common Issues

Check the Nginx error log when connections fail:

```bash
sudo tail -f /var/log/nginx/error.log
```

Common problems and fixes:

- **502 Bad Gateway**: The backend is not running or not listening on the expected port. Verify with `ss -tlnp | grep 3000`.
- **Connection refused**: Check firewall rules with `sudo ufw status`.
- **WebSocket closes immediately**: Missing `proxy_http_version 1.1` or the `Upgrade` header.
- **Timeout after 60 seconds**: Increase `proxy_read_timeout` as shown above.

Monitor active connections to understand load:

```bash
# Count active WebSocket connections
ss -tnp | grep nginx | wc -l

# Check Nginx status module
curl http://localhost/nginx_status
```

With this configuration, Nginx reliably handles WebSocket traffic alongside regular HTTP, giving you a single entry point for all client connections.
