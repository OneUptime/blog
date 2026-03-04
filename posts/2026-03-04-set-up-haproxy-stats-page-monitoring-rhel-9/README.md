# How to Set Up HAProxy Stats Page for Monitoring on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, HAProxy, Monitoring, Stats, Linux

Description: Enable and configure the HAProxy statistics dashboard on RHEL for real-time monitoring of backend health, traffic, and connection metrics.

---

HAProxy includes a built-in statistics dashboard that shows real-time information about frontends, backends, and individual servers. It provides traffic metrics, health status, error rates, and session counts. This guide covers enabling and securing the stats page on RHEL.

## Prerequisites

- A RHEL system with HAProxy installed and running
- Root or sudo access

## Step 1: Enable the Stats Page

Add a stats section to your HAProxy configuration:

```haproxy
# /etc/haproxy/haproxy.cfg

# Add this as a new frontend/listen section
listen stats
    # Listen on port 8404 for the stats page
    bind *:8404

    # Enable statistics
    stats enable

    # Stats page URL path
    stats uri /stats

    # Auto-refresh interval (in seconds)
    stats refresh 10s

    # Show legends and additional info
    stats show-legends
    stats show-node
```

## Step 2: Secure the Stats Page

```haproxy
listen stats
    bind *:8404

    stats enable
    stats uri /stats
    stats refresh 10s
    stats show-legends

    # Require authentication
    stats auth admin:YourSecurePassword123

    # Allow admin actions (enable/disable servers) from the stats page
    stats admin if LOCALHOST

    # Restrict access to specific IPs
    acl authorized_ip src 192.168.1.0/24 10.0.0.0/8
    http-request deny unless authorized_ip
```

## Step 3: Stats Over HTTPS

```haproxy
listen stats
    bind *:8404 ssl crt /etc/haproxy/certs/stats.pem

    stats enable
    stats uri /stats
    stats auth admin:YourSecurePassword123
    stats refresh 10s
```

## Step 4: Open the Firewall

```bash
# Allow access to the stats port
sudo firewall-cmd --permanent --add-port=8404/tcp
sudo firewall-cmd --reload
```

## Step 5: Access the Stats Page

Open your browser and visit:
```bash
http://your-server-ip:8404/stats
```

Enter the credentials you configured in the stats auth line.

## Step 6: Understanding the Stats Dashboard

The dashboard shows:

- **Frontend**: Incoming connection metrics (current sessions, rates, bytes)
- **Backend**: Overall backend health and metrics
- **Server rows**: Individual server status with color coding
  - Green: Server is UP and healthy
  - Red: Server is DOWN
  - Yellow: Server is in maintenance mode
  - Blue: Server has not been checked yet

Key metrics to watch:
- **Cur**: Current active sessions
- **Max**: Maximum observed sessions
- **Limit**: Configured session limit
- **Rate**: Connections per second
- **Bytes In/Out**: Traffic volume
- **Denied**: Blocked requests
- **Errors**: Connection and response errors

## Step 7: Stats via the Socket (Programmatic Access)

```bash
# Get stats in CSV format via the socket
echo "show stat" | sudo socat stdio /var/lib/haproxy/stats

# Get stats in a more readable format
echo "show stat" | sudo socat stdio /var/lib/haproxy/stats | column -t -s','

# Get info about HAProxy itself
echo "show info" | sudo socat stdio /var/lib/haproxy/stats

# Get only backend server health
echo "show servers state" | sudo socat stdio /var/lib/haproxy/stats
```

## Step 8: Export Stats to Prometheus

For integration with monitoring systems like Prometheus:

```haproxy
frontend prometheus
    bind *:8405
    http-request use-service prometheus-exporter if { path /metrics }
    stats enable
    stats uri /stats
```

```bash
# Test Prometheus metrics endpoint
curl http://localhost:8405/metrics
```

## Step 9: Configure Alerts Based on Stats

Use the stats socket with a monitoring script:

```bash
#!/bin/bash
# /usr/local/bin/haproxy-check.sh
# Simple script to check backend health

STATS=$(echo "show stat" | sudo socat stdio /var/lib/haproxy/stats)
DOWN_SERVERS=$(echo "$STATS" | grep -c ",DOWN,")

if [ "$DOWN_SERVERS" -gt 0 ]; then
    echo "WARNING: $DOWN_SERVERS servers are DOWN"
    echo "$STATS" | grep ",DOWN," | cut -d',' -f1,2
fi
```

## Step 10: Test and Apply

```bash
# Validate configuration
haproxy -c -f /etc/haproxy/haproxy.cfg

# Reload HAProxy
sudo systemctl reload haproxy

# Test stats page access
curl -u admin:YourSecurePassword123 http://localhost:8404/stats

# Test CSV output
curl -u admin:YourSecurePassword123 "http://localhost:8404/stats;csv"
```

## Troubleshooting

```bash
# Check if HAProxy is listening on the stats port
sudo ss -tlnp | grep 8404

# Check SELinux
sudo ausearch -m avc -ts recent | grep haproxy

# If the page shows no data, check that frontends and backends are configured
haproxy -c -f /etc/haproxy/haproxy.cfg
```

## Summary

The HAProxy stats page on RHEL provides instant visibility into your load balancer's performance. It shows real-time health status, traffic metrics, and error rates for every frontend, backend, and server. Secure it with authentication and IP restrictions, and use the stats socket for programmatic access and integration with monitoring tools like Prometheus.
