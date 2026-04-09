# How to Handle Clock Drift Issues After Network Outage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Clock Drift, NTP, Monitor, Storage

Description: Learn how to resolve Ceph clock drift issues that arise after network outages, restore NTP synchronization, and prevent monitor health warnings from clock skew.

---

## Why Clock Drift Affects Ceph

Ceph monitors require clock synchronization to maintain quorum and consensus. If clocks drift beyond the `mon_clock_drift_allowed` threshold (default 0.05 seconds), the cluster reports health warnings. After a network outage, NTP servers may be unreachable, allowing clocks to drift significantly.

## Detecting Clock Drift Health Warnings

Check for clock drift warnings:

```bash
ceph health detail
```

Example output:

```text
HEALTH_WARN clock skew detected on mon.b, mon.c
MON_CLOCK_SKEW clock skew detected on mon.b
    mon.b clock skew 0.156s > max 0.05s
```

Check monitor clock skew details:

```bash
ceph mon stat
ceph health detail | grep clock
```

## Step 1: Verify NTP Service Status

On each affected monitor node:

```bash
# systemd-timesyncd
systemctl status systemd-timesyncd
timedatectl show

# chrony
chronyc tracking
chronyc sources -v

# ntpd
ntpq -p
```

## Step 2: Restart NTP Synchronization

If NTP servers are reachable after the outage but the service needs a push:

```bash
# Force chrony to synchronize immediately
chronyc makestep

# For systemd-timesyncd
systemctl restart systemd-timesyncd

# For ntpd
systemctl restart ntpd
```

## Step 3: Verify Clocks Are Synchronized

Check that all monitor nodes are within the allowed drift:

```bash
# On each monitor node
date && timedatectl

# Use chronyc to check sync status
chronyc tracking | grep "System time"
```

Target: system time offset should be less than 50ms (0.05 seconds).

## Step 4: Allow Ceph to Resolve Health Warning

After NTP synchronization is restored, Ceph health warnings resolve automatically within a few minutes:

```bash
watch -n 5 ceph health detail
```

## Adjusting the Clock Drift Threshold

If your environment cannot achieve tight clock synchronization, you can increase the allowed drift:

```bash
ceph config set mon mon_clock_drift_allowed 0.1
```

Verify the change:

```bash
ceph config get mon mon_clock_drift_allowed
```

## Configuring Chrony for Ceph Environments

A good chrony configuration for Ceph monitor nodes:

```ini
# /etc/chrony.conf
server time.cloudflare.com iburst
server ntp.ubuntu.com iburst

# Allow NTP to step the clock if offset is large
makestep 1.0 3

# Use local hardware clock as fallback
local stratum 10
```

Apply and restart:

```bash
systemctl restart chronyd
chronyc makestep
```

## Rook Environments and Clock Drift

In Rook, monitor pods run in Kubernetes. Clock synchronization is typically handled by the underlying node's NTP configuration. Check node time:

```bash
kubectl get nodes -o wide
kubectl debug node/<node-name> -it --image=busybox -- date
```

Force chrony sync on the host node:

```bash
ssh <node-name> 'chronyc makestep && chronyc tracking'
```

## Summary

Clock drift after network outages occurs when NTP servers become temporarily unreachable. Resolving it requires restarting and verifying NTP synchronization on each monitor node. Once clocks are within the 50ms threshold, Ceph health warnings clear automatically. Configuring chrony with `makestep` ensures rapid clock correction when connectivity is restored.
