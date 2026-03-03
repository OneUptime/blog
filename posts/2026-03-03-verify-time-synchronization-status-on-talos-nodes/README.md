# How to Verify Time Synchronization Status on Talos Nodes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Time Synchronization, NTP, Monitoring, Kubernetes, Infrastructure

Description: A practical guide to verifying and monitoring time synchronization status across all nodes in a Talos Linux Kubernetes cluster.

---

Verifying that time synchronization is working correctly across your Talos Linux cluster is not something you do once and forget about. It should be part of your regular operational checks and monitoring setup. A node with bad time can silently corrupt your logs, break TLS connections, and cause scheduling chaos. This post covers every method available for checking time sync status on Talos nodes.

## Quick Health Check

The fastest way to verify time sync is the `time` command in talosctl:

```bash
# Check time on a single node
talosctl -n 192.168.1.10 time

# Check time on multiple nodes simultaneously
talosctl -n 192.168.1.10,192.168.1.11,192.168.1.12,192.168.1.20,192.168.1.21 time
```

This command returns the current time as reported by each node. Compare the values - they should be within a few milliseconds of each other. If you see a difference of more than a second, something is wrong.

## Detailed Time Status Resource

For more detailed information, query the `timestatus` resource:

```bash
# Get time status in human-readable format
talosctl -n 192.168.1.10 get timestatus

# Get full details in YAML
talosctl -n 192.168.1.10 get timestatus -o yaml
```

The YAML output provides rich information:

```yaml
node: 192.168.1.10
metadata:
  namespace: runtime
  type: TimeStatuses.runtime.talos.dev
  id: node
spec:
  synced: true
  epoch: 1709500800
  syncDisabled: false
```

The key field here is `synced`. When it reads `true`, the node has successfully synchronized its clock with an NTP source. A `false` value means synchronization has not completed or has failed.

## Checking the Configured Time Servers

To see which NTP servers a node is configured to use:

```bash
# View time server configuration
talosctl -n 192.168.1.10 get timeserverconfig -o yaml
```

The output shows the list of configured NTP servers:

```yaml
spec:
  timeServers:
    - time.cloudflare.com
    - time1.google.com
    - time2.google.com
```

Cross-reference this with your intended configuration to make sure the right servers are in place.

## Inspecting the Time Service Logs

The time daemon logs provide the most detailed picture of synchronization activity:

```bash
# View recent time service logs
talosctl -n 192.168.1.10 logs timed

# Follow logs in real time
talosctl -n 192.168.1.10 logs timed -f
```

Healthy synchronization logs look something like this:

```
timed: synced to time.cloudflare.com, offset: +0.002341s
timed: adjusted clock by 0.002341 seconds
```

Warning signs in the logs include:

```
timed: failed to query time.cloudflare.com: i/o timeout
timed: no reachable time servers
timed: clock offset too large: 3600.001s
```

## Comparing Time Across Nodes

One of the most useful checks is comparing the time reported by different nodes:

```bash
#!/bin/bash
# compare-time.sh - Compare time across all cluster nodes

NODES="192.168.1.10 192.168.1.11 192.168.1.12 192.168.1.20 192.168.1.21"

echo "Node Time Comparison:"
echo "===================="

for node in $NODES; do
  time_output=$(talosctl -n "$node" time 2>/dev/null)
  echo "$node: $time_output"
done

echo ""
echo "Time Sync Status:"
echo "=================="

for node in $NODES; do
  status=$(talosctl -n "$node" get timestatus -o yaml 2>/dev/null)
  synced=$(echo "$status" | grep "synced:" | awk '{print $2}')
  echo "$node: synced=$synced"
done
```

Run this script periodically or after any cluster changes to verify consistency.

## Checking Time During Cluster Bootstrap

Time sync is especially critical during cluster bootstrap. If the initial control plane node has bad time, certificates generated during bootstrap may have incorrect validity periods. Check time sync status as part of your bootstrap verification:

```bash
# After bootstrapping the first control plane node
talosctl -n 192.168.1.10 get timestatus
talosctl -n 192.168.1.10 time

# Verify time is reasonable
date -u  # Compare with your local time

# Check service health (time issues affect many services)
talosctl -n 192.168.1.10 services
```

## Monitoring Time Sync in Production

For ongoing monitoring, you have several options:

### Option 1: Periodic Script Checks

Set up a cron job on a monitoring server that checks time sync status:

```bash
#!/bin/bash
# time-monitor.sh - Run via cron every 5 minutes

NODES="192.168.1.10 192.168.1.11 192.168.1.12 192.168.1.20 192.168.1.21"
ALERT_THRESHOLD=5  # seconds

for node in $NODES; do
  # Check sync status
  synced=$(talosctl -n "$node" get timestatus -o yaml 2>/dev/null | \
    grep "synced:" | awk '{print $2}')

  if [ "$synced" != "true" ]; then
    echo "CRITICAL: Node $node is not time-synced" | \
      mail -s "Time Sync Alert" ops@company.com
  fi
done
```

### Option 2: Kubernetes-Based Monitoring

Deploy a monitoring stack that tracks time-related metrics:

```yaml
# Prometheus alert rule for time sync
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: time-sync-alerts
  namespace: monitoring
spec:
  groups:
    - name: time-sync
      rules:
        - alert: NodeClockNotSynchronising
          expr: min_over_time(node_timex_sync_status[5m]) == 0
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Clock not synchronising on {{ $labels.instance }}"
        - alert: NodeClockSkewDetected
          expr: abs(node_timex_offset_seconds) > 0.05
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Clock skew detected on {{ $labels.instance }}"
```

### Option 3: Talos Resource Watchers

Use the watch feature to get real-time updates on time status changes:

```bash
# Watch for time status changes across nodes
talosctl -n 192.168.1.10 get timestatus --watch

# This will output a line every time the status changes
# Useful for feeding into a log aggregation system
```

## Verifying After Specific Events

Certain events should trigger a time sync verification:

### After Node Reboot

```bash
# After a node comes back from reboot
talosctl -n 192.168.1.10 get timestatus
talosctl -n 192.168.1.10 logs timed | tail -20
```

### After Upgrade

```bash
# After upgrading Talos on a node
talosctl -n 192.168.1.10 get timestatus
talosctl -n 192.168.1.10 service timed
```

### After Network Changes

```bash
# After firewall or network changes
for node in 192.168.1.10 192.168.1.11 192.168.1.12; do
  echo "Checking $node..."
  talosctl -n "$node" get timestatus
  talosctl -n "$node" logs timed | tail -5
done
```

### After NTP Configuration Changes

```bash
# After changing NTP servers
talosctl -n 192.168.1.10 get timeserverconfig -o yaml
talosctl -n 192.168.1.10 get timestatus
talosctl -n 192.168.1.10 logs timed | tail -20
```

## Understanding Time Sync Behavior

Talos handles time synchronization differently depending on the offset:

- **Small offsets (under 128ms)**: The clock is gradually adjusted (slewed) to avoid sudden time jumps. This is transparent to running applications.

- **Medium offsets (128ms to several seconds)**: The clock may be stepped (jumped) to the correct time. This can briefly affect applications that are sensitive to time monotonicity.

- **Large offsets (many seconds or more)**: The clock is stepped immediately. This typically only happens on first boot or after extended downtime.

```bash
# Check for time step events in logs
talosctl -n 192.168.1.10 logs timed | grep -i "step\|jump\|adjust"
```

## Building a Verification Checklist

Here is a checklist you can use for time sync verification:

```bash
#!/bin/bash
# time-verification-checklist.sh

NODE=$1

echo "Time Sync Verification for $NODE"
echo "================================="

echo ""
echo "1. Current time:"
talosctl -n "$NODE" time

echo ""
echo "2. Sync status:"
talosctl -n "$NODE" get timestatus

echo ""
echo "3. Configured servers:"
talosctl -n "$NODE" get timeserverconfig -o yaml

echo ""
echo "4. Time service health:"
talosctl -n "$NODE" service timed

echo ""
echo "5. Recent time service logs:"
talosctl -n "$NODE" logs timed | tail -10

echo ""
echo "6. Overall service health:"
talosctl -n "$NODE" services
```

Run this as `./time-verification-checklist.sh 192.168.1.10` to get a complete picture of time sync on any node.

## Summary

Verifying time synchronization is a fundamental operational practice for any distributed system. Talos Linux provides multiple ways to check time sync status - from quick one-liners to detailed resource queries and log analysis. Make time verification part of your routine checks, automate it where possible, and always check after cluster changes. The few minutes you spend verifying time sync can save you hours of debugging mysterious failures down the road.
