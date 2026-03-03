# How to Monitor HAProxy Statistics Dashboard on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, HAProxy, Load Balancing, Monitoring, Networking

Description: Learn how to enable and secure the HAProxy statistics dashboard on Ubuntu, interpret key metrics, and set up Prometheus scraping for production monitoring of your load balancer.

---

HAProxy includes a built-in statistics page that shows real-time data about your frontends, backends, and individual servers. When something goes wrong with traffic routing - a backend is down, latency is spiking, connections are queuing - the stats page is often the first place to look. This guide covers enabling it, securing it, and getting the most useful information out of it.

## Enabling the HAProxy Stats Page

The stats page is configured as a frontend in your HAProxy configuration. Edit `/etc/haproxy/haproxy.cfg`:

```bash
sudo nano /etc/haproxy/haproxy.cfg
```

Add a stats frontend section:

```text
# HAProxy Stats Configuration
frontend stats
    # Listen on a dedicated port for stats
    bind *:8404

    # Enable the statistics module
    stats enable

    # URI path for the stats page
    stats uri /stats

    # Refresh the stats page every 10 seconds
    stats refresh 10s

    # Show version in the header
    stats show-legends
    stats show-node

    # Enable detailed stat descriptions
    stats show-desc

    # Optional: add a title to the page
    stats admin if TRUE

    # Authentication (highly recommended for production)
    stats auth admin:change-this-password
    stats auth readonly:readonly-password

    # Optional: hide version for security
    # stats hide-version
```

After editing the configuration, validate and reload:

```bash
# Validate the configuration
sudo haproxy -c -f /etc/haproxy/haproxy.cfg

# Reload HAProxy (graceful reload - no connection drops)
sudo systemctl reload haproxy

# Verify it's listening
ss -tlnp | grep 8404
```

Access the stats page at `http://your-server:8404/stats`.

## Understanding the Statistics Page

The stats page is organized into sections:

### Global Stats Section
At the top, you see aggregate statistics:
- **Version** and **Current time**
- **PID**: HAProxy process ID
- **Uptime**: how long HAProxy has been running
- **System limits**: max connections, max sockets

### Frontend Stats

For each configured frontend:

| Metric | Meaning |
|--------|---------|
| **Scur** | Current sessions (active connections) |
| **Smax** | Maximum sessions ever seen |
| **Slim** | Session limit |
| **Stot** | Total sessions since start |
| **Bin/Bout** | Bytes in/out |
| **Dreq** | Denied requests |
| **Dresp** | Denied responses |
| **Ereq** | Request errors |
| **Status** | OPEN or STOP |

### Backend Stats

For each backend:

| Metric | Meaning |
|--------|---------|
| **Qcur** | Current queue length |
| **Qmax** | Maximum queue length ever seen |
| **Scur** | Current sessions |
| **Wretr** | Connection retries |
| **Wredis** | Request redispatches (sent to different server) |
| **Status** | UP/DOWN/MAINT |
| **LastChk** | Result of the last health check |

### Server Stats

Individual server rows show:
- Current and max sessions
- Total requests handled
- Response time (average and max)
- Connection errors
- Last health check status and message

## Key Metrics to Watch

### Request Queue Depth

A non-zero queue (`Qcur > 0`) means backends can't keep up with traffic. If the queue grows, your backends are overloaded.

```bash
# Monitor queue depth via the CLI socket
echo "show stat" | sudo socat /var/run/haproxy/admin.sock stdio | \
    cut -d',' -f1,2,3,4 | column -t -s,
```

### Session Rate

If sessions are hitting the `Slim` (session limit) on a frontend, you'll need to increase `maxconn` in the frontend configuration.

### Health Check Results

The `LastChk` column for backend servers shows the health check result. Common values:
- `L4OK` - TCP connection succeeded
- `L7OK` - HTTP health check passed
- `L4CON` - TCP connection failed
- `L7STS` - HTTP health check returned non-2xx
- `TOUT` - health check timed out

### Response Time

The `Rtime` (response time) and `Ttime` (total time) columns help identify slow backends. Sort by response time to find the slowest servers.

## Enabling the Admin Interface

The `stats admin if TRUE` directive enables the administrative interface, which lets you:
- Enable/disable individual backend servers
- Drain a server (new connections go elsewhere, existing ones complete)
- Put a server into maintenance mode

Use carefully in production - disabling a server from the stats page is immediate.

## Using the HAProxy Socket for Monitoring

HAProxy exposes a Unix socket for programmatic monitoring and control. Enable it in the global section:

```text
global
    # Enable the admin socket
    stats socket /var/run/haproxy/admin.sock mode 660 level admin

    # Alternative: expose over TCP (useful for remote monitoring)
    # stats socket ipv4@127.0.0.1:9999 level admin
```

```bash
# Create the directory
sudo mkdir -p /var/run/haproxy

# Example commands via the socket
# Show all statistics in CSV format
echo "show stat" | sudo socat /var/run/haproxy/admin.sock stdio

# Show current info
echo "show info" | sudo socat /var/run/haproxy/admin.sock stdio

# List all sessions
echo "show sess" | sudo socat /var/run/haproxy/admin.sock stdio

# Disable a specific server (backend_name/server_name)
echo "disable server my_backend/web1" | sudo socat /var/run/haproxy/admin.sock stdio

# Re-enable a server
echo "enable server my_backend/web1" | sudo socat /var/run/haproxy/admin.sock stdio

# Drain a server (graceful removal)
echo "set weight my_backend/web1 0" | sudo socat /var/run/haproxy/admin.sock stdio
```

## Prometheus Metrics with haproxy_exporter

For integration with Prometheus and Grafana:

```bash
# Download the HAProxy Prometheus exporter
curl -LO https://github.com/prometheus/haproxy_exporter/releases/download/v0.15.0/haproxy_exporter-0.15.0.linux-amd64.tar.gz
tar xzf haproxy_exporter-0.15.0.linux-amd64.tar.gz
sudo mv haproxy_exporter-0.15.0.linux-amd64/haproxy_exporter /usr/local/bin/

# Create a systemd service for the exporter
sudo tee /etc/systemd/system/haproxy-exporter.service << 'EOF'
[Unit]
Description=HAProxy Prometheus Exporter
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/haproxy_exporter \
    --haproxy.scrape-uri="http://admin:password@localhost:8404/stats;csv" \
    --web.listen-address=":9101"
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now haproxy-exporter

# Verify metrics are available
curl -s http://localhost:9101/metrics | grep haproxy_backend_current_sessions
```

## HAProxy's Native Prometheus Exporter

Recent versions of HAProxy (2.0+) include a native Prometheus endpoint without needing an external exporter:

```text
# In haproxy.cfg
frontend prometheus
    bind *:8405
    http-request use-service prometheus-exporter if { path /metrics }
    stats enable
    stats uri /
    no log
```

```bash
# Test the native Prometheus endpoint
curl http://localhost:8405/metrics | grep -E "^haproxy_" | head -20
```

Configure Prometheus to scrape it:

```yaml
# In /etc/prometheus/prometheus.yml
scrape_configs:
  - job_name: 'haproxy'
    static_configs:
      - targets: ['localhost:8405']
    metrics_path: /metrics
```

## Securing the Stats Page for Production

The stats page shouldn't be publicly accessible. Options:

### Bind to Localhost Only

```text
frontend stats
    # Only listen on localhost
    bind 127.0.0.1:8404
    stats enable
    stats uri /stats
    stats auth admin:strongpassword
```

Access via SSH tunnel from your workstation:
```bash
ssh -L 8404:localhost:8404 user@haproxy-server.com
# Then open http://localhost:8404/stats
```

### IP-Based Access Control

```text
frontend stats
    bind *:8404
    stats enable
    stats uri /stats
    stats auth admin:password

    # Only allow from monitoring server and admin IPs
    acl allowed_ips src 10.0.0.0/8 192.168.0.0/16
    http-request deny unless allowed_ips
```

### Firewall Rules

```bash
# Allow stats port only from specific monitoring server
sudo ufw allow from 10.0.0.5 to any port 8404
# Block everyone else
sudo ufw deny 8404
```

## Alerting on HAProxy Metrics

A simple check script to alert when backends are down:

```bash
sudo tee /usr/local/bin/check-haproxy << 'EOF'
#!/bin/bash
# Check for any DOWN servers

DOWN_SERVERS=$(echo "show stat" | socat /var/run/haproxy/admin.sock stdio | \
    awk -F',' '$18 ~ /DOWN/ {print $1"/"$2}')

if [ -n "$DOWN_SERVERS" ]; then
    echo "ALERT: HAProxy servers DOWN: $DOWN_SERVERS"
    # Send alert via webhook, email, etc.
    exit 1
fi

echo "OK: All HAProxy servers UP"
exit 0
EOF

sudo chmod +x /usr/local/bin/check-haproxy

# Run every minute via cron
echo "* * * * * root /usr/local/bin/check-haproxy >> /var/log/haproxy-check.log 2>&1" | \
    sudo tee /etc/cron.d/haproxy-check
```

For production environments, integrate HAProxy metrics with your existing monitoring stack - Prometheus and Grafana have pre-built HAProxy dashboards that make it easy to visualize traffic patterns and set up alerting on backend health and session rates.
