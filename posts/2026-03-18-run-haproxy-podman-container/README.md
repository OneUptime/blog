# How to Run HAProxy in a Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, HAProxy, Load Balancer, Reverse Proxy

Description: Learn how to run HAProxy in a Podman container with load balancing, health checks, and a statistics dashboard.

---

> HAProxy in Podman delivers an enterprise-grade load balancer and reverse proxy in a lightweight, rootless container.

HAProxy is one of the most reliable and high-performance load balancers available, used by major websites and organizations worldwide. Running it in a Podman container provides an isolated, portable load balancer that is easy to configure and manage. This guide covers basic setup, load balancing configurations, health checks, and the stats dashboard.

---

## Pulling the HAProxy Image

Download the official HAProxy image.

```bash
# Pull the HAProxy 2.9 image

podman pull docker.io/library/haproxy:2.9

# Verify the image
podman images | grep haproxy
```

## Creating an HAProxy Configuration

HAProxy requires a configuration file to define frontends and backends.

```bash
# Create a config directory
mkdir -p ~/haproxy-config

# Write a basic HAProxy configuration
cat > ~/haproxy-config/haproxy.cfg <<'EOF'
# Global settings
global
    log stdout format raw local0
    maxconn 4096
    daemon

# Default settings
defaults
    log     global
    mode    http
    option  httplog
    option  dontlognull
    timeout connect 5000ms
    timeout client  50000ms
    timeout server  50000ms
    retries 3

# Statistics dashboard
listen stats
    bind *:8404
    stats enable
    stats uri /stats
    stats refresh 10s
    stats admin if LOCALHOST

# Frontend - receives incoming traffic
frontend http-in
    bind *:80
    default_backend app-servers

# Backend - pool of application servers
backend app-servers
    balance roundrobin
    option httpchk GET /
    http-check expect status 200
    server app1 host.containers.internal:3001 check inter 5s
    server app2 host.containers.internal:3002 check inter 5s
    server app3 host.containers.internal:3003 check inter 5s
EOF
```

## Running HAProxy with the Configuration

Start HAProxy with your custom configuration.

```bash
# Run HAProxy with the configuration file
podman run -d \
  --name my-haproxy \
  --sysctl net.ipv4.ip_unprivileged_port_start=0 \
  -p 8080:80 \
  -p 8404:8404 \
  -v ~/haproxy-config/haproxy.cfg:/usr/local/etc/haproxy/haproxy.cfg:Z \
  docker.io/library/haproxy:2.9

# Check the container is running
podman ps

# Verify the configuration is valid
podman exec my-haproxy haproxy -c -f /usr/local/etc/haproxy/haproxy.cfg

# Access the stats dashboard
echo "Open http://localhost:8404/stats in your browser"
```

## Load Balancing Strategies

Configure different load balancing algorithms.

```bash
# Create a configuration with multiple balancing strategies
cat > ~/haproxy-config/haproxy-lb.cfg <<'EOF'
global
    log stdout format raw local0
    maxconn 4096

defaults
    log     global
    mode    http
    option  httplog
    timeout connect 5000ms
    timeout client  50000ms
    timeout server  50000ms

listen stats
    bind *:8404
    stats enable
    stats uri /stats

# Round-robin backend
backend rr-servers
    balance roundrobin
    server srv1 host.containers.internal:3001 check
    server srv2 host.containers.internal:3002 check

# Least connections backend
backend lc-servers
    balance leastconn
    server srv1 host.containers.internal:3001 check
    server srv2 host.containers.internal:3002 check

# Source IP hash backend (sticky sessions)
backend sticky-servers
    balance source
    hash-type consistent
    server srv1 host.containers.internal:3001 check
    server srv2 host.containers.internal:3002 check

# Frontend with path-based routing
frontend http-in
    bind *:80
    acl is_api path_beg /api
    acl is_static path_beg /static
    use_backend lc-servers if is_api
    use_backend rr-servers if is_static
    default_backend sticky-servers
EOF

# Run HAProxy with the load balancing config
podman run -d \
  --name haproxy-lb \
  --sysctl net.ipv4.ip_unprivileged_port_start=0 \
  -p 8081:80 \
  -p 8405:8404 \
  -v ~/haproxy-config/haproxy-lb.cfg:/usr/local/etc/haproxy/haproxy.cfg:Z \
  docker.io/library/haproxy:2.9
```

## TCP Load Balancing

Configure HAProxy for TCP (Layer 4) load balancing.

```bash
# Create a TCP load balancing configuration
cat > ~/haproxy-config/haproxy-tcp.cfg <<'EOF'
global
    log stdout format raw local0
    maxconn 4096

defaults
    log     global
    mode    tcp
    option  tcplog
    timeout connect 5000ms
    timeout client  50000ms
    timeout server  50000ms

# TCP frontend for database connections
frontend db-frontend
    bind *:5432
    default_backend db-servers

# TCP backend for PostgreSQL servers
backend db-servers
    balance roundrobin
    option tcp-check
    server db1 host.containers.internal:5433 check inter 5s
    server db2 host.containers.internal:5434 check inter 5s

listen stats
    mode http
    bind *:8404
    stats enable
    stats uri /stats
EOF

# Run HAProxy for TCP load balancing
podman run -d \
  --name haproxy-tcp \
  -p 5432:5432 \
  -p 8406:8404 \
  -v ~/haproxy-config/haproxy-tcp.cfg:/usr/local/etc/haproxy/haproxy.cfg:Z \
  docker.io/library/haproxy:2.9
```

## Checking the Stats Dashboard

Monitor your backends through the HAProxy statistics page.

```bash
# Access the stats via curl
curl -s http://localhost:8404/stats | head -5

# Get stats in CSV format for parsing
curl -s "http://localhost:8404/stats;csv"

# Check backend server status
curl -s "http://localhost:8404/stats;csv" | grep "app-servers"
```

## Managing the Container

Common management operations.

```bash
# View HAProxy logs
podman logs my-haproxy

# Validate configuration changes
podman exec my-haproxy haproxy -c -f /usr/local/etc/haproxy/haproxy.cfg

# Reload HAProxy with zero downtime (requires config remount)
podman kill -s HUP my-haproxy

# Stop and start
podman stop my-haproxy
podman start my-haproxy

# Remove containers
podman rm -f my-haproxy haproxy-lb haproxy-tcp
```

## Summary

Running HAProxy in a Podman container provides a battle-tested load balancer with support for HTTP and TCP traffic. Configuration files define frontends, backends, and load balancing strategies including round-robin, least connections, and source IP hashing. Health checks ensure traffic is only routed to healthy servers, and the built-in stats dashboard gives you real-time visibility into backend status. Podman's rootless mode adds security, making HAProxy containers suitable for development load testing and production traffic management.
