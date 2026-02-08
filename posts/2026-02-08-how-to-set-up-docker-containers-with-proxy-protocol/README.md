# How to Set Up Docker Containers with Proxy Protocol

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Proxy Protocol, Networking, Nginx, HAProxy, Load Balancing, Containers

Description: Configure Proxy Protocol for Docker containers to preserve client IP addresses across load balancers and reverse proxies.

---

When traffic passes through a load balancer or reverse proxy before reaching your Docker container, the original client IP address is lost. The container sees the proxy's IP as the source. This is a fundamental problem for logging, rate limiting, geolocation, and security rules that depend on knowing who is making the request.

Proxy Protocol solves this by adding a small header to each connection that carries the original client IP and port. Unlike X-Forwarded-For headers, Proxy Protocol works at the TCP level and cannot be forged by application-layer attackers. This guide shows you how to configure Proxy Protocol across common Docker setups.

## How Proxy Protocol Works

Proxy Protocol prepends a header line to each TCP connection before any application data:

```
PROXY TCP4 203.0.113.50 10.0.0.5 12345 80\r\n
```

This tells the backend: the real client is 203.0.113.50:12345, connecting to 10.0.0.5:80. The backend reads this header, records the real client IP, and processes the rest of the connection normally.

There are two versions:

- **v1** - Human-readable text format (shown above)
- **v2** - Binary format, more efficient, supports additional metadata

Both serve the same purpose. Version 2 is preferred for production due to its compact format and extensibility.

## Setting Up HAProxy as the Frontend

HAProxy is a natural choice for Proxy Protocol because it has excellent support for both sending and receiving the protocol:

```yaml
# docker-compose.yml - HAProxy with Proxy Protocol to backend containers
services:
  haproxy:
    image: haproxy:2.9-alpine
    ports:
      - "80:80"
      - "443:443"
      - "8404:8404"
    volumes:
      - ./haproxy.cfg:/usr/local/etc/haproxy/haproxy.cfg:ro
    networks:
      - proxy-network

  backend-1:
    image: nginx:alpine
    volumes:
      - ./nginx-proxy-protocol.conf:/etc/nginx/conf.d/default.conf:ro
    networks:
      - proxy-network

  backend-2:
    image: nginx:alpine
    volumes:
      - ./nginx-proxy-protocol.conf:/etc/nginx/conf.d/default.conf:ro
    networks:
      - proxy-network

networks:
  proxy-network:
    driver: bridge
```

Configure HAProxy to send Proxy Protocol v2 to backends:

```
# haproxy.cfg - HAProxy configuration with Proxy Protocol v2
global
    daemon
    maxconn 4096

defaults
    mode http
    timeout connect 5000ms
    timeout client  50000ms
    timeout server  50000ms
    option forwardfor

frontend http_front
    bind *:80
    default_backend web_servers

frontend stats
    bind *:8404
    stats enable
    stats uri /stats
    stats refresh 10s

backend web_servers
    balance roundrobin
    # send-proxy-v2 tells HAProxy to prepend Proxy Protocol v2 header
    server backend1 backend-1:80 check send-proxy-v2
    server backend2 backend-2:80 check send-proxy-v2
```

## Configuring Nginx to Accept Proxy Protocol

The backend Nginx containers need to be configured to read the Proxy Protocol header:

```nginx
# nginx-proxy-protocol.conf - Nginx configured to accept Proxy Protocol
server {
    # The 'proxy_protocol' parameter tells Nginx to expect the PP header
    listen 80 proxy_protocol;

    # Define trusted proxy addresses (the HAProxy container's network)
    set_real_ip_from 172.16.0.0/12;
    set_real_ip_from 10.0.0.0/8;

    # Use the Proxy Protocol source address as the real client IP
    real_ip_header proxy_protocol;

    # Log the real client IP
    log_format proxy_log '$proxy_protocol_addr - $remote_user [$time_local] '
                         '"$request" $status $body_bytes_sent '
                         '"$http_referer" "$http_user_agent"';
    access_log /var/log/nginx/access.log proxy_log;

    location / {
        # Pass the real client IP to upstream applications
        proxy_set_header X-Real-IP $proxy_protocol_addr;
        proxy_set_header X-Forwarded-For $proxy_protocol_addr;
        return 200 'Client IP: $proxy_protocol_addr\nServer: $hostname\n';
        add_header Content-Type text/plain;
    }

    location /health {
        return 200 '{"status": "ok"}';
        add_header Content-Type application/json;
    }
}
```

## Testing the Setup

Start the stack and verify Proxy Protocol is working:

```bash
# Start all services
docker compose up -d

# Make a request through HAProxy
curl http://localhost/

# The response should show your actual client IP, not the HAProxy container IP
# Output: Client IP: 172.17.0.1 (or your host IP)
```

Check the Nginx logs to confirm the real IP is being recorded:

```bash
# View Nginx access logs in the backend container
docker logs $(docker compose ps -q backend-1) | tail -5
# Should show the client IP from the Proxy Protocol header
```

## Proxy Protocol with Docker Swarm Ingress

Docker Swarm's routing mesh obscures client IPs. Proxy Protocol can help:

```yaml
# docker-compose.swarm.yml - Swarm service with Proxy Protocol
version: "3.8"
services:
  traefik:
    image: traefik:v3.0
    ports:
      - target: 80
        published: 80
        mode: host  # Bypass the routing mesh to preserve client IP
    deploy:
      mode: global
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    command:
      - "--entrypoints.web.address=:80"
      - "--entrypoints.web.proxyProtocol.trustedIPs=10.0.0.0/8,172.16.0.0/12"
      - "--providers.docker.swarmMode=true"

  web:
    image: nginx:alpine
    deploy:
      replicas: 3
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.web.rule=Host(`example.com`)"
```

## Proxy Protocol v2 with TLS (HTTPS)

For HTTPS traffic, Proxy Protocol wraps the TLS connection:

```
# haproxy.cfg - HTTPS with Proxy Protocol v2
frontend https_front
    bind *:443 ssl crt /etc/haproxy/certs/combined.pem
    default_backend web_servers_ssl

backend web_servers_ssl
    balance roundrobin
    server backend1 backend-1:80 check send-proxy-v2
    server backend2 backend-2:80 check send-proxy-v2
```

HAProxy terminates TLS and then sends the plaintext request to the backend with a Proxy Protocol header. The backend receives both the decrypted HTTP request and the original client IP.

## Proxy Protocol Between Multiple Proxy Layers

In multi-layer proxy setups, each layer must forward the Proxy Protocol header:

```
# Layer 1: External load balancer (e.g., cloud provider) sends PP to HAProxy
# Layer 2: HAProxy reads PP and forwards to Nginx with PP

# haproxy.cfg for Layer 2 - Receive PP from upstream, send PP to backend
frontend http_front
    bind *:80 accept-proxy  # Accept Proxy Protocol from upstream
    default_backend web_servers

backend web_servers
    server backend1 backend-1:80 check send-proxy-v2
```

The `accept-proxy` option on the frontend bind tells HAProxy to expect a Proxy Protocol header from the upstream load balancer.

## Debugging Proxy Protocol Issues

When the client IP shows incorrectly, debug with these steps:

```bash
# 1. Capture raw traffic to see if Proxy Protocol header is present
docker run --rm --network proxy-network \
  nicolaka/netshoot tcpdump -i eth0 -A -c 10 port 80

# 2. Test with a raw TCP connection to see the PP header
# Using netcat to manually send a Proxy Protocol v1 header
echo -e "PROXY TCP4 203.0.113.50 10.0.0.5 12345 80\r\nGET / HTTP/1.1\r\nHost: backend-1\r\n\r\n" | \
  docker run --rm -i --network proxy-network nicolaka/netshoot nc backend-1 80

# 3. Check if Nginx is parsing the PP header correctly
docker exec backend-1 nginx -t
docker logs backend-1
```

Common issues:

- **400 Bad Request** - Backend not configured to expect Proxy Protocol but receiving it
- **Empty client IP** - Backend not configured with `proxy_protocol` on the listen directive
- **Proxy's IP shown instead of client IP** - Missing `real_ip_header proxy_protocol` in Nginx
- **Connection refused** - Proxy Protocol version mismatch (v1 vs v2)

## Security Considerations

Proxy Protocol introduces a trust relationship. The backend trusts whatever IP the proxy says the client is. If an attacker can connect directly to the backend (bypassing the proxy), they can forge any source IP using a fake Proxy Protocol header.

Prevent this:

```bash
# Restrict backend access to only the proxy containers using iptables
sudo iptables -I DOCKER-USER -p tcp --dport 80 -s 172.18.0.0/16 -j ACCEPT
sudo iptables -I DOCKER-USER -p tcp --dport 80 -j DROP
```

Or use Docker network policies to isolate the backend:

```yaml
# docker-compose.yml - Isolated backend network
services:
  haproxy:
    networks:
      - public-network
      - backend-network

  backend-1:
    networks:
      - backend-network  # Only accessible from the backend network

networks:
  public-network:
    driver: bridge
  backend-network:
    driver: bridge
    internal: true  # No external access
```

## Application-Level Integration

If your application needs the client IP, read it from the headers set by Nginx:

```python
# app.py - Flask application reading the real client IP from Proxy Protocol
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route("/")
def index():
    # X-Real-IP is set by Nginx from the Proxy Protocol header
    client_ip = request.headers.get("X-Real-IP", request.remote_addr)
    return jsonify({
        "client_ip": client_ip,
        "x_forwarded_for": request.headers.get("X-Forwarded-For"),
        "remote_addr": request.remote_addr
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
```

## Conclusion

Proxy Protocol is the most reliable way to preserve client IP addresses in Docker environments that use load balancers or reverse proxies. It works at the TCP level, resists header forgery, and is supported by all major proxies and web servers. The setup requires coordinated configuration on both the sending (proxy) and receiving (backend) sides. Always restrict direct access to backends that expect Proxy Protocol headers, and test with raw TCP connections when debugging issues. For any Docker deployment where knowing the true client IP matters, Proxy Protocol is worth the configuration effort.
