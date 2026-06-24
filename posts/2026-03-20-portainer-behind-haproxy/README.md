# How to Set Up Portainer Behind HAProxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, HAProxy, Reverse Proxy, Load Balancing

Description: Configure HAProxy as a TCP and HTTP reverse proxy for Portainer with SSL termination and WebSocket support.

## Introduction

HAProxy is a high-performance TCP and HTTP load balancer widely used in enterprise environments. While less common for single-service setups than Nginx or Traefik, HAProxy excels when you need advanced health checking, ACL-based routing, or fine-grained connection control. This guide shows how to proxy Portainer through HAProxy with SSL termination.

## Prerequisites

- HAProxy 2.4+ installed (or running in Docker)
- SSL certificate in PEM format (cert + key concatenated)
- Portainer running in Docker

## Step 1: Start Portainer with HTTP Enabled

```bash
docker run -d \
  --name portainer \
  --restart always \
  -p 127.0.0.1:9000:9000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --http-enabled \
  --trusted-origins=portainer.example.com
```

## Step 2: Prepare the SSL Certificate

HAProxy requires the certificate and private key in a single PEM file:

```bash
# Combine certificate and key into one file

cat /etc/ssl/certs/portainer.crt /etc/ssl/private/portainer.key > /etc/haproxy/certs/portainer.pem
chmod 600 /etc/haproxy/certs/portainer.pem
```

## Step 3: Create the HAProxy Configuration

Create `/etc/haproxy/haproxy.cfg`:

```haproxy
global
    log /dev/log local0
    log /dev/log local1 notice
    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin
    stats timeout 30s
    user haproxy
    group haproxy
    daemon

    # SSL settings
    ssl-default-bind-ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256
    ssl-default-bind-options ssl-min-ver TLSv1.2 no-tls-tickets

defaults
    log     global
    mode    http
    option  httplog
    option  dontlognull
    option  forwardfor      # Add X-Forwarded-For header
    option  http-server-close
    timeout connect 5000ms
    timeout client  50000ms
    timeout server  50000ms
    # Increase timeout for WebSocket connections
    timeout tunnel  3600s

# HAProxy stats page (optional)
listen stats
    bind *:8404
    stats enable
    stats uri /stats
    stats refresh 10s
    stats auth admin:strongpassword

# Frontend: accept incoming HTTPS connections
frontend portainer_frontend
    bind *:80
    bind *:443 ssl crt /etc/haproxy/certs/portainer.pem

    # Redirect HTTP to HTTPS
    http-request redirect scheme https unless { ssl_fc }

    # Route to backend
    default_backend portainer_backend

# Backend: forward to Portainer
backend portainer_backend
    balance roundrobin
    option httpchk GET /api/system/status

    # Set forwarded headers
    http-request set-header X-Forwarded-Proto https
    http-request set-header X-Forwarded-Port 443

    # Portainer server (127.0.0.1 if HAProxy is on the same host)
    server portainer1 127.0.0.1:9000 check
```

## Step 4: Test and Reload HAProxy

```bash
# Test configuration syntax
haproxy -c -f /etc/haproxy/haproxy.cfg

# Reload without dropping connections
systemctl reload haproxy

# Check HAProxy status
systemctl status haproxy
```

## Step 5: Run HAProxy in Docker (Alternative)

```yaml
version: "3.8"

services:
  haproxy:
    image: haproxy:2.8-alpine
    container_name: haproxy
    restart: always
    sysctls:
      - net.ipv4.ip_unprivileged_port_start=0
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./haproxy/haproxy.cfg:/usr/local/etc/haproxy/haproxy.cfg:ro
      - ./haproxy/certs:/etc/haproxy/certs:ro
    networks:
      - proxy

  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: always
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    command:
      - "--http-enabled"
      - "--trusted-origins=portainer.example.com"
    networks:
      - proxy

networks:
  proxy:
    driver: bridge

volumes:
  portainer_data:
```

In the Docker setup, update the backend server address to the container name:
```haproxy
    server portainer1 portainer:9000 check
```

## Troubleshooting

**WebSocket timeouts**: Ensure `timeout tunnel` is set high enough (3600s recommended).

**SSL certificate errors**: Verify the PEM file contains both the certificate chain and private key in the correct order.

**Health check failures**: Portainer's `/api/system/status` endpoint returns 200 when healthy.

## Conclusion

HAProxy provides enterprise-grade proxying for Portainer with powerful ACL support and detailed statistics. While the configuration is more verbose than Nginx or Caddy, HAProxy's performance characteristics and fine-grained control make it the right choice for high-traffic environments or complex routing requirements.
