# How to Troubleshoot Time Sync Issues on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Time Sync, NTP, Troubleshooting, Kubernetes, Infrastructure

Description: A practical troubleshooting guide for diagnosing and fixing time synchronization problems on Talos Linux nodes in your Kubernetes cluster.

---

Time synchronization issues on Talos Linux can manifest in surprising ways. You might see certificate errors that make no sense, pods failing to schedule, etcd elections going haywire, or logs that appear out of order. The tricky part is that time drift rarely announces itself with a clear error message. Instead, you get a cascade of seemingly unrelated failures that all trace back to nodes disagreeing about what time it is.

This guide walks you through a systematic approach to identifying and fixing time sync problems on Talos Linux.

## Recognizing Time Sync Problems

Before you can fix the issue, you need to recognize it. Here are the most common symptoms of time synchronization problems:

**Certificate-related errors**: TLS certificates have validity periods. If a node's clock is ahead of the actual time, certificates may appear expired. If it is behind, certificates may appear not yet valid.

```text
x509: certificate has expired or is not yet valid
```

**etcd instability**: etcd uses time-based leases and timeouts. Clock skew between control plane nodes can cause excessive leader elections or lease expiration.

**Inconsistent log timestamps**: If you are aggregating logs from multiple nodes and the timestamps do not line up, time sync is the likely culprit.

**CronJob scheduling issues**: Jobs run at the wrong time or not at all because the node's clock does not match expectations.

## Step 1: Check the Current Time on Each Node

Start by comparing the time across all your nodes:

```bash
# Check time on individual nodes
talosctl -n 192.168.1.10 time
talosctl -n 192.168.1.11 time
talosctl -n 192.168.1.12 time

# Check time across multiple nodes at once
talosctl -n 192.168.1.10,192.168.1.11,192.168.1.12 time
```

Compare the reported times with each other and with a known-good reference. Even a few seconds of drift can cause issues with TLS and distributed consensus.

## Step 2: Check Time Sync Status

Talos tracks its time synchronization state through resources:

```bash
# Check the time sync status
talosctl -n 192.168.1.10 get timestatus -o yaml

# Check which NTP servers are configured
talosctl -n 192.168.1.10 get timeserverconfig -o yaml
```

The `timestatus` resource will tell you whether synchronization is active, the current offset from the NTP source, and the last time a successful sync occurred.

## Step 3: Inspect the Time Service

The time daemon (`timed`) is the service responsible for NTP synchronization:

```bash
# Check timed service status
talosctl -n 192.168.1.10 service timed

# View timed logs for errors
talosctl -n 192.168.1.10 logs timed

# Follow timed logs to see real-time sync attempts
talosctl -n 192.168.1.10 logs timed -f
```

Look for messages like:

- "sync" messages indicating successful time adjustments
- "error" messages showing failed sync attempts
- "unreachable" messages when NTP servers cannot be contacted

## Step 4: Verify NTP Server Connectivity

If the time service is running but not syncing, the problem might be network-level connectivity to the NTP servers:

```bash
# Check which NTP servers are configured
talosctl -n 192.168.1.10 get timeserverconfig -o yaml
```

Common connectivity blockers include:

1. **Firewall rules**: NTP uses UDP port 123. Many corporate firewalls block outbound UDP traffic by default.

2. **DNS resolution**: If NTP servers are specified as hostnames, DNS must be working. Check the node's DNS configuration:

```bash
# Check DNS resolver configuration
talosctl -n 192.168.1.10 get resolvers -o yaml

# Verify DNS is working by checking other name resolution
talosctl -n 192.168.1.10 get hostnamestatus
```

3. **Network policies**: Kubernetes network policies might be blocking outbound NTP traffic from the node. Although NTP runs at the OS level (not in a pod), some network configurations can still interfere.

## Step 5: Check for Large Time Offsets

If a node's clock is very far off (hours or days rather than seconds), there may be a hardware clock issue. This is common with virtual machines that have been suspended and resumed, or bare metal servers that have been powered off for a long time.

```bash
# Check system messages for time-related events
talosctl -n 192.168.1.10 dmesg | grep -i "time\|clock\|rtc"

# Check the current offset
talosctl -n 192.168.1.10 get timestatus -o yaml
```

NTP typically handles small adjustments by gradually slewing the clock. But for large offsets (more than a few minutes), the NTP client may need to step the clock - making a sudden jump to the correct time. Talos handles this automatically, but it can cause brief disruptions to services that are sensitive to time jumps.

## Step 6: Verify After Fixing

Once you have addressed the root cause, verify that time sync is working correctly:

```bash
# Check sync status
talosctl -n 192.168.1.10 get timestatus

# Compare time across all nodes
talosctl -n 192.168.1.10,192.168.1.11,192.168.1.12,192.168.1.20,192.168.1.21 time

# Check that services are healthy
talosctl -n 192.168.1.10 services
```

Also verify that the symptoms you originally observed have resolved. If you were seeing certificate errors, test TLS connections. If etcd was unstable, check the etcd member status and leader election frequency.

## Common Fixes

### Fix 1: Update NTP Server Configuration

If the current NTP servers are unreachable, switch to servers that work in your environment:

```bash
# Patch the NTP configuration
talosctl -n 192.168.1.10 patch machineconfig -p '[
  {
    "op": "replace",
    "path": "/machine/time",
    "value": {
      "disabled": false,
      "servers": [
        "time.cloudflare.com",
        "time1.google.com",
        "time2.google.com"
      ]
    }
  }
]'
```

### Fix 2: Open Firewall Rules

If UDP port 123 is blocked, update your firewall rules to allow outbound NTP traffic:

```bash
# Example for cloud security groups (conceptual)
# Allow outbound UDP 123 to NTP servers
# Source: cluster nodes
# Destination: NTP server IPs or 0.0.0.0/0
# Protocol: UDP
# Port: 123
```

### Fix 3: Use IP Addresses Instead of Hostnames

If DNS is flaky, use IP addresses for NTP servers to eliminate the DNS dependency:

```bash
talosctl -n 192.168.1.10 patch machineconfig -p '[
  {
    "op": "replace",
    "path": "/machine/time/servers",
    "value": [
      "162.159.200.1",
      "216.239.35.0",
      "216.239.35.4"
    ]
  }
]'
```

### Fix 4: Deploy a Local NTP Server

For air-gapped environments or clusters with strict egress policies, deploy an NTP server within your network:

```yaml
# Run chrony as a container in your infrastructure
# Then point Talos nodes to it
machine:
  time:
    servers:
      - 10.0.0.50   # Local NTP server
      - 10.0.0.51   # Backup NTP server
```

### Fix 5: Reset the Hardware Clock

If a virtual machine's hardware clock is way off, you may need to intervene at the hypervisor level. For VMware, VirtualBox, or cloud providers, check the VM's time settings. Some hypervisors have an option to sync the VM clock with the host clock.

## Preventing Future Issues

1. **Monitor time offset**: Add time drift monitoring to your observability stack. Alert when any node's offset exceeds a threshold (e.g., 100ms).

2. **Use multiple NTP sources**: Configure at least three NTP servers so the client can use majority voting to detect a bad time source.

3. **Test NTP connectivity during setup**: Before deploying workloads, verify that all nodes can reach their configured NTP servers.

4. **Document your NTP infrastructure**: Know which servers you depend on and have a plan for what happens if they become unavailable.

5. **Check time after maintenance**: After reboots, upgrades, or any maintenance that takes a node offline, verify that time sync resumes correctly.

Time synchronization is one of those foundational concerns that is easy to overlook until it causes problems. By understanding the tools Talos provides for diagnosing time sync issues, you can resolve them quickly when they occur and prevent them from recurring.
