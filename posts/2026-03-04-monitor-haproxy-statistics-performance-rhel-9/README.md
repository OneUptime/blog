# How to Monitor HAProxy Statistics and Performance on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, HAProxy, Monitoring, Statistics, Linux

Description: How to enable and use HAProxy's built-in statistics dashboard and runtime API to monitor load balancer performance on RHEL.

---

## Why Monitor HAProxy?

Running a load balancer without monitoring is flying blind. You need to know how traffic is distributed, which backends are healthy, how many connections are active, and whether you are approaching capacity limits. HAProxy has excellent built-in monitoring through its stats page and runtime socket.

## Prerequisites

- RHEL with HAProxy installed
- Root or sudo access

## Step 1 - Enable the Statistics Dashboard

Add a stats listener to your HAProxy configuration:

```
listen stats
    bind *:8404
    mode http
    stats enable
    stats uri /stats
    stats refresh 10s
    stats show-legends
    stats auth admin:your-secure-password
```

Open the firewall:

```bash
# Allow access to the stats port
sudo firewall-cmd --permanent --add-port=8404/tcp
sudo firewall-cmd --reload
```

Reload HAProxy:

```bash
haproxy -c -f /etc/haproxy/haproxy.cfg
sudo systemctl reload haproxy
```

Browse to `http://your-haproxy:8404/stats` and log in.

## Step 2 - Understanding the Stats Page

The dashboard shows a table for each frontend and backend. Key columns:

| Column | Meaning |
|--------|---------|
| `Status` | UP (green), DOWN (red), or NOLB |
| `Cur` | Current active sessions |
| `Max` | Maximum concurrent sessions seen |
| `Limit` | Configured session limit |
| `Total` | Total sessions handled |
| `Bytes In/Out` | Total traffic |
| `Denied` | Requests denied by ACLs |
| `Errors` | Connection and response errors |
| `Warnings` | Retry and redispatch warnings |
| `Server` | Backend server status details |

## Step 3 - Enable the Runtime API Socket

The stats socket lets you query HAProxy and make runtime changes:

```
global
    stats socket /var/lib/haproxy/stats level admin
    stats timeout 30s
```

Now you can use `socat` to interact with HAProxy:

```bash
# Install socat if not present
sudo dnf install -y socat
```

## Step 4 - Query Statistics from the Command Line

```bash
# Get a summary of all frontends and backends
echo "show stat" | sudo socat stdio /var/lib/haproxy/stats
```

The output is CSV. To make it readable:

```bash
# Show server names and their status
echo "show stat" | sudo socat stdio /var/lib/haproxy/stats | \
    awk -F',' '{print $1, $2, $18}' | column -t
```

## Step 5 - Useful Runtime Commands

```bash
# Show general information (uptime, connections, etc.)
echo "show info" | sudo socat stdio /var/lib/haproxy/stats

# Show all backend server states
echo "show servers state" | sudo socat stdio /var/lib/haproxy/stats

# Show current sessions
echo "show sess" | sudo socat stdio /var/lib/haproxy/stats

# Show error counts
echo "show errors" | sudo socat stdio /var/lib/haproxy/stats
```

## Step 6 - Enable CSV Stats Endpoint

You can expose stats as CSV via HTTP for external monitoring tools:

```
frontend http_front
    bind *:80

    # Serve stats as CSV at /haproxy-stats
    stats uri /haproxy-stats
    stats enable
```

Then fetch stats programmatically:

```bash
# Fetch stats as CSV
curl -s "http://admin:password@your-haproxy:8404/stats;csv"
```

## Step 7 - Monitor Key Metrics

These are the metrics you should watch:

### Connection Metrics

```bash
# Current connections and session rate
echo "show info" | sudo socat stdio /var/lib/haproxy/stats | \
    grep -E "CurrConns|SessRate|MaxConn|ConnRate"
```

### Backend Health

```bash
# Check which backends are up or down
echo "show stat" | sudo socat stdio /var/lib/haproxy/stats | \
    awk -F',' '$1 != "" && $2 != "FRONTEND" && $2 != "BACKEND" {print $1, $2, "status:", $18}'
```

### Error Rates

```bash
# Show error counts per backend
echo "show stat" | sudo socat stdio /var/lib/haproxy/stats | \
    awk -F',' '$2 != "" {print $1, $2, "conn_err:", $14, "resp_err:", $15}'
```

## Monitoring Dashboard Flow

```mermaid
flowchart LR
    A[HAProxy] --> B[Stats Socket]
    A --> C[Stats Web Page]
    B --> D[CLI Queries via socat]
    B --> E[Monitoring Tools]
    C --> F[Browser Dashboard]
    E --> G[Prometheus/Grafana]
    E --> H[Nagios/Zabbix]
```

## Step 8 - Prometheus Integration

HAProxy can expose metrics in Prometheus format:

```
frontend prometheus
    bind *:8405
    mode http
    http-request use-service prometheus-exporter if { path /metrics }
    no log
```

Then configure Prometheus to scrape `http://your-haproxy:8405/metrics`.

## Step 9 - Set Up Log Monitoring

Configure detailed logging:

```
global
    log /dev/log local0 info

defaults
    log global
    option httplog
```

Set up rsyslog for dedicated HAProxy log files:

```bash
sudo tee /etc/rsyslog.d/49-haproxy.conf > /dev/null <<'EOF'
local0.* /var/log/haproxy.log
EOF
sudo systemctl restart rsyslog
```

Monitor the log:

```bash
# Watch HAProxy logs in real time
sudo tail -f /var/log/haproxy.log
```

## Step 10 - Alerting on Key Thresholds

Things to alert on:

- Backend server goes DOWN
- Current connections exceed 80% of maxconn
- Error rate spikes
- Response time increases
- Queue depth exceeds 0 (requests are waiting)

You can script these checks:

```bash
# Check if any backend servers are down
DOWN_COUNT=$(echo "show stat" | sudo socat stdio /var/lib/haproxy/stats | \
    awk -F',' '$18 == "DOWN" {count++} END {print count+0}')
if [ "$DOWN_COUNT" -gt 0 ]; then
    echo "WARNING: $DOWN_COUNT backend servers are DOWN"
fi
```

## Wrap-Up

HAProxy's built-in monitoring is one of its strongest features. Enable the stats page on day one and use it to verify your configuration is working as expected. The runtime socket gives you powerful CLI access for scripting and integration with monitoring tools. For production, integrate with Prometheus and Grafana for historical data and alerting, and set up log monitoring for request-level visibility.
