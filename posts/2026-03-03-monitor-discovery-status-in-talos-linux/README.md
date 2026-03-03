# How to Monitor Discovery Status in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Monitoring, Discovery Service, Observability, Cluster Management

Description: Learn how to monitor the cluster discovery service status in Talos Linux to ensure reliable node registration and detect issues before they affect your cluster.

---

The discovery service in Talos Linux runs quietly in the background, handling node registration and peer discovery. When it works, you never think about it. When it breaks, the consequences cascade through KubeSpan, node membership, and cluster operations. Monitoring discovery status proactively helps you catch issues before they become outages. This guide covers how to build visibility into your Talos cluster's discovery health.

## Discovery Resources to Monitor

Talos exposes several resources related to discovery that you can query:

```bash
# Discovered members - the list of known cluster members
talosctl get discoveredmembers --nodes <node-ip>

# Cluster identity - the cluster ID used for discovery
talosctl get clusteridentity --nodes <node-ip>

# KubeSpan identity - includes the WireGuard identity shared via discovery
talosctl get kubespanidentity --nodes <node-ip>

# KubeSpan peer status - derived from discovery data
talosctl get kubespanpeerstatus --nodes <node-ip>
```

The most important one for monitoring is `discoveredmembers`. If this list is incomplete or empty, something is wrong with discovery.

## Quick Health Check

Here is a simple one-liner to check if discovery is healthy:

```bash
# Compare discovered members to actual Kubernetes nodes
DISCOVERED=$(talosctl get discoveredmembers --nodes <node-ip> -o json | jq 'length')
K8S_NODES=$(kubectl get nodes --no-headers | wc -l)
echo "Discovered: $DISCOVERED, K8s Nodes: $K8S_NODES"
```

If the numbers match, discovery is working. If the discovered count is lower than the Kubernetes node count, some nodes are not registering or their registrations are not being received.

## Building a Monitoring Script

For regular health checks, create a comprehensive monitoring script:

```bash
#!/bin/bash
# discovery-monitor.sh
# Monitor Talos cluster discovery health

# Configuration
NODES=("10.0.0.10" "10.0.0.11" "10.0.0.12" "10.0.0.20" "10.0.0.21")
EXPECTED_MEMBERS=${#NODES[@]}
ALERT_THRESHOLD=1  # Alert if more than this many nodes are missing from discovery

ISSUES=()

for node in "${NODES[@]}"; do
  # Check if the node is reachable
  if ! talosctl get discoveredmembers --nodes "$node" > /dev/null 2>&1; then
    ISSUES+=("Cannot reach node $node via talosctl")
    continue
  fi

  # Count discovered members
  MEMBER_COUNT=$(talosctl get discoveredmembers --nodes "$node" -o json 2>/dev/null | jq 'length')

  if [ -z "$MEMBER_COUNT" ]; then
    ISSUES+=("Node $node returned invalid discovery data")
    continue
  fi

  MISSING=$((EXPECTED_MEMBERS - MEMBER_COUNT - 1))  # Subtract 1 because a node does not discover itself

  if [ "$MISSING" -gt "$ALERT_THRESHOLD" ]; then
    ISSUES+=("Node $node sees only $MEMBER_COUNT members (expected $((EXPECTED_MEMBERS - 1)))")
  fi
done

# Report results
if [ ${#ISSUES[@]} -eq 0 ]; then
  echo "OK: Discovery healthy across all nodes"
  exit 0
else
  echo "CRITICAL: Discovery issues detected:"
  for issue in "${ISSUES[@]}"; do
    echo "  - $issue"
  done
  exit 2
fi
```

## Watching Discovery Changes in Real Time

When troubleshooting or during maintenance, watch discovery in real time:

```bash
# Watch for member changes
talosctl get discoveredmembers --nodes <node-ip> --watch
```

This shows live updates as nodes register, deregister, or update their information. It is particularly useful during:
- Cluster scaling (adding or removing nodes)
- Node reboots or upgrades
- Network changes that affect discovery

## Monitoring the Discovery Service Endpoint

If you use the public discovery service or a self-hosted one, monitor its availability:

```bash
# Check the public discovery service
curl -s -o /dev/null -w "%{http_code}" https://discovery.talos.dev/
# Should return 200

# For self-hosted services with health endpoints
curl -s -o /dev/null -w "%{http_code}" https://discovery.internal.example.com/healthz
```

Set this up as a synthetic monitor:

```bash
#!/bin/bash
# discovery-endpoint-check.sh
ENDPOINT="https://discovery.talos.dev/"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "$ENDPOINT")

if [ "$HTTP_CODE" != "200" ]; then
  echo "CRITICAL: Discovery service returned HTTP $HTTP_CODE"
  exit 2
fi

RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" --connect-timeout 5 "$ENDPOINT")
echo "OK: Discovery service responding in ${RESPONSE_TIME}s"
exit 0
```

## Prometheus Metrics for Discovery

Create a custom exporter that publishes discovery metrics to Prometheus:

```python
#!/usr/bin/env python3
# talos_discovery_exporter.py

import subprocess
import json
import time
from prometheus_client import start_http_server, Gauge, Counter

# Metrics
discovered_members = Gauge(
    'talos_discovered_members_total',
    'Number of discovered cluster members',
    ['node']
)

discovery_errors = Counter(
    'talos_discovery_errors_total',
    'Number of discovery query errors',
    ['node']
)

discovery_query_duration = Gauge(
    'talos_discovery_query_duration_seconds',
    'Time taken to query discovery members',
    ['node']
)

NODES = ['10.0.0.10', '10.0.0.11', '10.0.0.12']

def collect():
    for node in NODES:
        start_time = time.time()
        try:
            result = subprocess.run(
                ['talosctl', 'get', 'discoveredmembers',
                 '--nodes', node, '-o', 'json'],
                capture_output=True, text=True, timeout=10
            )
            duration = time.time() - start_time
            discovery_query_duration.labels(node=node).set(duration)

            if result.returncode == 0:
                members = json.loads(result.stdout)
                discovered_members.labels(node=node).set(len(members))
            else:
                discovery_errors.labels(node=node).inc()
        except Exception:
            discovery_errors.labels(node=node).inc()

if __name__ == '__main__':
    start_http_server(9198)
    print("Discovery exporter listening on :9198")
    while True:
        collect()
        time.sleep(30)
```

## Alerting Rules

Set up Prometheus alerts for discovery issues:

```yaml
# discovery-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: talos-discovery-alerts
  namespace: monitoring
spec:
  groups:
    - name: talos-discovery
      rules:
        - alert: TalosDiscoveryMembersMissing
          expr: talos_discovered_members_total < (count(kube_node_info) - 1)
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Node {{ $labels.node }} is missing discovery members"
            description: "Expected {{ $value }} members but not all are discovered."

        - alert: TalosDiscoveryErrors
          expr: rate(talos_discovery_errors_total[5m]) > 0
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Discovery queries failing on {{ $labels.node }}"

        - alert: TalosDiscoverySlowQueries
          expr: talos_discovery_query_duration_seconds > 5
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Discovery queries are slow on {{ $labels.node }}"
```

## Grafana Dashboard

Visualize discovery health in Grafana:

```json
{
  "title": "Talos Discovery Health",
  "panels": [
    {
      "title": "Discovered Members per Node",
      "type": "timeseries",
      "targets": [
        {
          "expr": "talos_discovered_members_total",
          "legendFormat": "{{ node }}"
        }
      ]
    },
    {
      "title": "Discovery Query Duration",
      "type": "timeseries",
      "targets": [
        {
          "expr": "talos_discovery_query_duration_seconds",
          "legendFormat": "{{ node }}"
        }
      ]
    },
    {
      "title": "Discovery Errors Rate",
      "type": "stat",
      "targets": [
        {
          "expr": "sum(rate(talos_discovery_errors_total[5m]))",
          "legendFormat": "Errors/sec"
        }
      ]
    }
  ]
}
```

## Checking Discovery from Controller Logs

The Talos controller runtime logs provide detailed information about discovery operations:

```bash
# View discovery-related log entries
talosctl logs controller-runtime --nodes <node-ip> | grep -i discovery

# Filter for errors only
talosctl logs controller-runtime --nodes <node-ip> | grep -i "discovery.*error"

# Watch logs in real time
talosctl logs controller-runtime --nodes <node-ip> -f | grep -i discovery
```

Log messages to watch for:
- Registration successes and failures
- Member list updates
- Endpoint resolution issues
- TLS or authentication errors

## Integration with OneUptime

Send discovery health metrics to OneUptime for centralized monitoring:

```bash
#!/bin/bash
# Send discovery heartbeat to OneUptime

NODES=("10.0.0.10" "10.0.0.11" "10.0.0.12")
ALL_HEALTHY=true

for node in "${NODES[@]}"; do
  MEMBERS=$(talosctl get discoveredmembers --nodes "$node" -o json 2>/dev/null | jq 'length')
  if [ -z "$MEMBERS" ] || [ "$MEMBERS" -lt 2 ]; then
    ALL_HEALTHY=false
    break
  fi
done

if $ALL_HEALTHY; then
  curl -s "https://oneuptime.com/api/heartbeat/<monitor-id>" \
    -H "Content-Type: application/json" \
    -d '{"status": "up"}'
else
  curl -s "https://oneuptime.com/api/heartbeat/<monitor-id>" \
    -H "Content-Type: application/json" \
    -d '{"status": "down", "message": "Discovery issues detected"}'
fi
```

Monitoring discovery status is a small investment that pays off when things go wrong. Most discovery issues are transient (a brief network hiccup, a momentary DNS failure), but persistent issues need attention. By tracking the number of discovered members, the health of the discovery endpoint, and the controller logs, you can catch problems early and keep your Talos Linux cluster running smoothly.
