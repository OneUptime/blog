# How to Monitor Time Drift on Talos Linux Nodes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Time Drift, Monitoring, NTP, Observability, Kubernetes, Prometheus

Description: Learn how to set up continuous monitoring of time drift across Talos Linux nodes to catch synchronization problems before they affect your cluster.

---

Time drift happens silently. A node's clock gradually falls behind or pushes ahead, and by the time you notice, the damage is already done - expired certificates, etcd instability, corrupted log ordering. The solution is not just to configure NTP and hope for the best. You need active monitoring that alerts you when drift exceeds acceptable thresholds. This post shows you how to build comprehensive time drift monitoring for your Talos Linux cluster.

## Understanding Time Drift

Every computer's hardware clock runs at a slightly different rate. Crystal oscillators vary due to manufacturing tolerances, temperature changes, and aging. Without correction, a typical server clock might drift by several seconds per day. NTP corrects for this by periodically adjusting the system clock, but NTP itself can fail silently.

The goal of drift monitoring is to detect when NTP correction is not working - either because the NTP service has failed, the network is blocking NTP traffic, or the drift rate exceeds what NTP can compensate for.

## Basic Drift Detection with talosctl

The simplest form of drift monitoring is periodic checks using `talosctl`:

```bash
#!/bin/bash
# drift-check.sh - Run periodically to detect time drift

NODES="192.168.1.10 192.168.1.11 192.168.1.12 192.168.1.20 192.168.1.21"
MAX_DRIFT_MS=100  # Alert threshold in milliseconds

echo "Time Drift Report - $(date -u)"
echo "================================"

# Get reference time from a known-good source
reference_epoch=$(date +%s)

for node in $NODES; do
  # Get node time
  node_time=$(talosctl -n "$node" time 2>/dev/null)

  # Check sync status
  synced=$(talosctl -n "$node" get timestatus -o yaml 2>/dev/null | \
    grep "synced:" | awk '{print $2}')

  echo ""
  echo "Node: $node"
  echo "  Time: $node_time"
  echo "  Synced: $synced"

  if [ "$synced" != "true" ]; then
    echo "  STATUS: NOT SYNCED - ALERT"
  else
    echo "  STATUS: OK"
  fi
done
```

## Cross-Node Time Comparison

Comparing time between nodes directly reveals relative drift:

```bash
#!/bin/bash
# cross-node-drift.sh - Compare time between all node pairs

NODES=(192.168.1.10 192.168.1.11 192.168.1.12 192.168.1.20 192.168.1.21)

echo "Cross-Node Time Comparison"
echo "=========================="

# Collect timestamps from all nodes
declare -A node_times
for node in "${NODES[@]}"; do
  # Get the epoch time from each node
  time_output=$(talosctl -n "$node" time 2>/dev/null)
  node_times[$node]="$time_output"
  echo "$node: $time_output"
done

echo ""
echo "All nodes should report times within 100ms of each other."
echo "If any pair differs by more than 1 second, investigate immediately."
```

## Prometheus-Based Monitoring

For production clusters, you want continuous monitoring with alerting. Prometheus with the Node Exporter provides time-related metrics that you can use for drift detection.

### Deploying Node Exporter on Talos

Deploy the Node Exporter as a DaemonSet:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-exporter
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: node-exporter
  template:
    metadata:
      labels:
        app: node-exporter
    spec:
      hostNetwork: true
      hostPID: true
      containers:
        - name: node-exporter
          image: prom/node-exporter:latest
          args:
            - "--collector.ntp"
            - "--collector.ntp.server=time.cloudflare.com"
            - "--collector.ntp.protocol-version=4"
            - "--collector.ntp.server-is-local=false"
          ports:
            - containerPort: 9100
              hostPort: 9100
              name: metrics
          securityContext:
            privileged: true
      tolerations:
        - operator: Exists
```

The `--collector.ntp` flag enables NTP offset collection, which directly measures drift against a reference server.

### Key Time Metrics

The Node Exporter provides several relevant metrics:

```bash
# Current NTP offset (drift from reference)
node_ntp_offset_seconds

# Whether NTP is synced (1 = synced, 0 = not synced)
node_timex_sync_status

# Current clock frequency adjustment
node_timex_frequency_adjustment_ratio

# Maximum estimated error
node_timex_maxerror_seconds

# Estimated error
node_timex_estimated_error_seconds
```

### Prometheus Alert Rules

Set up alerts for drift conditions:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: time-drift-alerts
  namespace: monitoring
spec:
  groups:
    - name: time-drift
      rules:
        # Alert when NTP sync is lost
        - alert: NodeNTPSyncLost
          expr: node_timex_sync_status == 0
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "NTP sync lost on {{ $labels.instance }}"
            description: "Node {{ $labels.instance }} has lost NTP synchronization for more than 5 minutes."

        # Alert when drift exceeds 50ms
        - alert: NodeTimeDriftHigh
          expr: abs(node_ntp_offset_seconds) > 0.05
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Time drift detected on {{ $labels.instance }}"
            description: "Node {{ $labels.instance }} has {{ $value }}s of time drift."

        # Critical alert when drift exceeds 500ms
        - alert: NodeTimeDriftCritical
          expr: abs(node_ntp_offset_seconds) > 0.5
          for: 2m
          labels:
            severity: critical
          annotations:
            summary: "Critical time drift on {{ $labels.instance }}"
            description: "Node {{ $labels.instance }} has {{ $value }}s of time drift. This can cause certificate errors and etcd instability."

        # Alert when clock frequency error is high
        - alert: NodeClockFrequencyError
          expr: abs(node_timex_frequency_adjustment_ratio - 1) > 0.001
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "High clock frequency error on {{ $labels.instance }}"
            description: "Node {{ $labels.instance }} clock frequency adjustment is abnormal."
```

### Grafana Dashboard

Create a Grafana dashboard to visualize drift over time:

```json
{
  "panels": [
    {
      "title": "NTP Offset per Node",
      "type": "timeseries",
      "targets": [
        {
          "expr": "node_ntp_offset_seconds",
          "legendFormat": "{{ instance }}"
        }
      ]
    },
    {
      "title": "NTP Sync Status",
      "type": "stat",
      "targets": [
        {
          "expr": "node_timex_sync_status",
          "legendFormat": "{{ instance }}"
        }
      ]
    },
    {
      "title": "Clock Frequency Adjustment",
      "type": "timeseries",
      "targets": [
        {
          "expr": "node_timex_frequency_adjustment_ratio",
          "legendFormat": "{{ instance }}"
        }
      ]
    }
  ]
}
```

## Talos Resource-Based Monitoring

You can also monitor drift using Talos native resources:

```bash
# Watch for time status changes
talosctl -n 192.168.1.10 get timestatus --watch

# Script to continuously monitor sync status
#!/bin/bash
while true; do
  for node in 192.168.1.10 192.168.1.11 192.168.1.12; do
    synced=$(talosctl -n "$node" get timestatus -o yaml 2>/dev/null | \
      grep "synced:" | awk '{print $2}')
    if [ "$synced" != "true" ]; then
      echo "$(date -u): ALERT - $node not synced"
      # Send alert via your preferred method
    fi
  done
  sleep 60
done
```

## Detecting Drift Patterns

Not all drift is the same. Understanding the pattern helps you fix the root cause:

### Gradual Drift

The clock slowly moves away from the reference. This usually means NTP is not running or cannot reach its servers:

```bash
# Check if NTP is actually running
talosctl -n 192.168.1.10 service timed

# Check NTP server reachability
talosctl -n 192.168.1.10 logs timed | grep -i "error\|timeout\|unreachable"
```

### Oscillating Drift

The clock bounces back and forth. This usually means two time sources are fighting:

```bash
# Check for competing time sync
talosctl -n 192.168.1.10 dmesg | grep -i "time\|clock"
talosctl -n 192.168.1.10 get timeserverconfig -o yaml
```

### Sudden Jump

The clock suddenly jumps by a large amount. This could be NTP correcting a large offset, or a VM migration/suspend event:

```bash
# Check system logs around the time of the jump
talosctl -n 192.168.1.10 logs timed | grep -i "step\|jump"
talosctl -n 192.168.1.10 dmesg | grep -i "suspend\|resume\|migration"
```

## Setting Up Automated Remediation

For production clusters, consider automated remediation when drift is detected:

```bash
#!/bin/bash
# auto-remediate-drift.sh

NODES="192.168.1.10 192.168.1.11 192.168.1.12 192.168.1.20 192.168.1.21"
ALERT_WEBHOOK="https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"

for node in $NODES; do
  synced=$(talosctl -n "$node" get timestatus -o yaml 2>/dev/null | \
    grep "synced:" | awk '{print $2}')

  if [ "$synced" != "true" ]; then
    # Log the issue
    echo "$(date -u): $node not synced, checking time service..."

    # Check if time service is running
    timed_state=$(talosctl -n "$node" service timed 2>/dev/null | \
      grep "STATE" | awk '{print $2}')

    if [ "$timed_state" != "Running" ]; then
      echo "$(date -u): $node timed service not running"
      # Send alert
      curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"Time sync alert: $node timed service not running\"}" \
        "$ALERT_WEBHOOK"
    else
      echo "$(date -u): $node timed running but not synced - checking NTP servers"
      talosctl -n "$node" logs timed | tail -5
    fi
  fi
done
```

## Best Practices for Drift Monitoring

1. **Set appropriate thresholds** - For most Kubernetes clusters, alert on drift over 50ms and treat anything over 500ms as critical.

2. **Monitor all nodes** - Do not just monitor control plane nodes. Worker nodes with bad time can cause application-level issues.

3. **Track trends** - A node that is slowly drifting more over time may have a hardware issue that needs attention.

4. **Include time drift in runbooks** - Document the steps to diagnose and fix drift issues so any on-call engineer can handle them.

5. **Test your alerts** - Periodically verify that your time drift alerts actually fire. You can do this by temporarily disabling NTP on a test node and watching for the alert.

6. **Keep historical data** - Retain drift metrics for at least 30 days so you can correlate time issues with other incidents.

Monitoring time drift is an investment in cluster reliability. The setup takes some effort, but the alternative - discovering drift after it has already caused a production incident - is much more expensive. Build monitoring into your cluster from day one, and time-related issues will be caught and resolved before your users notice anything.
