# How to Troubleshoot Clock Skew Issues on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Clock Skew, Time Synchronization, Troubleshooting, Kubernetes, etcd

Description: A comprehensive guide to diagnosing and resolving clock skew issues on Talos Linux nodes that can cause certificate errors, etcd instability, and other cluster problems.

---

Clock skew is one of those problems that can make you question your sanity. Everything looks fine on the surface - services are running, pods are scheduled, network is healthy - but random, seemingly unrelated errors keep popping up. Certificate validation fails intermittently. etcd throws lease expiration warnings. Logs from different nodes show events happening in the wrong order. The root cause? Nodes that disagree about what time it is.

This post covers how to identify, diagnose, and fix clock skew issues on Talos Linux clusters.

## What is Clock Skew?

Clock skew is the difference in time between two clocks that should be synchronized. In a Kubernetes cluster, even a few hundred milliseconds of skew between nodes can cause problems. Several seconds of skew will almost certainly break things.

Clock skew is different from clock drift. Drift is the rate at which a clock gains or loses time relative to a reference. Skew is the absolute difference at any given moment. A small drift rate leads to growing skew over time if NTP is not correcting it.

## Symptoms of Clock Skew

Before you start troubleshooting, recognize the patterns that point to clock skew:

### Certificate Errors

```
error: x509: certificate has expired or is not yet valid:
  current time 2026-03-03T10:30:00Z is after 2026-03-03T10:25:00Z
```

This error means the node's clock is ahead of the certificate's validity period, or behind the "not before" date. It is the most common visible symptom of clock skew.

### etcd Instability

```bash
# etcd logs showing leader changes
talosctl -n 192.168.1.10 logs etcd | grep "leader"

# You might see frequent entries like:
# etcd: became follower at term 4
# etcd: elected leader at term 5
# etcd: became follower at term 6
```

etcd uses time-based leases for leader election. If clocks are skewed, nodes may think leases have expired when they have not, causing unnecessary leader elections.

### Log Ordering Problems

When viewing aggregated logs, events appear out of order:

```
Node A 10:30:01 - Received request
Node B 10:29:58 - Sent request        # This should appear BEFORE Node A's log
Node A 10:30:02 - Processed request
```

### Kubernetes Scheduling Issues

Pods may not get scheduled, or they may get evicted unexpectedly. The scheduler and kubelet use timestamps for various decisions, and skew can cause them to disagree.

## Step-by-Step Diagnosis

### Step 1: Measure the Skew

Start by checking the time on all nodes and comparing them:

```bash
# Check time across all nodes
talosctl -n 192.168.1.10,192.168.1.11,192.168.1.12,192.168.1.20,192.168.1.21 time

# Also check against your local machine
date -u
```

Note the differences. Any node that is more than a second off from the others needs attention.

### Step 2: Check NTP Sync Status

```bash
# Check sync status on each node
for node in 192.168.1.10 192.168.1.11 192.168.1.12 192.168.1.20 192.168.1.21; do
  echo "=== $node ==="
  talosctl -n "$node" get timestatus -o yaml
done
```

Look for nodes where `synced: false` - these are the ones causing skew.

### Step 3: Examine the Time Service

```bash
# Check if the time service is running
talosctl -n 192.168.1.10 service timed

# View time service logs for errors
talosctl -n 192.168.1.10 logs timed
```

Common log messages that indicate problems:

```
# NTP server unreachable
timed: failed to query time.cloudflare.com: i/o timeout

# No servers configured
timed: no time servers configured

# Large offset detected
timed: clock offset exceeds threshold
```

### Step 4: Test NTP Server Connectivity

If the time service cannot reach its NTP servers, synchronization will fail:

```bash
# Check configured NTP servers
talosctl -n 192.168.1.10 get timeserverconfig -o yaml

# Test network connectivity (from a machine on the same network)
# NTP uses UDP port 123
nc -zvu time.cloudflare.com 123
```

### Step 5: Check for Competing Time Sources

If you have multiple time synchronization mechanisms active (for example, VMware time sync and NTP), they can fight each other and cause oscillating skew:

```bash
# Check for VMware tools or other time sync mechanisms
talosctl -n 192.168.1.10 dmesg | grep -i "time\|clock\|vmware\|hyperv"
```

## Common Causes and Fixes

### Cause 1: NTP Servers Unreachable

**Diagnosis**: Time service logs show connection timeouts.

**Fix**: Update the NTP configuration to use reachable servers:

```bash
talosctl -n 192.168.1.10 patch machineconfig -p '[
  {
    "op": "replace",
    "path": "/machine/time/servers",
    "value": [
      "time.cloudflare.com",
      "time1.google.com",
      "time2.google.com"
    ]
  }
]'
```

### Cause 2: Firewall Blocking NTP Traffic

**Diagnosis**: NTP servers are reachable from other machines but not from Talos nodes.

**Fix**: Open UDP port 123 outbound in your firewall rules. Also check any network policies that might affect node-level traffic.

### Cause 3: VM Clock Drift After Suspend/Resume

**Diagnosis**: Virtual machines that were suspended and resumed often have large clock offsets.

**Fix**: The NTP daemon should correct this automatically, but if the offset is very large, you may need to reboot the node to force a fresh sync. For VMware environments, consider these settings:

```yaml
# Disable VMware time sync (let NTP handle it)
# This is configured at the VM level, not in Talos
# In VMware: VM Settings -> Options -> VMware Tools -> Uncheck "Synchronize guest time with host"
```

### Cause 4: Bad Hardware Clock

**Diagnosis**: The node consistently drifts away from correct time even with NTP running.

**Fix**: A faulty hardware clock (RTC) can drift faster than NTP can correct. If one node consistently has more skew than others, it may have a hardware issue. Replace the CMOS battery on bare metal, or check the VM configuration on virtual machines.

### Cause 5: NTP Disabled in Configuration

**Diagnosis**: Time synchronization is explicitly disabled.

**Fix**: Enable it:

```bash
talosctl -n 192.168.1.10 patch machineconfig -p '[
  {
    "op": "replace",
    "path": "/machine/time/disabled",
    "value": false
  }
]'
```

### Cause 6: DNS Failure Preventing NTP Resolution

**Diagnosis**: NTP servers are specified as hostnames, and DNS is not working.

**Fix**: Use IP addresses for NTP servers, or fix DNS first:

```bash
# Use IP addresses to eliminate DNS dependency
talosctl -n 192.168.1.10 patch machineconfig -p '[
  {
    "op": "replace",
    "path": "/machine/time/servers",
    "value": [
      "162.159.200.1",
      "216.239.35.0"
    ]
  }
]'
```

## Impact of Clock Skew on Specific Components

### etcd

etcd is particularly sensitive to clock skew. The default election timeout is 1000ms, and clock skew of even a few hundred milliseconds can cause false timeouts:

```bash
# Check etcd health
talosctl -n 192.168.1.10 etcd status

# Look for slow heartbeat warnings
talosctl -n 192.168.1.10 logs etcd | grep -i "heartbeat\|election\|slow"
```

### Kubernetes API Server

The API server validates tokens and certificates using the system clock. Clock skew can cause valid tokens to appear expired:

```bash
# Check for auth-related errors
talosctl -n 192.168.1.10 logs kubelet | grep -i "unauthorized\|certificate\|token"
```

### Distributed Databases

If you run stateful workloads like CockroachDB or TiDB that use timestamps for transaction ordering, clock skew can cause data consistency issues. These systems often have their own clock skew detection and will refuse to start if skew exceeds their tolerance.

## Prevention

1. **Monitor time sync continuously** - Set up alerts for nodes that fall out of sync.

2. **Use multiple NTP servers** - Three or more servers allow the NTP algorithm to detect and discard a faulty time source.

3. **Verify after maintenance** - Check time sync after reboots, upgrades, or network changes.

4. **Keep NTP traffic paths simple** - Avoid complex NAT or proxy configurations that might interfere with NTP.

5. **Use local NTP servers** - Lower latency to the NTP server means more accurate synchronization.

```bash
# Quick health check script to run regularly
#!/bin/bash
for node in 192.168.1.10 192.168.1.11 192.168.1.12 192.168.1.20; do
  synced=$(talosctl -n "$node" get timestatus -o yaml 2>/dev/null | \
    grep "synced:" | awk '{print $2}')
  if [ "$synced" != "true" ]; then
    echo "ALERT: $node time sync failed"
  fi
done
```

Clock skew is a solvable problem, but only if you know to look for it. Make time synchronization monitoring a standard part of your Talos Linux cluster operations, and you will catch skew issues before they cascade into bigger problems.
