# How to Monitor KubeSpan Peer Status in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, KubeSpan, Monitoring, WireGuard, Observability

Description: Learn how to monitor KubeSpan peer status in Talos Linux to track mesh network health, detect connectivity issues, and maintain cluster reliability.

---

When you run a Talos Linux cluster with KubeSpan enabled, monitoring the health of the WireGuard mesh is essential. A down peer means potential pod communication failures, and catching issues early can prevent application downtime. This guide covers all the ways you can monitor KubeSpan peer status, from simple manual checks to automated monitoring pipelines.

## Understanding KubeSpan Resources

Before setting up monitoring, you need to understand the resources that KubeSpan exposes. Talos manages KubeSpan through several internal resources that you can query with `talosctl`:

```bash
# KubeSpan Identity - the node's own WireGuard identity
talosctl get kubespanidentity --nodes <node-ip>

# KubeSpan Peer Status - the status of each peer connection
talosctl get kubespanpeerstatus --nodes <node-ip>

# KubeSpan Peer Spec - the configuration for each peer
talosctl get kubespanpeerspec --nodes <node-ip>

# KubeSpan Endpoint - endpoints known for the node
talosctl get kubespanendpoint --nodes <node-ip>
```

The most important one for monitoring is `kubespanpeerstatus`, which tells you the state of each peer connection.

## Checking Peer Status Manually

The quickest way to check the health of your KubeSpan mesh is to query the peer status:

```bash
# Get a quick overview of all peers
talosctl get kubespanpeerstatus --nodes <node-ip>
```

The output looks something like this:

```text
NODE           NAMESPACE   TYPE                 ID        VERSION   LABEL       ENDPOINT              STATE
192.168.1.10   network     KubeSpanPeerStatus   <id-1>    3         cp-2        192.168.1.11:51820    up
192.168.1.10   network     KubeSpanPeerStatus   <id-2>    5         worker-1    192.168.1.20:51820    up
192.168.1.10   network     KubeSpanPeerStatus   <id-3>    2         worker-2    192.168.1.21:51820    up
```

For detailed information about a specific peer:

```bash
# Get detailed peer status in YAML format
talosctl get kubespanpeerstatus --nodes <node-ip> -o yaml
```

This shows additional details like the last handshake time, received and transmitted bytes, and the allowed IPs for the peer.

## Real-Time Monitoring with Watch

You can watch peer status changes in real time:

```bash
# Watch for any state changes
talosctl get kubespanpeerstatus --nodes <node-ip> --watch
```

This is useful during maintenance or when troubleshooting. You will see updates whenever a peer's state changes, a new peer is added, or a peer is removed.

## Building a Monitoring Script

For regular health checks, create a script that queries all nodes and reports the overall mesh health:

```bash
#!/bin/bash
# kubespan-health-check.sh
# Check KubeSpan mesh health across all nodes

# List of all node IPs
NODES=("192.168.1.10" "192.168.1.11" "192.168.1.20" "192.168.1.21")

TOTAL_PEERS=0
UP_PEERS=0
DOWN_PEERS=0

for node in "${NODES[@]}"; do
  echo "=== Node: $node ==="

  # Get peer status in JSON format
  STATUS=$(talosctl get kubespanpeerstatus --nodes "$node" -o json 2>/dev/null)

  if [ $? -ne 0 ]; then
    echo "  ERROR: Cannot reach node $node"
    continue
  fi

  # Parse peer states
  while IFS= read -r peer; do
    label=$(echo "$peer" | jq -r '.spec.label')
    state=$(echo "$peer" | jq -r '.spec.state')
    endpoint=$(echo "$peer" | jq -r '.spec.endpoint')

    TOTAL_PEERS=$((TOTAL_PEERS + 1))

    if [ "$state" = "up" ]; then
      UP_PEERS=$((UP_PEERS + 1))
      echo "  OK: $label ($endpoint) - $state"
    else
      DOWN_PEERS=$((DOWN_PEERS + 1))
      echo "  WARN: $label ($endpoint) - $state"
    fi
  done < <(echo "$STATUS" | jq -c '.[]')

  echo ""
done

echo "=== Summary ==="
echo "Total peer connections: $TOTAL_PEERS"
echo "Up: $UP_PEERS"
echo "Down: $DOWN_PEERS"

if [ $DOWN_PEERS -gt 0 ]; then
  echo "STATUS: DEGRADED"
  exit 1
else
  echo "STATUS: HEALTHY"
  exit 0
fi
```

Make it executable and run it:

```bash
chmod +x kubespan-health-check.sh
./kubespan-health-check.sh
```

## Tracking Bandwidth and Traffic

KubeSpan peer status includes traffic statistics that you can use to track bandwidth usage:

```bash
#!/bin/bash
# kubespan-traffic.sh
# Track KubeSpan traffic statistics

NODE="192.168.1.10"

talosctl get kubespanpeerstatus --nodes "$NODE" -o json | \
  jq -r '.[] | [.spec.label, .spec.state, (.spec.receiveBytes // 0 | tostring) + " bytes rx", (.spec.transmitBytes // 0 | tostring) + " bytes tx"] | @tsv'
```

To track traffic over time, you can sample at intervals and calculate the difference:

```bash
#!/bin/bash
# kubespan-bandwidth.sh
# Measure KubeSpan bandwidth over a time interval

NODE="192.168.1.10"
INTERVAL=60  # seconds

echo "Measuring KubeSpan bandwidth over ${INTERVAL}s..."

# First sample
SAMPLE1=$(talosctl get kubespanpeerstatus --nodes "$NODE" -o json)

sleep $INTERVAL

# Second sample
SAMPLE2=$(talosctl get kubespanpeerstatus --nodes "$NODE" -o json)

# Calculate difference for each peer
echo "$SAMPLE2" | jq -c '.[]' | while IFS= read -r peer; do
  id=$(echo "$peer" | jq -r '.metadata.id')
  label=$(echo "$peer" | jq -r '.spec.label')
  rx2=$(echo "$peer" | jq -r '.spec.receiveBytes // 0')
  tx2=$(echo "$peer" | jq -r '.spec.transmitBytes // 0')

  rx1=$(echo "$SAMPLE1" | jq -r ".[] | select(.metadata.id == \"$id\") | .spec.receiveBytes // 0")
  tx1=$(echo "$SAMPLE1" | jq -r ".[] | select(.metadata.id == \"$id\") | .spec.transmitBytes // 0")

  rx_rate=$(( (rx2 - rx1) / INTERVAL ))
  tx_rate=$(( (tx2 - tx1) / INTERVAL ))

  echo "Peer: $label - RX: ${rx_rate} B/s, TX: ${tx_rate} B/s"
done
```

## Integrating with Prometheus

For production monitoring, export KubeSpan metrics to Prometheus. You can create a custom exporter that scrapes `talosctl` output:

```python
#!/usr/bin/env python3
# kubespan_exporter.py
# Prometheus exporter for KubeSpan peer status

import subprocess
import json
import time
from prometheus_client import start_http_server, Gauge, Enum

# Define metrics
peer_state = Enum(
    'kubespan_peer_state',
    'State of KubeSpan peer connection',
    ['node', 'peer_label'],
    states=['up', 'down', 'unknown']
)

peer_rx_bytes = Gauge(
    'kubespan_peer_receive_bytes_total',
    'Total bytes received from KubeSpan peer',
    ['node', 'peer_label']
)

peer_tx_bytes = Gauge(
    'kubespan_peer_transmit_bytes_total',
    'Total bytes transmitted to KubeSpan peer',
    ['node', 'peer_label']
)

NODES = ['192.168.1.10', '192.168.1.11', '192.168.1.20']

def collect_metrics():
    for node in NODES:
        try:
            result = subprocess.run(
                ['talosctl', 'get', 'kubespanpeerstatus', '--nodes', node, '-o', 'json'],
                capture_output=True, text=True, timeout=10
            )
            peers = json.loads(result.stdout)
            for peer in peers:
                label = peer['spec'].get('label', 'unknown')
                state = peer['spec'].get('state', 'unknown')
                rx = peer['spec'].get('receiveBytes', 0)
                tx = peer['spec'].get('transmitBytes', 0)

                peer_state.labels(node=node, peer_label=label).state(state)
                peer_rx_bytes.labels(node=node, peer_label=label).set(rx)
                peer_tx_bytes.labels(node=node, peer_label=label).set(tx)
        except Exception as e:
            print(f"Error collecting from {node}: {e}")

if __name__ == '__main__':
    start_http_server(9199)
    while True:
        collect_metrics()
        time.sleep(30)
```

## Setting Up Alerts

Once you have metrics in Prometheus, set up alerts for peer failures:

```yaml
# kubespan-alerts.yaml
# Prometheus alerting rules for KubeSpan
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: kubespan-alerts
  namespace: monitoring
spec:
  groups:
    - name: kubespan
      rules:
        - alert: KubeSpanPeerDown
          expr: kubespan_peer_state{kubespan_peer_state="down"} == 1
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "KubeSpan peer {{ $labels.peer_label }} is down on {{ $labels.node }}"
            description: "The KubeSpan connection to peer {{ $labels.peer_label }} has been down for more than 5 minutes."

        - alert: KubeSpanNoTraffic
          expr: rate(kubespan_peer_receive_bytes_total[5m]) == 0 and kubespan_peer_state{kubespan_peer_state="up"} == 1
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "No traffic on KubeSpan peer {{ $labels.peer_label }}"
            description: "KubeSpan peer {{ $labels.peer_label }} shows as up but has no receive traffic for 10 minutes."
```

## Grafana Dashboard

Create a Grafana dashboard to visualize the KubeSpan mesh:

```json
{
  "panels": [
    {
      "title": "KubeSpan Peer States",
      "type": "stat",
      "targets": [
        {
          "expr": "count(kubespan_peer_state{kubespan_peer_state='up'}) or vector(0)",
          "legendFormat": "Up"
        },
        {
          "expr": "count(kubespan_peer_state{kubespan_peer_state='down'}) or vector(0)",
          "legendFormat": "Down"
        }
      ]
    },
    {
      "title": "KubeSpan Bandwidth per Peer",
      "type": "graph",
      "targets": [
        {
          "expr": "rate(kubespan_peer_receive_bytes_total[5m])",
          "legendFormat": "{{ peer_label }} RX"
        },
        {
          "expr": "rate(kubespan_peer_transmit_bytes_total[5m])",
          "legendFormat": "{{ peer_label }} TX"
        }
      ]
    }
  ]
}
```

## Using OneUptime for KubeSpan Monitoring

For a managed monitoring solution, you can send KubeSpan health checks to OneUptime. Create an API-based monitor that runs your health check script and reports the status:

```bash
#!/bin/bash
# Report KubeSpan health to OneUptime
# Run this as a CronJob in your cluster

STATUS="up"
MESSAGE=""

for node in 192.168.1.10 192.168.1.11 192.168.1.20; do
  DOWN_PEERS=$(talosctl get kubespanpeerstatus --nodes "$node" -o json | \
    jq '[.[] | select(.spec.state != "up")] | length')

  if [ "$DOWN_PEERS" -gt 0 ]; then
    STATUS="down"
    MESSAGE="$MESSAGE Node $node has $DOWN_PEERS down peers."
  fi
done

# Send heartbeat to OneUptime
curl -X POST "https://oneuptime.com/api/heartbeat/<your-monitor-id>" \
  -H "Content-Type: application/json" \
  -d "{\"status\": \"$STATUS\", \"message\": \"$MESSAGE\"}"
```

Monitoring KubeSpan is not just about knowing when things break. By tracking traffic patterns, peer states, and connection stability over time, you build an understanding of your cluster's network behavior that helps you plan capacity, detect anomalies, and respond to issues before they affect your users. Start with basic manual checks, graduate to scripted health checks, and eventually build a full monitoring pipeline with alerting.
