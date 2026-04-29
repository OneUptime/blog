# How to Monitor HAProxy IPv6 Traffic Statistics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, HAProxy, Monitoring, Statistics, Load Balancer

Description: Learn how to monitor HAProxy traffic statistics for IPv6 connections, including using the stats page, Unix socket, and Prometheus metrics to track IPv6 load balancer performance.

## Enable HAProxy Stats Page

```haproxy
# /etc/haproxy/haproxy.cfg

# Stats frontend accessible over IPv6

frontend stats
    bind *:8404
    bind [::]:8404

    stats enable
    stats uri /stats
    stats refresh 10s
    stats auth admin:StrongPassword123

    # Show additional info
    stats show-legends
    stats show-node
```

```bash
# Access stats page
curl -6 -u admin:StrongPassword123 http://[2001:db8::haproxy]:8404/stats

# Or via browser: http://[2001:db8::haproxy]:8404/stats
```

## Monitor via Unix Socket

```haproxy
global
    stats socket /var/run/haproxy/admin.sock mode 660 level admin
    stats timeout 30s
```

```bash
# Show general info
echo "show info" | socat stdio /var/run/haproxy/admin.sock

# Show stats for all proxies (includes IPv6 connection counts)
echo "show stat" | socat stdio /var/run/haproxy/admin.sock

# Show stats in CSV format
echo "show stat" | socat stdio /var/run/haproxy/admin.sock | \
    cut -d',' -f1,2,5,7,8,18,19,48

# View backend server states
echo "show servers state" | socat stdio /var/run/haproxy/admin.sock
```

## Key Metrics for IPv6 Monitoring

```bash
# Parse stats for key metrics
echo "show stat" | socat stdio /var/run/haproxy/admin.sock | \
    awk -F',' '
        NR==1 { for(i=1;i<=NF;i++) header[i]=$i }
        NR>1 && $2 == "BACKEND" {
            print "Backend:", $1,
                  "Current sessions:", $5,
                  "Total requests:", $49,
                  "Request errors:", $13
        }
    '

# Monitor IPv6 connection rate (sessions per second)
watch -n 1 'echo "show stat" | socat stdio /var/run/haproxy/admin.sock | \
    cut -d"," -f1,2,5,34 | grep -v "^#"'
```

## Prometheus Metrics for IPv6

```haproxy
# Enable Prometheus exporter (HAProxy 2.0+)
frontend prometheus
    bind *:9101
    bind [::]:9101

    http-request use-service prometheus-exporter if { path /metrics }
    stats enable
    stats uri /stats
```

```bash
# Scrape metrics
curl -6 http://[2001:db8::haproxy]:9101/metrics | \
    grep -E 'haproxy_frontend_bytes|haproxy_backend_current_sessions'

# Key IPv6-related metrics:
# haproxy_frontend_bytes_in_total
# haproxy_frontend_bytes_out_total
# haproxy_frontend_current_sessions
# haproxy_backend_current_sessions{backend="ipv6_backend"}
# haproxy_server_status{backend="ipv6_backend",server="app1"}
```

## Log Format for IPv6 Analysis

```haproxy
global
    log /dev/log local0

defaults
    log global
    option httplog

    # Custom log format showing client address (IPv4 or IPv6)
    log-format "%ci:%cp [%t] %ft %b/%s %Tq/%Tw/%Tc/%Tr/%Tt %ST %B %tsc %ac/%fc/%bc/%sc/%rc %{+Q}r"
    # %ci = client IP address (IPv4 or IPv6)
    # %cp = client port
```

```bash
# Analyze IPv6 traffic from logs (extract IPv6 client addresses, strip port)
awk '{print $6}' /var/log/haproxy.log | \
    grep -E '([0-9a-f]+:){2,}' | \
    sed 's/:[0-9]\+$//' | sort | uniq -c | sort -rn | head -20
```

## Real-Time Monitoring Commands

```bash
# Count current IPv6 connections
echo "show stat" | socat stdio /var/run/haproxy/admin.sock | \
    awk -F',' 'NR>1 && $2=="FRONTEND" {print $1, "current:", $5}'

# Show sessions from IPv6 addresses
echo "show sess" | socat stdio /var/run/haproxy/admin.sock | \
    grep -E '([0-9a-f]+:){2,}'

# Count active IPv6 sessions
echo "show sess" | socat stdio /var/run/haproxy/admin.sock | \
    grep -E '([0-9a-f]+:){2,}' | wc -l
```

## Summary

Monitor HAProxy IPv6 statistics via the stats page at `http://[::]:8404/stats`, the Unix socket with `echo "show stat" | socat stdio /var/run/haproxy/admin.sock`, or Prometheus metrics at `http://[::]:9101/metrics`. Key metrics: `current_sessions`, `bytes_in`, `bytes_out`, and server health status. Configure `log-format` with `%ci` to capture client IPv6 addresses. Use `watch` with `show stat` for real-time monitoring.
