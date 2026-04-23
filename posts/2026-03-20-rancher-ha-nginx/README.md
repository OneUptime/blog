# How to Configure Rancher HA with NGINX

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, High Availability, Nginx, Reverse Proxy

Description: Configure NGINX as the reverse proxy and load balancer for Rancher HA deployments with SSL termination, WebSocket support, and upstream health checking.

## Introduction

NGINX is a popular choice for load balancing Rancher HA deployments. Its stream and http modules handle both the Rancher web interface and the RKE2 API server traffic. This guide covers NGINX configuration for Rancher HA with SSL termination, health checks, and connection optimization.

## Prerequisites

- NGINX 1.20+ with stream module
- Running Rancher HA cluster (3 nodes) configured for external TLS termination (`tls=external`)
- RKE2 server certificates with the load balancer hostname or IP added to `tls-san`
- TLS certificate for Rancher hostname
- Root access to NGINX server

## Step 1: Install NGINX with Stream Module

```bash
# Install NGINX, and ensure the stream module is installed and enabled on your distribution

apt update && apt install -y nginx

# Verify stream module is available
nginx -V 2>&1 | grep stream

# RHEL/CentOS
yum install -y nginx

# Verify installation
nginx -v
```

## Step 2: Configure NGINX for Rancher HA

```nginx
# /etc/nginx/nginx.conf - NGINX with HTTP and Stream for Rancher

include /etc/nginx/modules-enabled/*.conf;
include /usr/share/nginx/modules/*.conf;

# Use the worker user from your NGINX package.
# Debian/Ubuntu typically use www-data; RHEL/CentOS typically use nginx.
user www-data;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 4096;
    multi_accept on;
    use epoll;
}

# Stream module for TCP/TLS proxying (RKE2 API)
stream {
    log_format stream '$remote_addr [$time_local] $protocol $status '
                      '$bytes_sent $bytes_received $session_time';
    access_log /var/log/nginx/stream.log stream;

    # RKE2 API server
    upstream rke2_api {
        least_conn;
        server 10.0.0.11:6443;
        server 10.0.0.12:6443;
        server 10.0.0.13:6443;
    }

    # RKE2 registration
    upstream rke2_register {
        least_conn;
        server 10.0.0.11:9345;
        server 10.0.0.12:9345;
        server 10.0.0.13:9345;
    }

    server {
        listen 6443;
        proxy_pass rke2_api;
        proxy_timeout 3600s;
        proxy_connect_timeout 10s;
    }

    server {
        listen 9345;
        proxy_pass rke2_register;
        proxy_timeout 3600s;
    }
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" $request_time';
    access_log /var/log/nginx/access.log main;

    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 3600;
    keepalive_requests 1000;

    # Compression
    gzip on;
    gzip_vary on;
    gzip_types text/plain application/json text/css application/javascript;

    # Upstream Rancher servers
    upstream rancher_servers {
        least_conn;
        server 10.0.0.11:80 max_fails=3 fail_timeout=30s;
        server 10.0.0.12:80 max_fails=3 fail_timeout=30s;
        server 10.0.0.13:80 max_fails=3 fail_timeout=30s;

        keepalive 32;
    }

    include /etc/nginx/conf.d/*.conf;
}
```

## Step 3: Configure Rancher Virtual Host

```nginx
# /etc/nginx/conf.d/rancher.conf

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name rancher.example.com;
    return 301 https://$server_name$request_uri;
}

# Main Rancher HTTPS server
server {
    listen 443 ssl http2;
    server_name rancher.example.com;

    # SSL Configuration
    ssl_certificate     /etc/ssl/certs/rancher-fullchain.pem;
    ssl_certificate_key /etc/ssl/private/rancher.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    ssl_session_cache   shared:SSL:20m;
    ssl_session_timeout 1d;

    # Timeouts for Rancher WebSocket connections
    proxy_read_timeout    3600s;
    proxy_connect_timeout 30s;
    proxy_send_timeout    3600s;

    # WebSocket support
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Port $server_port;

    # Health check passthrough
    location /healthz {
        proxy_pass http://rancher_servers;
        access_log off;
    }

    # Main proxy location
    location / {
        proxy_pass http://rancher_servers;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }
}

# Upgrade map for WebSocket
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}
```

## Step 4: Configure NGINX Health Checks

```nginx
# Update the existing upstream rancher_servers block in /etc/nginx/nginx.conf
# Active health checks require NGINX Plus; NGINX Open Source uses passive checks.

upstream rancher_servers {
    least_conn;

    server 10.0.0.11:80 max_fails=3 fail_timeout=30s;
    server 10.0.0.12:80 max_fails=3 fail_timeout=30s;
    server 10.0.0.13:80 max_fails=3 fail_timeout=30s;

    # Keep backup server
    server 10.0.0.14:80 backup;

    keepalive 32;
}
```

## Step 5: Enable NGINX Status Monitoring

```nginx
# /etc/nginx/conf.d/status.conf
server {
    listen 127.0.0.1:8080;

    location /nginx_status {
        stub_status on;
        allow 127.0.0.1;
        deny all;
    }
}
```

## Step 6: Start and Verify NGINX

```bash
# Test configuration
nginx -t

# Start NGINX
systemctl enable nginx
systemctl start nginx

# Test Rancher accessibility
curl -sk https://rancher.example.com/healthz

# Check NGINX logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Check upstream server status
curl http://127.0.0.1:8080/nginx_status
```

## Step 7: Log Rotation and Monitoring

```bash
# Configure logrotate for NGINX logs
cat > /etc/logrotate.d/nginx << 'EOF'
/var/log/nginx/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    # Adjust owner/group if your distribution uses a different NGINX account.
    create 0640 www-data adm
    sharedscripts
    postrotate
        if [ -f /var/run/nginx.pid ]; then
            kill -USR1 `cat /var/run/nginx.pid`
        fi
    endscript
}
EOF
```

## Conclusion

NGINX provides a reliable, well-understood load balancing solution for Rancher HA. The critical configurations are the stream module for TCP proxying of RKE2 API traffic, generous timeout settings for WebSocket connections, and proper WebSocket header handling. Unlike HAProxy, NGINX's active health check feature requires the Plus edition, so passive health checking with appropriate `max_fails` and `fail_timeout` settings must compensate. For cloud deployments, consider replacing NGINX with a cloud-native load balancer that provides active health checking without licensing costs.
