# How to Monitor Network Health Between Ceph Nodes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Monitoring, Networking, Operation, Observability

Description: Monitor network health between Ceph nodes using latency checks, bandwidth tests, packet loss detection, and Prometheus metrics to proactively identify connectivity issues.

---

## Why Network Monitoring is Critical for Ceph

Ceph is highly sensitive to network quality. Even 0.1% packet loss between OSD nodes can cause:
- Increased OSD heartbeat timeouts
- Spurious OSD down/out events
- Recovery operations that complete slowly
- Client I/O latency spikes

Proactive network monitoring catches degradation before it impacts cluster health.

## Baseline Measurements

Establish baseline metrics before problems occur:

```bash
# Measure round-trip latency between OSD nodes
for node in osd-node2 osd-node3 mon-node1; do
  echo -n "Latency to $node: "
  ping -c 100 -q $node | tail -1
done

# Measure bandwidth between nodes
iperf3 -s -D  # Start server
iperf3 -c osd-node2 -P 4 -t 30 -J | python3 -c "
import json,sys
data = json.load(sys.stdin)
bps = data['end']['sum_received']['bits_per_second']
print(f'Bandwidth: {bps/1e9:.2f} Gbps')
"
```

## Continuous Latency Monitoring

Deploy a simple latency monitoring script:

```bash
#!/bin/bash
# /usr/local/bin/ceph-net-monitor.sh

OSD_NODES=(192.168.10.1 192.168.10.2 192.168.10.3)
LOG="/var/log/ceph-network-health.log"
THRESHOLD_MS=2  # Alert if average latency exceeds 2ms

for node in "${OSD_NODES[@]}"; do
  RESULT=$(ping -c 20 -q $node 2>/dev/null | tail -1)
  AVG=$(echo $RESULT | awk -F'/' '{print $5}')
  MDEV=$(echo $RESULT | awk -F'/' '{print $7}' | tr -d ' ms')

  LOSS=$(ping -c 20 -q $node 2>/dev/null | grep "packet loss" | awk '{print $6}' | tr -d '%')

  echo "$(date +%s) $node latency_avg=$AVG mdev=$MDEV loss=$LOSS" >> $LOG

  if (( $(echo "$AVG > $THRESHOLD_MS" | bc -l 2>/dev/null) )); then
    echo "ALERT: High latency to $node: ${AVG}ms (threshold ${THRESHOLD_MS}ms)"
  fi

  if [ "$LOSS" != "0" ]; then
    echo "ALERT: Packet loss to $node: ${LOSS}%"
  fi
done
```

Schedule every 5 minutes:

```bash
echo "*/5 * * * * root /usr/local/bin/ceph-net-monitor.sh" > /etc/cron.d/ceph-net-health
```

## Using Ceph's Built-in Network Diagnostics

Ceph reports network health through its daemon interfaces:

```bash
# Check OSD messenger performance
ceph daemon osd.0 perf dump | python3 -m json.tool | grep -E "msgr|bytes|time"

# View OSD connection map
ceph daemon osd.0 dump_osd_network 2>/dev/null

# Check for OSD heartbeat failures (indicates network issues)
ceph health detail | grep -i "slow heartbeat"
ceph health detail | grep -i "osd.*down"

# View recent OSD down/up events
ceph log last 100 | grep -E "osd\.[0-9]+ (down|up)"
```

## Prometheus Node Exporter Network Metrics

Enable Prometheus node exporter for network-level metrics:

```bash
# Key Prometheus metrics for Ceph network health
# node_network_transmit_bytes_total
# node_network_receive_bytes_total
# node_network_transmit_drop_total - Drops indicate oversubscription
# node_network_transmit_errs_total - Errors indicate hardware issues
# node_network_carrier_changes_total - Carrier changes = cable/port flap
```

Prometheus alert rules for network health:

```yaml
groups:
- name: ceph-network-health
  rules:
  - alert: CephNodeNetworkDrops
    expr: rate(node_network_transmit_drop_total{job="node",device=~"eth.*"}[5m]) > 10
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Network drops on {{ $labels.instance }} ({{ $labels.device }})"
      description: "{{ $value }} drops/sec - possible network saturation"

  - alert: CephNodeNetworkErrors
    expr: rate(node_network_transmit_errs_total{job="node"}[5m]) > 0
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "Network errors on {{ $labels.instance }}"

  - alert: CephInterfaceDown
    expr: node_network_up{device=~"eth.*"} == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Network interface down: {{ $labels.instance }} {{ $labels.device }}"
```

## Blackbox Exporter for Active Probing

Use Prometheus blackbox exporter to actively probe connectivity:

```yaml
# blackbox.yml
modules:
  ceph_tcp:
    prober: tcp
    timeout: 5s
    tcp:
      preferred_ip_protocol: ip4

# prometheus.yml scrape config
- job_name: 'ceph-connectivity'
  metrics_path: /probe
  params:
    module: [ceph_tcp]
  static_configs:
  - targets:
    - osd-node1:6800
    - osd-node2:6800
    - mon-node1:6789
  relabel_configs:
  - source_labels: [__address__]
    target_label: __param_target
  - target_label: __address__
    replacement: blackbox-exporter:9115
```

## Detecting MTU Issues

Check for MTU-related drops and fragmentation:

```bash
# Watch for fragmentation
netstat -s | grep -E "fragment|reassemb"

# Check interface stats for drops
ip -s link show eth1 | grep -A2 RX | grep -v TX

# Test specific MTU paths
for size in 1472 4000 8972; do
  result=$(ping -M do -s $size -c 3 -W 2 192.168.10.2 2>&1)
  if echo "$result" | grep -q "3 received"; then
    echo "MTU $((size + 28)): OK"
  else
    echo "MTU $((size + 28)): FAILED"
  fi
done
```

## Summary

Proactive Ceph network health monitoring requires three layers: active latency probing between all OSD pairs (catching degradation before Ceph does), Prometheus metrics tracking packet drops and interface errors, and Ceph's own heartbeat health reports as a secondary indicator. Establishing baselines for latency (typically under 1ms for intra-rack, under 5ms for cross-rack) and bandwidth (90%+ of wire speed) gives concrete thresholds for alerting. Catching a 0.1% packet loss or 5ms latency spike early prevents cascading OSD down events and unexpected recovery operations.
