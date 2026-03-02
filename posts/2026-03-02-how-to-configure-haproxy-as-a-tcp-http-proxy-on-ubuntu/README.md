# How to Configure HAProxy as a TCP/HTTP Proxy on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, HAProxy, Load Balancing, Proxy, Networking

Description: Set up HAProxy on Ubuntu as a high-availability TCP and HTTP proxy with load balancing, health checks, SSL termination, and stats monitoring.

---

HAProxy (High Availability Proxy) is one of the most widely deployed load balancers and proxy servers in production environments. It handles millions of requests per second and is trusted by some of the largest sites on the internet. Its strengths are reliability, performance, and a flexible configuration that supports both Layer 4 (TCP) and Layer 7 (HTTP) proxying.

This guide covers installing HAProxy on Ubuntu and configuring it for both HTTP and TCP use cases, including SSL termination, health checks, and the built-in stats dashboard.

## Installing HAProxy

The version in Ubuntu's default repositories is typically older. Use the official HAProxy PPA for the latest stable version:

```bash
sudo apt update
sudo apt install -y software-properties-common

# Add the HAProxy PPA (adjust version as needed - 2.8 is a current LTS)
sudo add-apt-repository ppa:vbernat/haproxy-2.8

sudo apt update
sudo apt install -y haproxy

# Verify the version
haproxy -v
```

Enable HAProxy to start on boot:

```bash
sudo systemctl enable haproxy
```

## Understanding HAProxy Configuration Structure

HAProxy's configuration has four main sections:

- `global` - process-level settings (logging, user, max connections)
- `defaults` - default settings that apply to all frontends and backends unless overridden
- `frontend` - defines where HAProxy listens for connections
- `backend` - defines the servers to forward traffic to

A `listen` block combines a frontend and backend into a single section (useful for simple configs).

## Basic Configuration File

Back up the default configuration and start fresh:

```bash
sudo cp /etc/haproxy/haproxy.cfg /etc/haproxy/haproxy.cfg.bak
sudo nano /etc/haproxy/haproxy.cfg
```

```haproxy
#---------------------------------------------------------------------
# Global settings
#---------------------------------------------------------------------
global
    # Logging to syslog
    log /dev/log local0
    log /dev/log local1 notice

    # Run as this user/group
    user haproxy
    group haproxy

    # Run as a daemon
    daemon

    # Maximum connections
    maxconn 50000

    # SSL/TLS settings
    ssl-default-bind-ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384
    ssl-default-bind-options ssl-min-ver TLSv1.2 no-tls-tickets
    tune.ssl.default-dh-param 2048

    # Enable performance features
    nbthread 4

#---------------------------------------------------------------------
# Default settings applied to all frontends and backends
#---------------------------------------------------------------------
defaults
    # Mode - http for Layer 7, tcp for Layer 4
    mode http

    # Logging format
    log global
    option httplog
    option dontlognull

    # Timeouts
    timeout connect 5s       # Time to establish backend connection
    timeout client  50s      # Time waiting for client to send data
    timeout server  50s      # Time waiting for backend to respond

    # Enable connection reuse
    option http-server-close
    option forwardfor

    # Health check interval
    timeout check 5s

    # Retry on failure
    retries 3

#---------------------------------------------------------------------
# Stats interface
#---------------------------------------------------------------------
frontend stats
    bind *:8404
    stats enable
    stats uri /stats
    stats refresh 10s
    stats auth admin:StatsPassword123!   # Username:Password for stats page
    stats admin if TRUE                   # Allow admin actions from stats page

#---------------------------------------------------------------------
# HTTP Frontend - handles incoming web traffic
#---------------------------------------------------------------------
frontend http_frontend
    # Listen on port 80 for HTTP
    bind *:80

    # Redirect all HTTP to HTTPS
    redirect scheme https code 301 if !{ ssl_fc }

frontend https_frontend
    # Listen on 443 with SSL termination
    bind *:443 ssl crt /etc/haproxy/certs/example.com.pem

    # HSTS header
    http-response set-header Strict-Transport-Security "max-age=31536000"

    # ACLs for routing to different backends
    acl is_api path_beg /api/
    acl is_admin path_beg /admin/

    # Route based on path
    use_backend api_backend if is_api
    use_backend admin_backend if is_admin
    default_backend web_backend

#---------------------------------------------------------------------
# HTTP Backends
#---------------------------------------------------------------------
backend web_backend
    # Use least connections algorithm
    balance leastconn

    # Enable HTTP keep-alive to backends
    option http-server-close

    # Health check - check this path on backend servers
    option httpchk GET /health HTTP/1.1\r\nHost:\ example.com

    # Backend servers (name, host, port, weight)
    server web1 192.168.1.10:8080 check weight 100 inter 5s rise 2 fall 3
    server web2 192.168.1.11:8080 check weight 100 inter 5s rise 2 fall 3
    server web3 192.168.1.12:8080 check weight 100 inter 5s rise 2 fall 3

backend api_backend
    balance roundrobin

    option httpchk GET /api/health

    server api1 192.168.1.20:8080 check inter 5s
    server api2 192.168.1.21:8080 check inter 5s

backend admin_backend
    # Only accessible from internal IPs
    acl is_internal src 192.168.0.0/16 10.0.0.0/8
    http-request deny unless is_internal

    balance roundrobin
    server admin1 192.168.1.30:8080 check inter 5s
```

## Preparing the SSL Certificate

HAProxy expects the certificate and private key in a single PEM file:

```bash
# Create the directory
sudo mkdir -p /etc/haproxy/certs

# Combine certificate and key (order matters: cert first, then key)
sudo cat /etc/letsencrypt/live/example.com/fullchain.pem \
        /etc/letsencrypt/live/example.com/privkey.pem | \
  sudo tee /etc/haproxy/certs/example.com.pem > /dev/null

# Set restrictive permissions
sudo chmod 600 /etc/haproxy/certs/example.com.pem
```

## TCP Proxy Configuration

For non-HTTP protocols (databases, mail, custom protocols), use TCP mode:

```haproxy
#---------------------------------------------------------------------
# TCP Frontend - for raw TCP proxying
#---------------------------------------------------------------------
frontend mysql_frontend
    # Use tcp mode for Layer 4 proxying
    mode tcp
    bind *:3306

    # TCP logging
    option tcplog

    default_backend mysql_backend

backend mysql_backend
    mode tcp
    balance source   # Source IP hashing - same client always hits same server (sticky sessions)

    # TCP health check
    option tcp-check

    server mysql1 192.168.1.40:3306 check inter 10s
    server mysql2 192.168.1.41:3306 check inter 10s backup  # backup - only used if primary fails

frontend redis_frontend
    mode tcp
    bind *:6379

    default_backend redis_backend

backend redis_backend
    mode tcp
    balance first    # Use first available server (active/passive style)

    server redis_primary 192.168.1.50:6379 check inter 5s
    server redis_replica 192.168.1.51:6379 check inter 5s backup
```

## Testing and Validating the Configuration

```bash
# Test configuration for syntax errors
sudo haproxy -c -f /etc/haproxy/haproxy.cfg

# If valid, restart HAProxy
sudo systemctl restart haproxy
sudo systemctl status haproxy
```

## Accessing the Stats Page

With the configuration above, the stats page is at `http://your-server:8404/stats`. It shows:
- Request rates and error rates per backend
- Current server states (UP/DOWN/MAINT)
- Connection counts and session limits
- Response time averages

## Dynamic Server Management with Socket

HAProxy exposes a Unix socket for runtime management:

```bash
# Check server status
echo "show servers state" | sudo socat stdio /var/run/haproxy/admin.sock

# Disable a server for maintenance without stopping HAProxy
echo "set server web_backend/web1 state maint" | sudo socat stdio /var/run/haproxy/admin.sock

# Re-enable the server
echo "set server web_backend/web1 state ready" | sudo socat stdio /var/run/haproxy/admin.sock

# Drain a server (let existing connections finish, accept no new ones)
echo "set server web_backend/web2 state drain" | sudo socat stdio /var/run/haproxy/admin.sock
```

## Log Configuration

Configure rsyslog to capture HAProxy logs:

```bash
sudo nano /etc/rsyslog.d/49-haproxy.conf
```

```
# Capture HAProxy logs
$AddUnixListenSocket /dev/log
local0.*   -/var/log/haproxy.log
local1.*   -/var/log/haproxy-admin.log

# Prevent these from going to /var/log/syslog
& stop
```

```bash
sudo systemctl restart rsyslog
```

## Monitoring HAProxy

The built-in stats page is useful but doesn't send alerts. For production deployments, use [OneUptime](https://oneuptime.com) to monitor the health of both HAProxy itself and the backends it serves. You can set up checks on individual service endpoints to detect backend failures before HAProxy fully removes them from the pool.
