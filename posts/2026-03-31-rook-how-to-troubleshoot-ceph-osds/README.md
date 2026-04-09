# How to Troubleshoot Ceph OSDs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, OSD, Troubleshooting, Storage Recovery

Description: Diagnose and resolve common Ceph OSD issues including slow requests, full OSDs, flapping OSDs, and BlueStore errors using systematic troubleshooting techniques.

---

## OSD Health Overview

OSD problems are a common source of Ceph cluster issues. Start troubleshooting with an overall health check:

```bash
# Quick cluster status
ceph -s

# Detailed health messages
ceph health detail

# OSD status summary
ceph osd stat

# View all OSDs with their status and weight
ceph osd tree
```

## Finding Failed or Down OSDs

```bash
# List only down OSDs
ceph osd stat | grep down

# Get a list of down OSD IDs
ceph osd dump | grep "down "

# Check when an OSD was last seen
ceph osd info osd.<id>

# View the OSD failure log
ceph log last 100 cluster | grep osd
```

## Issue: OSD Slow Requests

Slow requests are the most common OSD complaint and appear as `HEALTH_WARN` messages:

```bash
# Check for slow request warnings
ceph health detail | grep "slow requests"

# Get slow request details from the OSD admin socket
ceph daemon osd.0 dump_historic_slow_ops
ceph daemon osd.0 dump_ops_in_flight

# Check OSD latency stats
ceph osd perf
```

Common causes of slow requests:

```text
Cause                      | Symptom                    | Fix
HDD overload               | High commit_latency_ms     | Reduce PG count per OSD
Network issues             | Op queue latency           | Check network interface
Scrubbing during peak I/O  | Spiky latency              | Schedule scrub windows
OOM / memory pressure      | Unpredictable latency      | Increase osd_memory_target
BlueStore compaction       | Periodic high latency      | Tune compaction settings
```

Investigate OSD CPU and I/O:

```bash
# On the OSD host, check disk I/O wait
iostat -x 1 10

# Check network
sar -n DEV 1 5

# Check CPU for OSD process
top -p $(pgrep -f "ceph-osd -i 0")
```

## Issue: OSD Flapping (Up/Down)

Flapping OSDs repeatedly go up and down:

```bash
# Check OSD flap history in cluster log
ceph log last 200 cluster | grep -E "osd\.[0-9]+ (down|up)"

# Check for network issues
ceph daemon osd.0 perf dump | grep -i ms
ceph config get osd osd_heartbeat_grace

# Network packet loss between OSD nodes
ping -c 100 <other-osd-node-ip> | tail -5
```

Adjust heartbeat settings for high-latency networks:

```bash
# Increase timeout before OSD is marked down (seconds)
ceph config set osd osd_heartbeat_grace 20
ceph config set osd osd_heartbeat_interval 6
```

## Issue: Full OSD / Pool Near Full

```bash
# Check capacity warnings
ceph health detail | grep -i full

# View OSD capacity usage
ceph osd df | sort -k6 -rn | head -20

# Set near-full ratio warnings
ceph config set global mon_osd_nearfull_ratio 0.75
ceph config set global mon_osd_full_ratio 0.85
```

If an OSD or pool is full and blocking writes:

```bash
# Check which pools are affected
ceph df detail | grep -E "(FULL|NEAR_FULL)"

# Temporary fix: set pool to allow overage (DANGEROUS)
ceph osd set-full-ratio 0.97  # Last resort only

# Proper fix: expand cluster or delete data
```

## Issue: BlueStore Errors

BlueStore errors appear in OSD logs and health messages:

```bash
# Check for BlueStore health warnings
ceph health detail | grep -i bluestore

# View OSD-specific BlueStore errors
ceph daemon osd.0 perf dump | grep bluestore_state

# Run BlueStore integrity check
ceph osd deep-scrub osd.<id>
```

Common BlueStore errors:

```bash
# Fix metadata inconsistencies (force repair)
ceph-bluestore-tool repair --path /var/lib/ceph/osd/ceph-0

# Check BlueStore metadata
ceph daemon osd.0 dump_mempools
```

## Issue: OSD Won't Start After Failure

```bash
# Check OSD journal for startup errors
journalctl -u ceph-osd@0 --since "1 hour ago" | tail -50

# Try starting manually for verbose output
ceph-osd -i 0 --foreground 2>&1 | tail -50

# Check disk health
smartctl -a /dev/sda
dmesg | grep -E "error|failed|reset" | grep -i sda | tail -20
```

## Issue: Inconsistent PGs

After scrubbing, inconsistent PGs indicate data corruption:

```bash
# Find inconsistent PGs
ceph health detail | grep inconsistent

# List inconsistent objects in a PG
rados list-inconsistent-obj <pgid>

# Trigger repair
ceph pg repair <pgid>

# For deep scrub (more thorough)
ceph osd deep-scrub osd.<id>
```

## Investigating OSD Crashes

```bash
# Check for recent OSD crashes
ceph crash ls

# View crash details
ceph crash info <crash-id>

# Archive crash (acknowledge it)
ceph crash archive <crash-id>

# View crash logs directly
ls /var/lib/ceph/crash/
```

## OSD Troubleshooting in Rook/Kubernetes

```bash
# Get all OSD pods
kubectl -n rook-ceph get pods -l app=rook-ceph-osd

# View logs for a specific OSD
kubectl -n rook-ceph logs rook-ceph-osd-0-<pod-id> --tail=100

# Increase log verbosity via toolbox
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell osd.0 injectargs --debug-osd 10

# Describe OSD pod for Kubernetes-level events
kubectl -n rook-ceph describe pod rook-ceph-osd-0-<pod-id>
```

## Comprehensive OSD Diagnostic Script

```bash
#!/bin/bash
echo "=== OSD Status ==="
ceph osd stat

echo "=== Down OSDs ==="
ceph osd tree | grep down

echo "=== OSD Capacity ==="
ceph osd df | sort -k6 -rn | head -10

echo "=== Slow Request Count ==="
ceph health detail | grep "slow request"

echo "=== Recent OSD Events ==="
ceph log last 50 cluster | grep osd

echo "=== Crashes ==="
ceph crash ls
```

## Summary

Ceph OSD troubleshooting begins with `ceph health detail` and `ceph osd stat` to identify down or degraded OSDs. Slow requests are investigated via `ceph daemon osd.<id> dump_ops_in_flight` and `ceph osd perf`. OSD flapping typically indicates network issues and can be addressed by tuning heartbeat grace periods. Full OSDs require either capacity expansion or data deletion. BlueStore errors and inconsistent PGs are repaired with `ceph pg repair` or `ceph-bluestore-tool repair`. In Rook, access OSD logs via `kubectl logs` and manage OSDs through the toolbox pod.
