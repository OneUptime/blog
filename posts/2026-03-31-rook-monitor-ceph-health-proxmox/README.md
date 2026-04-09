# How to Monitor Ceph Health from Proxmox

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Proxmox, Monitoring, Health, Dashboard, Alerting

Description: Monitor Ceph cluster health, OSD status, pool usage, and performance metrics from Proxmox nodes using CLI tools, the web interface, and Grafana integration.

---

Maintaining a healthy Ceph cluster backing Proxmox VMs requires ongoing monitoring of OSD health, pool capacity, and I/O performance. This guide covers the monitoring tools available from Proxmox nodes and how to set up proactive alerting.

## Using the Proxmox Web UI for Ceph Monitoring

The Proxmox GUI provides a summary Ceph view:

- **Node -> Ceph**: Health status, OSDs in/up/out, capacity overview
- **Node -> Ceph -> OSD**: Per-OSD status with device class and utilization
- **Node -> Ceph -> Pools**: Pool-level usage and PG status
- **Node -> Ceph -> Monitor**: Monitor daemon status and quorum information

## CLI Health Commands on Proxmox Nodes

Since Proxmox nodes have `ceph-common` installed, all standard Ceph commands work:

```bash
# Quick health summary
ceph health

# Detailed health with all warnings explained
ceph health detail

# Full cluster status
ceph -s

# OSD tree showing device classes and status
ceph osd tree

# Real-time event stream (Ctrl+C to stop)
ceph -w
```

## Pool Capacity Monitoring

```bash
# Check pool usage
ceph df

# Detailed pool stats
ceph df detail

# Identify pools approaching capacity
ceph df --format json | python3 -c "
import json, sys
data = json.load(sys.stdin)
for pool in data['pools']:
    pct = pool['stats']['percent_used'] * 100
    if pct > 70:
        print(f'WARNING: Pool {pool[\"name\"]} is {pct:.1f}% full')
"
```

## Automated Health Check Script

```bash
#!/bin/bash
# ceph-health-check.sh - Run on Proxmox node, send alert if unhealthy

NOTIFY_EMAIL="admin@example.com"
PROXMOX_HOST=$(hostname)

# Get Ceph health
HEALTH=$(ceph health 2>&1)
STATUS=$(ceph health | awk '{print $1}')

if [ "${STATUS}" != "HEALTH_OK" ]; then
  DETAILS=$(ceph health detail)
  CAPACITY=$(ceph df | grep TOTAL)

  mail -s "Ceph Health Alert on ${PROXMOX_HOST}: ${STATUS}" "${NOTIFY_EMAIL}" <<EOF
Ceph cluster is NOT healthy on ${PROXMOX_HOST}.

Health Status: ${STATUS}

Details:
${DETAILS}

Capacity:
${CAPACITY}

Timestamp: $(date)
EOF
  exit 1
fi

echo "$(date): Ceph health OK"
```

```bash
# Schedule in cron
echo "*/5 * * * * root /usr/local/bin/ceph-health-check.sh >> /var/log/ceph-health.log 2>&1" \
  >> /etc/crontab
```

## Setting Up Prometheus and Grafana

```bash
# Enable the Ceph Prometheus module
ceph mgr module enable prometheus

# Verify metrics endpoint
curl -s http://localhost:9283/metrics | grep ceph_health_status

# Add to Prometheus config on your monitoring server
cat >> /etc/prometheus/prometheus.yml <<EOF
  - job_name: 'ceph'
    static_configs:
      - targets: ['pve1:9283', 'pve2:9283', 'pve3:9283']
    scrape_interval: 30s
EOF

systemctl reload prometheus
```

## Ceph Dashboard for Deep Monitoring

```bash
# Enable the Ceph Dashboard manager module
ceph mgr module enable dashboard
ceph dashboard create-self-signed-cert
echo -n "securepassword" | ceph dashboard ac-user-create admin -i - administrator

# Get the dashboard URL
ceph mgr services
# Access: https://pve1:8443/
```

## Key Metrics to Watch

| Metric | Threshold | Action |
|--------|-----------|--------|
| Health status | not HEALTH_OK | Investigate immediately |
| OSD utilization | >85% | Add capacity |
| Pool capacity | >75% | Plan expansion |
| Recovery I/O | sustained >100 MB/s | Investigate OSD failures |
| PG stuck | >0 inactive | Immediate attention |

```bash
# Check PG health specifically
ceph pg stat
ceph pg dump_stuck inactive
ceph pg dump_stuck unclean
```

## Summary

Monitoring Ceph health from Proxmox nodes uses standard Ceph CLI tools (`ceph health`, `ceph -s`, `ceph df`) plus the Proxmox web UI's built-in Ceph status page. For proactive alerting, set up a cron-based health check script that emails on non-HEALTH_OK status. For production environments, enable the Prometheus module and connect to Grafana for dashboards that show trends in OSD utilization, pool capacity, and I/O performance over time. Always monitor both the cluster health status and pool capacity to avoid surprise storage exhaustion during peak VM activity.
