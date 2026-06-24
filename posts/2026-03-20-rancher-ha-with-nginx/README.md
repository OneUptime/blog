# How to Configure Rancher HA with NGINX - With

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Nginx, High Availability, Load Balancer, SSL, Stream Module

Description: Use NGINX as a TCP/SSL load balancer for Rancher HA with stream module configuration, upstream health checks, and Kubernetes API proxying.

## Introduction

NGINX's stream module provides TCP load balancing capabilities ideal for Rancher HA. Unlike HTTP-mode load balancing, stream mode passes TLS traffic directly to Rancher nodes (SSL passthrough), preserving end-to-end encryption.

## Prerequisites

- NGINX 1.11.4+ with `ngx_stream_module` (and `ngx_stream_log_module` for the logging example below)
- Three Rancher server nodes
- A host separate from the Rancher nodes for the load balancer

## Step 1: Verify Stream Module is Available

```bash
# Check NGINX was built with stream support

nginx -V 2>&1 | grep stream

# Install NGINX with stream support (Ubuntu)
apt-get install -y nginx
```

## Step 2: Configure NGINX Stream Block

```nginx
# Add this block at the top level of /etc/nginx/nginx.conf
# outside the existing http block
stream {
    # Log format for TCP connections
    log_format stream_proxy '$remote_addr [$time_local] '
                             '$protocol $status $bytes_sent $bytes_received '
                             '$session_time "$upstream_addr"';

    access_log /var/log/nginx/stream-access.log stream_proxy;

    # Upstream group for Rancher HTTP
    upstream rancher_servers_http {
        least_conn;
        server 10.0.0.11:80 max_fails=3 fail_timeout=5s;
        server 10.0.0.12:80 max_fails=3 fail_timeout=5s;
        server 10.0.0.13:80 max_fails=3 fail_timeout=5s;
    }

    # Upstream group for Rancher HTTPS
    upstream rancher_servers_https {
        least_conn;
        server 10.0.0.11:443 max_fails=3 fail_timeout=5s;
        server 10.0.0.12:443 max_fails=3 fail_timeout=5s;
        server 10.0.0.13:443 max_fails=3 fail_timeout=5s;
    }

    # Optional upstream group for direct Kubernetes API access
    upstream kubernetes_api {
        least_conn;
        server 10.0.0.11:6443 max_fails=3 fail_timeout=5s;
        server 10.0.0.12:6443 max_fails=3 fail_timeout=5s;
        server 10.0.0.13:6443 max_fails=3 fail_timeout=5s;
    }

    # HTTP frontend for Rancher
    server {
        listen 80;
        proxy_pass rancher_servers_http;
        proxy_connect_timeout 30s;
        proxy_timeout 1800s;
    }

    # HTTPS frontend (SSL passthrough)
    server {
        listen 443;
        proxy_pass rancher_servers_https;
        proxy_connect_timeout 30s;
        proxy_timeout 1800s;    # Allow long-lived websocket and API sessions
    }

    # Optional Kubernetes API frontend
    server {
        listen 6443;
        proxy_pass kubernetes_api;
        proxy_connect_timeout 30s;
        proxy_timeout 1800s;
    }
}
```

## Step 3: Configure Health Checks (NGINX Plus)

For NGINX Plus, add a shared memory zone to the upstream and `health_check` to the `server` block:

```nginx
upstream rancher_servers_https {
    zone rancher_servers_https 64k;
    least_conn;
    server 10.0.0.11:443;
    server 10.0.0.12:443;
    server 10.0.0.13:443;
}

server {
    listen 443;
    proxy_pass rancher_servers_https;

    # NGINX Plus health check (not available in open-source)
    health_check interval=5s passes=2 fails=3;
}
```

For open-source NGINX, use `max_fails` and `fail_timeout` as shown above.

## Step 4: Test Configuration and Reload

```bash
# Test NGINX configuration
nginx -t

# Reload without downtime
systemctl reload nginx

# Verify Rancher responds through the load balancer
curl -k -H 'Host: rancher.example.com' -o /dev/null -w '%{http_code}\n' https://nginx-lb-ip/healthz
# Expected: 200
```

## Step 5: Enable Active Health Checks (NGINX Plus Only)

Active stream health checks are provided by `ngx_stream_upstream_hc_module`, which is available only in NGINX Plus. Open-source NGINX should continue using passive checks with `max_fails` and `fail_timeout`.

## Step 6: Monitor NGINX Status

```nginx
# If NGINX was built with ngx_http_stub_status_module,
# add a basic status endpoint inside the http block
server {
    listen 127.0.0.1:8080;
    location = /nginx_status {
        stub_status;
        allow 127.0.0.1;
        deny all;
    }
}
```

## Conclusion

NGINX stream module provides a lightweight, high-performance TCP load balancer for Rancher HA. The `least_conn` algorithm distributes TCP connections across Rancher nodes while the `max_fails` and `fail_timeout` directives provide passive health checking in open-source NGINX. If you need active stream health checks, use NGINX Plus.
