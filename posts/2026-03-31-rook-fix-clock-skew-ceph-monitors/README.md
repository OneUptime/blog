# How to Fix Clock Skew Warnings Between Ceph Monitors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Monitor, NTP, Troubleshooting

Description: Learn how to diagnose and fix clock skew warnings between Ceph monitors in Rook clusters by configuring NTP synchronization on nodes.

---

## Why Clock Skew Breaks Ceph Monitors

Ceph monitors use time-based consensus. If system clocks diverge by more than the `mon_clock_drift_allowed` threshold (default: 0.05 seconds / 50 milliseconds), monitors emit `HEALTH_WARN` messages and may refuse to form quorum. Severe clock skew can cause election storms where monitors get stuck in the electing state, potentially losing quorum.

Modern Kubernetes nodes running on bare metal or VMs rely on NTP (typically `chrony` or `ntpd`) for clock synchronization. Container runtimes inherit the host clock, so all Ceph processes on a node use the host's system clock.

## Identifying Clock Skew

Check for clock skew warnings in the Rook toolbox:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph health detail
```

You will see messages like:

```text
HEALTH_WARN clock skew detected on mon.b
MON_CLOCK_SKEW: clock skew detected on mon.b
    mon.b clock skew 0.143182s > max 0.05s (latency 0.000419s)
```

## Checking NTP Status on Nodes

SSH to the affected nodes or use a debug pod:

```bash
# Check chrony sync status
chronyc tracking

# Check NTP sources
chronyc sources -v

# Check time offset
timedatectl show --property=NTPSynchronized,TimeUSec
```

## Fixing NTP with chrony

Install and configure chrony on all nodes:

```bash
# Install chrony
sudo apt-get install -y chrony || sudo yum install -y chrony

# Configure NTP servers
# Config path: /etc/chrony.conf on RHEL/CentOS, /etc/chrony/chrony.conf on Debian/Ubuntu
CHRONY_CONF="/etc/chrony.conf"
[ -d /etc/chrony ] && CHRONY_CONF="/etc/chrony/chrony.conf"

sudo tee "$CHRONY_CONF" > /dev/null <<'EOF'
server 0.pool.ntp.org iburst
server 1.pool.ntp.org iburst
server 2.pool.ntp.org iburst
server 3.pool.ntp.org iburst
driftfile /var/lib/chrony/drift
makestep 1.0 3
rtcsync
EOF

# Service name: chronyd on RHEL/CentOS, chrony on Debian/Ubuntu
sudo systemctl enable --now chronyd 2>/dev/null || sudo systemctl enable --now chrony
```

Force clock synchronization:

```bash
sudo chronyc makestep
```

## Adjusting Ceph Clock Tolerance

As a temporary measure while fixing NTP, increase Ceph's tolerance:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set mon mon_clock_drift_allowed 0.5
```

Return to default once NTP is synchronized:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config rm mon mon_clock_drift_allowed
```

## Verifying Resolution

After NTP synchronization stabilizes (usually within a few minutes), check cluster health:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  watch ceph health
```

The `MON_CLOCK_SKEW` warning should disappear when all nodes are within 50ms of each other.

## Preventing Clock Skew in Kubernetes

For Kubernetes clusters, ensure all nodes sync to the same NTP source. On cloud platforms, use the hypervisor's time source:

```bash
# AWS/GCP: use local time source
server 169.254.169.123 prefer iburst   # AWS
server metadata.google.internal iburst  # GCP
```

## Summary

Clock skew in Ceph monitors is caused by unsynchronized node clocks. Fix by ensuring `chrony` or `ntpd` is running and synchronized on all nodes. Use `ceph config set mon mon_clock_drift_allowed` to temporarily raise tolerance during NTP stabilization. Monitor resolution with `ceph health detail` until the `MON_CLOCK_SKEW` warning clears.
