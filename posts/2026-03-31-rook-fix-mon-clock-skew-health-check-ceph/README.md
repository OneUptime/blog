# How to Fix MON_CLOCK_SKEW Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Monitor, NTP, Clock

Description: Learn how to resolve the MON_CLOCK_SKEW health warning in Ceph by synchronizing system clocks across all monitor nodes using NTP or chrony.

---

## Understanding MON_CLOCK_SKEW

Ceph monitors use timestamps to coordinate cluster state. When the clocks on monitor nodes diverge beyond the allowed threshold (default 0.05 seconds), Ceph raises `MON_CLOCK_SKEW`. Significant clock skew can cause Paxos consensus failures, preventing the cluster from accepting writes.

Check current health:

```bash
ceph health detail
```

Example output:

```text
HEALTH_WARN clock skew detected on mon.b
[WRN] MON_CLOCK_SKEW: clock skew detected on mon.b
    mon.b clock skew 1.34s > max 0.05s (latency 0.001s)
```

## Checking Clock Offsets

On each monitor node, check the current NTP sync status:

```bash
# Using chrony
chronyc tracking

# Using timedatectl
timedatectl status
```

Look for the `System time` (in chronyc) or `NTP synchronized` (in timedatectl) field. If the offset is large or NTP is not synchronized, the clock needs correction.

## Installing and Configuring chrony

If chrony is not installed on your monitor nodes:

```bash
apt install -y chrony     # Debian/Ubuntu
yum install -y chrony     # RHEL/CentOS
```

Configure chrony to use reliable NTP servers:

```bash
cat /etc/chrony/chrony.conf
```

A minimal working configuration:

```text
server 0.pool.ntp.org iburst
server 1.pool.ntp.org iburst
server 2.pool.ntp.org iburst
server 3.pool.ntp.org iburst
makestep 1.0 3
rtcsync
```

Restart and enable chrony:

```bash
systemctl enable --now chronyd
chronyc makestep
chronyc sources -v
```

## Fixing in Kubernetes / Rook

In Kubernetes, time synchronization is the responsibility of the underlying node OS - not the pod. Pods inherit the host's clock. Fix clock skew by synchronizing the host nodes:

```bash
# SSH to each node
ssh user@node1 "chronyc makestep && timedatectl status"
ssh user@node2 "chronyc makestep && timedatectl status"
ssh user@node3 "chronyc makestep && timedatectl status"
```

Verify that all nodes report `NTP synchronized: yes` and offsets are under 50ms.

## Adjusting the Clock Skew Tolerance

If your environment cannot achieve tight NTP sync (e.g., due to network latency), you can raise the tolerance threshold:

```bash
ceph config set mon mon_clock_drift_allowed 0.5
```

However, it is best to fix the underlying NTP issue rather than raise the tolerance.

## Verifying the Fix

After synchronizing clocks, recheck cluster health:

```bash
ceph health detail
```

You can also view clock offsets from the Ceph perspective:

```bash
ceph time-sync-status
```

Expected output after resolution:

```text
HEALTH_OK
```

## Monitoring Clock Skew Proactively

Add a Prometheus alert to detect clock drift before it affects the cluster:

```yaml
- alert: NodeClockSkew
  expr: abs(node_timex_offset_seconds) > 0.03
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Clock skew detected on {{ $labels.instance }}"
    description: "Offset is {{ $value }}s, which may affect Ceph monitor quorum."
```

## Summary

`MON_CLOCK_SKEW` occurs when Ceph monitors detect that node clocks are out of sync beyond the allowed threshold. Fix this by ensuring NTP or chrony is running and synchronized on all monitor nodes. In Rook/Kubernetes deployments, the fix must be applied at the Kubernetes node OS level. Monitor clock offsets with Prometheus to catch drift before it impacts cluster health.
