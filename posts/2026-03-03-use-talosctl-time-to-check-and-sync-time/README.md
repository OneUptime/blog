# How to Use talosctl time to Check and Sync Time

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Talosctl, Time Synchronization, NTP, Cluster Administration

Description: Learn how to use the talosctl time command to check and synchronize time across Talos Linux nodes for cluster reliability

---

Accurate time synchronization is surprisingly important in a Kubernetes cluster. Certificates, TLS handshakes, log correlation, distributed consensus in etcd, and many other operations depend on nodes having consistent time. The `talosctl time` command lets you check the time on your Talos Linux nodes and compare it with an NTP server.

## Why Time Matters in Kubernetes

Time issues in a Kubernetes cluster can cause a range of subtle but serious problems:

- **Certificate validation failures**: TLS certificates have validity periods based on time. If a node's clock is off, it may reject valid certificates or accept expired ones.
- **etcd consensus issues**: etcd uses time-based leases and leader election. Clock skew between etcd members can cause instability.
- **Log correlation**: When troubleshooting, you need logs from different nodes to have consistent timestamps. Clock drift makes this difficult.
- **Cron jobs**: Kubernetes CronJobs depend on accurate time to trigger at the right moments.
- **Token expiration**: Authentication tokens and service account tokens have expiration times. Clock skew can cause premature or late expiration.

Even a few seconds of clock skew can cause problems, and minutes of drift can bring down your cluster.

## Basic Usage

To check the time on a node:

```bash
# Check the time on a node

talosctl time --nodes 192.168.1.10
```

The output shows the node's current time:

```text
NODE           NODE-TIME
192.168.1.10   2026-03-03 12:00:00.000000000 +0000 UTC
```

To compare the node's clock with an NTP server, use `--check`:

```bash
talosctl time --nodes 192.168.1.10 --check time.cloudflare.com
```

```text
NODE           NTP-SERVER            NODE-TIME                                 NTP-SERVER-TIME
192.168.1.10   time.cloudflare.com   2026-03-03 12:00:00.000000000 +0000 UTC   2026-03-03 12:00:00.002000000 +0000 UTC
```

The difference between `NODE-TIME` and `NTP-SERVER-TIME` tells you how far the node's clock is from the NTP server. A small difference (under 100 milliseconds) is normal and healthy.

## Checking Time Across Multiple Nodes

To verify time consistency across your cluster:

```bash
# Check time on all nodes
talosctl time --nodes 192.168.1.10,192.168.1.11,192.168.1.12,192.168.1.20,192.168.1.21
```

The output shows the current time for each node. All node times should be close to one another. If one node has a significantly different time, it may have a time synchronization problem.

## Understanding NTP in Talos Linux

Talos Linux includes a built-in time sync service that implements SNTP and automatically synchronizes the system clock with time servers. By default, it uses `time.cloudflare.com` as the NTP server, but you can configure custom NTP servers with a `TimeSyncConfig` document.

The time sync service runs as part of the Talos system services and does not require any manual configuration for basic usage. It starts automatically when the node boots and continuously adjusts the clock to stay synchronized.

## Configuring NTP Servers

If you need to use specific NTP servers (for example, internal NTP servers in an air-gapped environment), configure them with `TimeSyncConfig`:

```yaml
# TimeSyncConfig for custom NTP servers
apiVersion: v1alpha1
kind: TimeSyncConfig
ntp:
  servers:
    - ntp1.internal.example.com
    - ntp2.internal.example.com
    - ntp3.internal.example.com
```

After applying this configuration:

```bash
# Apply the updated config
talosctl apply-config --nodes 192.168.1.10 --file updated-config.yaml

# Verify the time sync is using the new servers
talosctl get timeservers --nodes 192.168.1.10
```

## Scripting Time Checks

Automate time synchronization verification across your cluster:

```bash
#!/bin/bash
# time-check.sh - Verify time synchronization across the cluster

NODES="192.168.1.10 192.168.1.11 192.168.1.12 192.168.1.20 192.168.1.21 192.168.1.22"
echo "Time Synchronization Check - $(date)"
echo "======================================"

ALL_OK=true

for node in $NODES; do
  TIME_OUTPUT=$(talosctl time --nodes "$node" --check time.cloudflare.com 2>&1)
  echo "Node $node: $TIME_OUTPUT"

  SYNC_STATUS=$(talosctl get timestatus --nodes "$node" --output yaml 2>/dev/null | grep "synced:" | awk '{print $2}')

  if [ "$SYNC_STATUS" != "true" ]; then
    ALL_OK=false
    echo "  Time sync status: not synced"
  else
    echo "  Time sync status: synced"
  fi
done

if [ "$ALL_OK" = true ]; then
  echo ""
  echo "All nodes report synchronized time."
else
  echo ""
  echo "WARNING: Some nodes do not report synchronized time!"
fi
```

## Troubleshooting Time Issues

### Large NTP Offset

If a node's time differs from the NTP server by more than a second, it might be having trouble reaching the NTP server:

```bash
# Check time on the problematic node
talosctl time --nodes 192.168.1.20 --check time.cloudflare.com

# Check time sync status
talosctl get timestatus --nodes 192.168.1.20

# Check which time servers Talos is using
talosctl get timeservers --nodes 192.168.1.20

# Check all configured time server sources
talosctl get timeserverspec --namespace=network-config --nodes 192.168.1.20

# Check time sync logs
talosctl logs controller-runtime --nodes 192.168.1.20 | grep -i time.Sync
```

Common causes of large offsets:
- Firewall blocking UDP port 123 (NTP traffic)
- DNS resolution failure for NTP server hostnames
- Network latency to remote NTP servers
- Virtual machine time drift (common in VMs)

### NTP Server Unreachable

If the node cannot reach any NTP server:

```bash
# Check the configured NTP servers
talosctl get timeservers --nodes 192.168.1.20

# Check time sync status and logs
talosctl get timestatus --nodes 192.168.1.20
talosctl logs controller-runtime --nodes 192.168.1.20 | grep -i time.Sync
```

Solutions:
- Verify firewall rules allow outbound UDP port 123
- Use IP addresses instead of hostnames for NTP servers if DNS is unreliable
- Configure multiple NTP servers for redundancy
- Use an internal NTP server if external access is restricted

### Clock Jumping

If you notice the clock jumping (large sudden changes), it might be due to VM hypervisor time synchronization conflicting with NTP:

```bash
# Check time sync logs for time adjustments
talosctl logs controller-runtime --nodes 192.168.1.20 | grep -i "time.Sync"
```

In virtualized environments, disable hypervisor time synchronization and let Talos handle time sync through NTP instead.

## Time Sync in Air-Gapped Environments

In environments without internet access, you need to run your own NTP servers:

```yaml
# TimeSyncConfig for air-gapped NTP
apiVersion: v1alpha1
kind: TimeSyncConfig
ntp:
  servers:
    - 10.0.0.1  # Internal NTP server 1
    - 10.0.0.2  # Internal NTP server 2
```

Make sure your internal NTP servers are:
- Highly available (at least two servers)
- Accurately synchronized to a reliable time source (GPS receiver, atomic clock, etc.)
- Accessible from all Talos Linux nodes

## Verifying Time After Bootstrap

After bootstrapping a new cluster, one of the first things to verify is time synchronization:

```bash
# Check time on all nodes immediately after bootstrap
ALL_NODES="192.168.1.10,192.168.1.11,192.168.1.12,192.168.1.20,192.168.1.21"

talosctl time --nodes "$ALL_NODES" --check time.cloudflare.com
```

If time is not synchronized at bootstrap time, you may encounter certificate issues and etcd problems from the very start.

## Integrating Time Checks into Health Monitoring

Add time checks to your regular health monitoring:

```bash
#!/bin/bash
# health-check-with-time.sh

NODES="192.168.1.10 192.168.1.11 192.168.1.12 192.168.1.20 192.168.1.21"

echo "=== Cluster Health Check ==="

# Check services
for node in $NODES; do
  echo "Node $node:"
  echo "  Services: $(talosctl service --nodes "$node" 2>/dev/null | grep -c Running) running"
  echo "  Time: $(talosctl time --nodes "$node" --check time.cloudflare.com 2>/dev/null | tail -1)"
  echo "  Sync: $(talosctl get timestatus --nodes "$node" 2>/dev/null | tail -1)"
  echo "  Memory: $(talosctl memory --nodes "$node" 2>/dev/null | tail -1)"
  echo ""
done
```

## Time and Certificate Management

Time accuracy directly affects certificate management in your cluster:

```bash
# If you suspect time-related certificate issues, check time first
talosctl time --nodes 192.168.1.10

# Then check certificate expiration
# Kubernetes API server certificates
talosctl logs kube-apiserver --nodes 192.168.1.10 | grep -i "cert\|expir\|tls"

# Check kubelet certificate
talosctl logs kubelet --nodes 192.168.1.20 | grep -i "cert\|expir\|tls"
```

If certificates appear to expire or become valid at unexpected times, clock skew is often the cause.

## Best Practices

- Verify time synchronization immediately after deploying new nodes.
- Use at least two NTP servers for redundancy.
- Monitor NTP offsets as part of your regular health checks.
- In air-gapped environments, deploy reliable internal NTP servers.
- Keep NTP offsets below 100 milliseconds for best results.
- Check time before investigating certificate-related errors, as they are often caused by clock skew.
- For virtual machines, disable hypervisor time sync and use NTP instead.
- Document your NTP server configuration in your infrastructure runbook.
- Alert when NTP offsets exceed one second.
- Include time checks in your cluster bootstrap verification process.

The `talosctl time` command is a simple but essential tool for maintaining time accuracy across your Talos Linux cluster. Keeping your clocks in sync prevents a whole class of subtle, hard-to-debug problems.
