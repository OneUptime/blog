# How to Set Up HAProxy Stats Page Restricted to Specific IPv4 Addresses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HAProxy, Stats, Monitoring, IPv4, Access Control, Dashboard

Description: Configure the HAProxy statistics dashboard with access restricted to specific IPv4 addresses, enabling real-time monitoring of backend health and traffic metrics.

## Introduction

HAProxy's built-in stats page provides real-time visibility into frontend and backend performance: requests per second, error rates, active connections, and server health states. Securing it to trusted IPv4 addresses is essential since it can expose sensitive infrastructure information.

## Basic Stats Configuration

```haproxy
# /etc/haproxy/haproxy.cfg

# Dedicated frontend for stats (on management IP)

frontend stats
    # Bind to internal management IPv4 only
    bind 10.0.0.1:8404
    mode http

    # Restrict access to trusted subnets at TCP level
    tcp-request connection reject if !{ src 10.0.0.0/8 }

    stats enable
    stats uri /stats              # URL path for stats page
    stats refresh 10s             # Auto-refresh every 10 seconds
    stats show-legends            # Show column descriptions
    stats show-node               # Show node name

    # Optional: Basic Auth as additional layer
    stats auth admin:StrongP@ssw0rd

    # Enable admin interface (allow enabling/disabling servers via UI)
    stats admin if TRUE
```

## Adding Stats to an Existing Frontend

If you don't want a dedicated port, add stats to a path on an existing frontend:

```haproxy
frontend http_in
    bind 203.0.113.10:80
    mode http

    # Only serve stats to internal IPs
    acl is_internal src 10.0.0.0/8 192.168.0.0/16
    acl is_stats_uri path_beg /haproxy-stats

    # Block external access to stats URL
    http-request deny if is_stats_uri !is_internal

    # Serve stats page
    use_backend stats_backend if is_stats_uri

backend stats_backend
    mode http
    stats enable
    stats uri /haproxy-stats
    stats refresh 10s
```

## Prometheus Metrics Exporter

For Prometheus scraping, enable the built-in Prometheus exporter (HAProxy 2.0+):

```haproxy
frontend prometheus
    bind 10.0.0.1:8405
    mode http

    # Only allow Prometheus server
    tcp-request connection reject if !{ src 10.0.0.5 }

    http-request use-service prometheus-exporter if { path /metrics }

    stats enable
    stats uri /stats
```

```bash
# Test Prometheus metrics endpoint
curl http://10.0.0.1:8405/metrics | grep haproxy_

# Add to Prometheus scrape config
# scrape_configs:
#   - job_name: 'haproxy'
#     static_configs:
#       - targets: ['10.0.0.1:8405']
#     metrics_path: '/metrics'
```

## Reading Stats via Admin Socket

For programmatic access (monitoring scripts, alerting):

```bash
# Requires in global:
# stats socket /run/haproxy/admin.sock user haproxy group haproxy mode 660 level admin
#
# Show all stats in CSV format
echo "show stat" | sudo socat stdio unix-connect:/run/haproxy/admin.sock

# Show specific backend
echo "show stat" | sudo socat stdio unix-connect:/run/haproxy/admin.sock | \
  grep web_servers | column -t -s,

# Get info section (current connections, uptime)
echo "show info" | sudo socat stdio unix-connect:/run/haproxy/admin.sock

# Read stats with Python for monitoring
python3 -c "
import socket
with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as s:
    s.connect('/run/haproxy/admin.sock')
    s.settimeout(1.0)
    s.sendall(b'show stat\n')
    chunks = []
    while True:
        try:
            data = s.recv(65536)
        except socket.timeout:
            break
        if not data:
            break
        chunks.append(data)
    print(b''.join(chunks).decode())
"
```

## Customizing the Stats Page

```haproxy
frontend stats
    bind 10.0.0.1:8404
    mode http

    stats enable
    stats uri /stats
    stats refresh 5s
    stats show-legends
    stats show-node              # Show this HAProxy node name
    stats show-desc "Production Load Balancer"  # Custom description

    # Hide HAProxy version in the stats page
    stats hide-version           # Don't show HAProxy version

    # Authentication (both users can view the stats page)
    stats auth monitor:readonlypass
    stats auth admin:adminpass
```

## Conclusion

The HAProxy stats page is a powerful operational tool requiring careful access control. Bind it to internal management IPv4 addresses only, add a second layer with Basic Auth, and use `tcp-request connection reject` for network-level IP restriction before any HTTP processing. For modern observability stacks, enable the Prometheus exporter endpoint alongside the web UI to feed metrics into your alerting pipeline.
