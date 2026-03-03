# How to Monitor VIP Status in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, VIP, Monitoring, High Availability, Kubernetes, Observability

Description: Practical approaches to monitoring Virtual IP health and failover status in Talos Linux clusters using talosctl, scripts, and monitoring tools.

---

Monitoring the VIP in your Talos Linux cluster is one of those tasks that feels unnecessary until the VIP goes down and you do not notice for an hour. The VIP is the front door to your Kubernetes API server. If it stops working, kubectl stops working, new pods cannot be scheduled, and your cluster becomes unmanageable. Having proper monitoring and alerting on VIP status gives you early warning of problems before they become outages.

This guide covers practical approaches to monitoring VIP health in Talos Linux, from simple scripts to integration with monitoring platforms.

## What to Monitor

There are several aspects of VIP health you should track:

1. **VIP reachability**: Can clients reach the VIP address?
2. **VIP ownership**: Which node currently owns the VIP?
3. **API server health through VIP**: Is the Kubernetes API server responding on the VIP?
4. **Failover events**: How often does the VIP move between nodes?
5. **etcd health**: Since VIP depends on etcd, monitoring etcd is essential

## Basic VIP Health Checks

### Checking VIP Reachability

The simplest check is whether the VIP responds to requests:

```bash
# Check API server health through VIP
curl -sk --connect-timeout 5 https://192.168.1.100:6443/healthz
# Should return "ok"

# Check with more detail
curl -sk --connect-timeout 5 https://192.168.1.100:6443/livez?verbose
```

### Checking VIP Ownership

Find which node currently holds the VIP:

```bash
# Check all control plane nodes for VIP ownership
for node in 192.168.1.10 192.168.1.11 192.168.1.12; do
  result=$(talosctl -n $node get addresses 2>/dev/null | grep "192.168.1.100")
  if [ -n "$result" ]; then
    echo "VIP owner: $node"
  fi
done
```

### Checking etcd Health

Since VIP elections depend on etcd:

```bash
# Check etcd members
talosctl -n 192.168.1.10 get etcdmembers

# Check etcd service status
talosctl -n 192.168.1.10 service etcd
```

## Building a VIP Monitoring Script

Here is a more comprehensive monitoring script that checks all aspects of VIP health:

```bash
#!/bin/bash
# vip-monitor.sh - Monitor Talos Linux VIP status

VIP="192.168.1.100"
CP_NODES=("192.168.1.10" "192.168.1.11" "192.168.1.12")
API_PORT="6443"
CHECK_INTERVAL=30

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

check_vip_health() {
    # Check API server through VIP
    local health=$(curl -sk --connect-timeout 5 "https://${VIP}:${API_PORT}/healthz" 2>/dev/null)
    if [ "$health" = "ok" ]; then
        echo -e "${GREEN}[OK]${NC} API server healthy via VIP"
        return 0
    else
        echo -e "${RED}[FAIL]${NC} API server not responding via VIP"
        return 1
    fi
}

check_vip_owner() {
    local owner=""
    for node in "${CP_NODES[@]}"; do
        local result=$(talosctl -n "$node" get addresses 2>/dev/null | grep "$VIP")
        if [ -n "$result" ]; then
            owner="$node"
            break
        fi
    done

    if [ -n "$owner" ]; then
        echo -e "${GREEN}[OK]${NC} VIP owned by: $owner"
    else
        echo -e "${RED}[FAIL]${NC} VIP not assigned to any node!"
    fi
}

check_etcd_health() {
    local healthy_members=0
    for node in "${CP_NODES[@]}"; do
        local status=$(talosctl -n "$node" service etcd 2>/dev/null | grep "Running")
        if [ -n "$status" ]; then
            healthy_members=$((healthy_members + 1))
        fi
    done

    local total=${#CP_NODES[@]}
    if [ "$healthy_members" -eq "$total" ]; then
        echo -e "${GREEN}[OK]${NC} etcd: $healthy_members/$total members healthy"
    elif [ "$healthy_members" -ge 2 ]; then
        echo -e "${YELLOW}[WARN]${NC} etcd: $healthy_members/$total members healthy"
    else
        echo -e "${RED}[FAIL]${NC} etcd: $healthy_members/$total members healthy (quorum at risk)"
    fi
}

# Main monitoring loop
while true; do
    echo "=== VIP Status Check - $(date) ==="
    check_vip_health
    check_vip_owner
    check_etcd_health
    echo ""
    sleep $CHECK_INTERVAL
done
```

Run the script:

```bash
chmod +x vip-monitor.sh
./vip-monitor.sh
```

## Prometheus-Based Monitoring

For production environments, integrate VIP monitoring with Prometheus and Grafana.

### Blackbox Exporter for VIP Probing

The Prometheus Blackbox Exporter can probe the VIP endpoint:

```yaml
# Blackbox exporter configuration
modules:
  kubernetes_api:
    prober: http
    timeout: 5s
    http:
      valid_http_versions: ["HTTP/1.1", "HTTP/2"]
      valid_status_codes: [200]
      method: GET
      tls_config:
        insecure_skip_verify: true
```

```yaml
# Prometheus scrape config for VIP probe
scrape_configs:
  - job_name: 'kubernetes-api-vip'
    metrics_path: /probe
    params:
      module: [kubernetes_api]
      target: ["https://192.168.1.100:6443/healthz"]
    static_configs:
      - targets:
          - blackbox-exporter:9115
    relabel_configs:
      - source_labels: [__param_target]
        target_label: instance
```

### Custom Prometheus Metrics

Create a simple exporter that exposes VIP ownership metrics:

```python
# vip_exporter.py - Simple VIP status exporter for Prometheus
from prometheus_client import start_http_server, Gauge, Info
import subprocess
import time
import json

# Metrics
vip_healthy = Gauge('talos_vip_healthy', 'Whether the VIP is responding')
vip_owner = Info('talos_vip_owner', 'Current VIP owner node')
etcd_healthy_members = Gauge('talos_etcd_healthy_members', 'Number of healthy etcd members')

VIP = "192.168.1.100"
CP_NODES = ["192.168.1.10", "192.168.1.11", "192.168.1.12"]

def check_vip():
    """Check if VIP is responding"""
    try:
        result = subprocess.run(
            ["curl", "-sk", "--connect-timeout", "5",
             f"https://{VIP}:6443/healthz"],
            capture_output=True, text=True, timeout=10
        )
        if result.stdout.strip() == "ok":
            vip_healthy.set(1)
        else:
            vip_healthy.set(0)
    except Exception:
        vip_healthy.set(0)

def check_owner():
    """Find VIP owner"""
    for node in CP_NODES:
        try:
            result = subprocess.run(
                ["talosctl", "-n", node, "get", "addresses"],
                capture_output=True, text=True, timeout=10
            )
            if VIP in result.stdout:
                vip_owner.info({"node": node})
                return
        except Exception:
            continue
    vip_owner.info({"node": "none"})

if __name__ == '__main__':
    start_http_server(9101)
    while True:
        check_vip()
        check_owner()
        time.sleep(15)
```

### Alerting Rules

Set up Prometheus alerting for VIP issues:

```yaml
# Prometheus alerting rules
groups:
  - name: talos-vip
    rules:
      - alert: VIPNotResponding
        expr: probe_success{job="kubernetes-api-vip"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Kubernetes API VIP is not responding"
          description: "The VIP at 192.168.1.100 has not responded for more than 1 minute"

      - alert: VIPHighLatency
        expr: probe_duration_seconds{job="kubernetes-api-vip"} > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Kubernetes API VIP has high latency"
          description: "API server response time through VIP is above 2 seconds"
```

## Tracking Failover Events

Knowing when the VIP moves between nodes helps you identify stability issues:

```bash
#!/bin/bash
# vip-failover-tracker.sh - Log VIP ownership changes

VIP="192.168.1.100"
CP_NODES=("192.168.1.10" "192.168.1.11" "192.168.1.12")
LOG_FILE="/var/log/vip-failover.log"
LAST_OWNER=""

while true; do
    current_owner=""
    for node in "${CP_NODES[@]}"; do
        result=$(talosctl -n "$node" get addresses 2>/dev/null | grep "$VIP")
        if [ -n "$result" ]; then
            current_owner="$node"
            break
        fi
    done

    if [ "$current_owner" != "$LAST_OWNER" ]; then
        timestamp=$(date '+%Y-%m-%d %H:%M:%S')
        if [ -z "$current_owner" ]; then
            echo "$timestamp ALERT: VIP has no owner (was: $LAST_OWNER)" | tee -a "$LOG_FILE"
        elif [ -z "$LAST_OWNER" ]; then
            echo "$timestamp INFO: VIP assigned to $current_owner (initial)" | tee -a "$LOG_FILE"
        else
            echo "$timestamp FAILOVER: VIP moved from $LAST_OWNER to $current_owner" | tee -a "$LOG_FILE"
        fi
        LAST_OWNER="$current_owner"
    fi

    sleep 5
done
```

Review the failover log:

```bash
# Check failover history
cat /var/log/vip-failover.log

# Count failovers in the last 24 hours
grep "FAILOVER" /var/log/vip-failover.log | grep "$(date +%Y-%m-%d)" | wc -l
```

Frequent failovers (more than a few per day) indicate instability that needs investigation.

## Monitoring from Inside the Cluster

You can also deploy monitoring components inside the Kubernetes cluster itself:

```yaml
# VIP health check as a Kubernetes CronJob
apiVersion: batch/v1
kind: CronJob
metadata:
  name: vip-health-check
  namespace: monitoring
spec:
  schedule: "*/5 * * * *"    # Every 5 minutes
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: check
              image: curlimages/curl:latest
              command:
                - /bin/sh
                - -c
                - |
                  result=$(curl -sk --connect-timeout 10 https://192.168.1.100:6443/healthz)
                  if [ "$result" = "ok" ]; then
                    echo "VIP healthy at $(date)"
                  else
                    echo "VIP UNHEALTHY at $(date)"
                    # Add notification logic here (webhook, email, etc.)
                  fi
          restartPolicy: OnFailure
```

## Integration with OneUptime

For comprehensive monitoring, integrate with a platform like OneUptime that provides uptime monitoring and alerting:

```bash
# Configure a health check endpoint pointing to your VIP
# URL: https://192.168.1.100:6443/healthz
# Expected response: "ok"
# Check interval: 30 seconds
# Alert after: 2 consecutive failures
```

This gives you external monitoring that is independent of your cluster, which is important because if the cluster itself is down, internal monitoring cannot alert you.

## Dashboard Ideas

When building a monitoring dashboard for VIP status, include these panels:

1. **VIP availability percentage** (over 24h, 7d, 30d)
2. **Current VIP owner** (which node)
3. **VIP response time** (latency trend)
4. **Failover event timeline** (when VIP moved)
5. **etcd health status** (all members)
6. **Node health** (CPU, memory, network for each control plane node)

## Conclusion

Monitoring VIP status in Talos Linux should be treated as a critical monitoring requirement, not an afterthought. The VIP is your cluster's front door, and knowing when it is down or unstable is essential for maintaining reliable operations. Start with a simple health check script, then build up to Prometheus-based monitoring with alerting as your cluster matures. The most important metric is simple: can clients reach the Kubernetes API through the VIP? If you are monitoring and alerting on that one thing, you have covered the most critical case. Everything else - ownership tracking, failover logging, etcd health - helps you diagnose and prevent problems.
