# How to Troubleshoot Rook-Ceph Network Latency Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Latency, Networking, Performance, Troubleshooting, Kubernetes

Description: Identify and resolve high network latency affecting Rook-Ceph performance, covering OSD apply/commit latency, slow OPS, and network path optimization.

---

## Overview

Network latency directly impacts Ceph I/O performance. Even milliseconds of additional latency between OSDs and monitors can cause slow operations and reduce throughput. This guide covers diagnosing latency sources and applying fixes.

## Step 1: Identify Latency Symptoms

Check for slow operations:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph health detail | grep -i slow
```

Check operation latency statistics:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd perf
```

Look for high `apply_latency_ms` or `commit_latency_ms` values (over 20ms indicates a problem).

## Step 2: Measure Raw Network Latency

Test latency between Ceph pods using ping:

```bash
# From tools pod to OSD pods
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ping -c 100 <osd-pod-ip> | tail -5
```

Use `iperf3` for bandwidth and latency testing:

```bash
# Start server on one OSD pod
kubectl -n rook-ceph exec -it <osd-pod-1> -- \
  iperf3 -s -D

# Test from another pod
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  iperf3 -c <osd-pod-1-ip> -t 30 --bidir
```

## Step 3: Check for Network Congestion

Monitor network interface statistics on nodes:

```bash
kubectl -n rook-ceph debug node/worker-1 -it --image=busybox -- \
  chroot /host sar -n DEV 5 10

kubectl -n rook-ceph debug node/worker-1 -it --image=busybox -- \
  chroot /host netstat -s | grep -E "retransmit|error"
```

Check for packet drops or errors:

```bash
kubectl -n rook-ceph debug node/worker-1 -it --image=busybox -- \
  chroot /host ip -s link show eth0
```

## Step 4: Investigate NIC Interrupt Affinity

CPU interrupt handling can affect latency. Check and configure NIC interrupts:

```bash
kubectl -n rook-ceph debug node/worker-1 -it --image=busybox -- \
  chroot /host cat /proc/interrupts | grep eth0
```

Set interrupt affinity for storage NICs:

```bash
kubectl -n rook-ceph debug node/worker-1 -it --image=busybox -- \
  chroot /host systemctl start irqbalance
```

## Step 5: Check and Tune TCP Settings

Review TCP settings that affect Ceph latency:

```bash
kubectl -n rook-ceph debug node/worker-1 -it --image=busybox -- \
  chroot /host sysctl net.ipv4.tcp_congestion_control
kubectl -n rook-ceph debug node/worker-1 -it --image=busybox -- \
  chroot /host sysctl net.core.rmem_max
```

Optimize for Ceph workloads:

```bash
# In /etc/sysctl.d/90-ceph-network.conf
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.ipv4.tcp_rmem = 4096 87380 134217728
net.ipv4.tcp_wmem = 4096 65536 134217728
net.ipv4.tcp_congestion_control = bbr
```

```bash
kubectl -n rook-ceph debug node/worker-1 -it --image=busybox -- \
  chroot /host sysctl -p /etc/sysctl.d/90-ceph-network.conf
```

## Step 6: Use Dedicated Network Interfaces

Separate Ceph cluster and public traffic with Multus:

```yaml
spec:
  network:
    provider: multus
    selectors:
      public: rook-ceph/ceph-public
      cluster: rook-ceph/ceph-cluster
```

## Monitoring Latency with Prometheus

Create a latency alert:

```yaml
groups:
- name: ceph-latency
  rules:
  - alert: CephHighOSDLatency
    expr: ceph_osd_apply_latency_ms > 50
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "OSD apply latency exceeds 50ms"
```

## Summary

Rook-Ceph network latency issues stem from network congestion, CPU interrupt misalignment, suboptimal TCP settings, or shared network interfaces. Start with `ceph osd perf` to identify high-latency OSDs, then measure raw network latency with ping and iperf3, and apply TCP tuning and dedicated network interfaces to resolve the root cause.
