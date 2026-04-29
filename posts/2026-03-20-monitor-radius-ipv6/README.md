# How to Monitor RADIUS Servers for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RADIUS, IPv6, Monitoring, Prometheus, Grafana, FreeRADIUS, AAA

Description: Monitor FreeRADIUS server performance, IPv6 authentication statistics, and active subscriber sessions with Prometheus, Grafana, and custom scripts.

## Key RADIUS Metrics to Monitor

| Metric | Description | Alert Threshold |
|---|---|---|
| Auth success rate | Accepted / (Accepted + Rejected) | < 95% |
| Auth response time | Average ms per request | > 500ms |
| Active sessions | Concurrent authenticated users | > 80% capacity |
| IPv6 assignments | Framed-IPv6-Prefix assigned | Pool utilization > 80% |
| Accounting gaps | Missing Stop records | > 5% of sessions |
| NAS reachability | Packets from each NAS | 0 = NAS offline |

## FreeRADIUS Status Server

```bash
# FreeRADIUS status server - built-in metrics endpoint

# /etc/freeradius/3.0/sites-enabled/status

server status {
    listen {
        type    = status
        ipaddr  = ::1       # IPv6 localhost
        port    = 18121
    }

    authorize {
        ok
    }
}

# Query status server
echo "Message-Authenticator = 0x00, FreeRADIUS-Statistics-Type = 1" | \
    radclient -x [::1]:18121 status mysecret

# FreeRADIUS-Statistics-Type values (bitmask, add to combine):
# 1   = Authentication statistics
# 2   = Accounting statistics
# 4   = Proxy authentication statistics
# 8   = Proxy accounting statistics
# 16  = Internal (queue lengths, thread info)
# 32  = Client statistics
# 64  = Server (listen socket) statistics
# 128 = Home server statistics
```

## Prometheus: FreeRADIUS Exporter

```bash
# Install freeradius_exporter (Prometheus metrics)
# https://github.com/bvantagelimited/freeradius_exporter
go install github.com/bvantagelimited/freeradius_exporter@latest

# Start exporter (configured via command-line flags, listening on IPv6)
freeradius_exporter \
    -web.listen-address "[::]:9812" \
    -radius.address "[::1]:18121" \
    -radius.secret "mysecret" \
    -radius.timeout 5000

# Prometheus scrape config
cat >> /etc/prometheus/prometheus.yml << 'EOF'
scrape_configs:
  - job_name: 'freeradius'
    static_configs:
      - targets: ['[::1]:9812']
EOF
```

## Custom Metrics Script

```bash
#!/bin/bash
# /usr/local/bin/radius-metrics.sh - Prometheus textfile collector

OUTPUT="/var/lib/node_exporter/textfile_collector/radius.prom"

{
    echo "# HELP radius_auth_requests_total Total RADIUS auth requests"
    echo "# TYPE radius_auth_requests_total counter"

    # Query FreeRADIUS status server
    STATS=$(echo "Message-Authenticator = 0x00, FreeRADIUS-Statistics-Type = 15" | \
        radclient -x [::1]:18121 status mysecret 2>/dev/null)

    AUTH_REQ=$(echo "$STATS" | grep "FreeRADIUS-Total-Access-Requests" | awk '{print $3}')
    AUTH_ACC=$(echo "$STATS" | grep "FreeRADIUS-Total-Access-Accepts" | awk '{print $3}')
    AUTH_REJ=$(echo "$STATS" | grep "FreeRADIUS-Total-Access-Rejects" | awk '{print $3}')

    echo "radius_auth_requests_total ${AUTH_REQ:-0}"
    echo "radius_auth_accepts_total ${AUTH_ACC:-0}"
    echo "radius_auth_rejects_total ${AUTH_REJ:-0}"

    # IPv6 active sessions
    echo "# HELP radius_ipv6_sessions Active sessions with IPv6 prefix"
    echo "# TYPE radius_ipv6_sessions gauge"
    IPV6_SESSIONS=$(mysql -u radius -p"${MYSQL_PASS}" -s -N radius \
        -e "SELECT COUNT(*) FROM radacct WHERE acctstoptime IS NULL AND framedipv6prefix IS NOT NULL" 2>/dev/null)
    echo "radius_ipv6_sessions ${IPV6_SESSIONS:-0}"

    # Pool utilization
    echo "# HELP radius_ipv6_pool_used IPv6 pool entries in use"
    echo "# TYPE radius_ipv6_pool_used gauge"
    POOL_USED=$(redis-cli -h ::1 keys "ipv6pool_*" 2>/dev/null | wc -l)
    echo "radius_ipv6_pool_used ${POOL_USED:-0}"

} > "${OUTPUT}.tmp" && mv "${OUTPUT}.tmp" "${OUTPUT}"
```

## SQL-Based Session Monitoring

```bash
#!/bin/bash
# Monitor active sessions with IPv6 attributes

MYSQL_OPTS="-u radius -p${MYSQL_PASS} -s -N radius"

# Active sessions with IPv6 prefix
echo "=== Active IPv6 Sessions ==="
mysql ${MYSQL_OPTS} << 'EOF'
SELECT
    username,
    nasipv6address,
    framedipv6prefix,
    delegatedipv6prefix,
    TIMESTAMPDIFF(MINUTE, acctstarttime, NOW()) AS minutes,
    acctinputoctets + acctoutputoctets AS total_bytes
FROM radacct
WHERE acctstoptime IS NULL
  AND framedipv6prefix IS NOT NULL
ORDER BY acctstarttime DESC
LIMIT 20;
EOF

# Failed authentications in last hour
echo ""
echo "=== Recent Auth Failures ==="
mysql ${MYSQL_OPTS} << 'EOF'
SELECT username, reply, authdate, nasipv6address
FROM radpostauth
WHERE reply = 'Access-Reject'
  AND authdate > DATE_SUB(NOW(), INTERVAL 1 HOUR)
ORDER BY authdate DESC
LIMIT 10;
EOF
```

## Prometheus Alerting Rules

```yaml
# prometheus-radius-alerts.yml
groups:
  - name: radius
    rules:
      - alert: RADIUSHighRejectRate
        expr: |
          rate(radius_auth_rejects_total[5m]) /
          rate(radius_auth_requests_total[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "RADIUS reject rate {{ $value | humanizePercentage }}"

      - alert: RADIUSIPv6PoolExhausted
        expr: radius_ipv6_pool_used > 900  # 90% of 1000 addresses
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "IPv6 pool at {{ $value }} used addresses"

      - alert: RADIUSDown
        expr: up{job="freeradius"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "FreeRADIUS exporter unreachable"
```

## Grafana Dashboard Queries

```text
# Panel: Authentication success rate (%)
rate(radius_auth_accepts_total[5m]) /
rate(radius_auth_requests_total[5m]) * 100

# Panel: Active IPv6 sessions (gauge)
radius_ipv6_sessions

# Panel: Auth requests/sec (line)
rate(radius_auth_requests_total[1m])

# Panel: Rejects/sec by NAS
rate(radius_auth_rejects_total{nas=~".*"}[5m])
```

## Conclusion

Monitoring FreeRADIUS for IPv6 deployments combines the built-in status server (queried via `radclient` at `[::1]:18121`) with SQL queries against the `radacct` table. Export metrics to Prometheus using `freeradius_exporter` or a custom textfile collector script. Key metrics: authentication accept/reject rates (alert if reject rate > 10%), IPv6 pool utilization (alert at 80%+), and active session count. SQL queries on `radacct WHERE framedipv6prefix IS NOT NULL` give direct visibility into IPv6-assigned sessions. Set up Grafana dashboards with rate calculations and gauge panels for pool utilization.
