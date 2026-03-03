# How to Configure NTP Servers on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, NTP, Time Synchronization, Kubernetes, Infrastructure, Configuration

Description: Step-by-step guide to configuring NTP servers on Talos Linux nodes for accurate time synchronization across your Kubernetes cluster.

---

Accurate time synchronization is not optional in a distributed system. Kubernetes relies on consistent time across all nodes for certificate validation, log ordering, scheduled jobs, and many other operations. If your nodes disagree on what time it is, you will see hard-to-diagnose failures across the cluster. Talos Linux includes built-in NTP support, and configuring it properly is one of the first things you should do when setting up a cluster.

## Default Time Sync Behavior

Out of the box, Talos Linux synchronizes time using NTP. The default configuration points to well-known public NTP pools. However, relying on defaults is not ideal for production environments. Public NTP pools may have variable latency, could be blocked by firewall rules, or might not meet your organization's compliance requirements.

```bash
# Check current time sync status
talosctl -n 192.168.1.10 get timestatus

# View the current NTP configuration
talosctl -n 192.168.1.10 get timeserverconfig -o yaml
```

## Configuring NTP in the Machine Configuration

NTP servers are configured in the machine configuration under the `machine.time` section. You can set this during initial cluster generation or patch it on running nodes.

### Setting NTP During Cluster Generation

When generating your cluster configuration, you can specify NTP servers directly:

```yaml
# machine-config-patch.yaml
machine:
  time:
    disabled: false
    servers:
      - time.cloudflare.com
      - time1.google.com
      - time2.google.com
      - time3.google.com
```

Apply this patch when generating the configuration:

```bash
# Generate config with NTP settings
talosctl gen config my-cluster https://192.168.1.10:6443 \
  --config-patch @machine-config-patch.yaml
```

### Patching NTP on Running Nodes

If your cluster is already running, you can update the NTP configuration without downtime:

```bash
# Patch a single node
talosctl -n 192.168.1.10 patch machineconfig -p '[
  {
    "op": "replace",
    "path": "/machine/time",
    "value": {
      "disabled": false,
      "servers": [
        "ntp.internal.company.com",
        "time.cloudflare.com",
        "time1.google.com"
      ]
    }
  }
]'
```

NTP configuration changes are applied live without requiring a reboot. The time sync service will immediately start using the new servers.

```bash
# Verify the change was applied
talosctl -n 192.168.1.10 get timeserverconfig -o yaml

# Check that time sync is working with the new servers
talosctl -n 192.168.1.10 get timestatus
```

## Choosing NTP Servers

The choice of NTP servers depends on your environment:

### Public NTP Servers

For internet-connected clusters, these are reliable options:

```yaml
machine:
  time:
    servers:
      # Cloudflare - anycast, very fast
      - time.cloudflare.com
      # Google - compensates for leap seconds
      - time1.google.com
      - time2.google.com
      # NTP pool project
      - 0.pool.ntp.org
      - 1.pool.ntp.org
```

### Internal NTP Servers

For enterprise environments, you typically want to point to internal NTP servers:

```yaml
machine:
  time:
    servers:
      # Primary internal NTP
      - ntp1.internal.company.com
      # Secondary internal NTP
      - ntp2.internal.company.com
      # Tertiary - public fallback
      - time.cloudflare.com
```

Using internal servers reduces dependency on external connectivity and can provide better accuracy due to lower network latency.

### Cloud Provider NTP

If you are running on a cloud provider, they usually offer NTP endpoints optimized for their network:

```yaml
# AWS
machine:
  time:
    servers:
      - 169.254.169.123

# Azure
machine:
  time:
    servers:
      - time.windows.com

# GCP
machine:
  time:
    servers:
      - metadata.google.internal
```

## Configuring Multiple Nodes

In most cases, you want all nodes in the cluster to use the same NTP configuration. You can apply the patch to multiple nodes at once:

```bash
# Apply to multiple nodes
for node in 192.168.1.10 192.168.1.11 192.168.1.12 192.168.1.20 192.168.1.21; do
  talosctl -n "$node" patch machineconfig -p '[
    {
      "op": "replace",
      "path": "/machine/time",
      "value": {
        "disabled": false,
        "servers": [
          "ntp.internal.company.com",
          "time.cloudflare.com"
        ]
      }
    }
  ]'
done
```

Alternatively, if you are using a configuration management approach with separate config files for control plane and worker nodes, include the NTP settings in both:

```yaml
# controlplane-patch.yaml
machine:
  time:
    servers:
      - ntp.internal.company.com
      - time.cloudflare.com

# worker-patch.yaml
machine:
  time:
    servers:
      - ntp.internal.company.com
      - time.cloudflare.com
```

## Verifying Time Synchronization

After configuring NTP, verify that synchronization is working:

```bash
# Check time status on all nodes
talosctl -n 192.168.1.10,192.168.1.11,192.168.1.12 get timestatus

# Check the time on each node
talosctl -n 192.168.1.10 time
talosctl -n 192.168.1.11 time
talosctl -n 192.168.1.12 time

# Compare with your local time
date -u
```

The `timestatus` resource will show you whether the node is synchronized, which server it is using, and the current offset.

## Handling NTP Failures

If NTP synchronization fails, you might see issues like:

- Certificate validation errors (certificates appear to be from the future or expired)
- etcd leader election problems
- CronJob scheduling issues
- Log timestamps that do not match reality

Here is how to diagnose NTP failures:

```bash
# Check if the time service is running
talosctl -n 192.168.1.10 service timed

# View time service logs
talosctl -n 192.168.1.10 logs timed

# Verify network connectivity to NTP servers
# (from a machine that can reach the same network)
nc -zvu ntp.internal.company.com 123
```

Common causes of NTP failure:

1. **Firewall blocking UDP port 123** - NTP uses UDP port 123. Make sure your firewall rules allow outbound UDP traffic on this port.

2. **DNS resolution failure** - If you are using hostnames for NTP servers, DNS must be working. Consider using IP addresses as a fallback.

3. **NTP server unavailable** - The server might be down or unreachable. Configure multiple servers for redundancy.

## NTP and Boot Time

During the initial boot of a Talos node, time synchronization is especially important. If the node's hardware clock is significantly off, it might fail to establish TLS connections (because certificates appear invalid) before NTP has a chance to correct the time.

Talos handles this by running NTP early in the boot process. However, if you are provisioning nodes with badly wrong hardware clocks, you might need to set the BIOS/UEFI clock to a reasonable value first.

```bash
# Check the hardware clock vs system time
talosctl -n 192.168.1.10 dmesg | grep -i "time\|clock\|ntp"
```

## Best Practices for NTP Configuration

1. **Use at least three NTP servers** - This allows the NTP algorithm to detect and ignore a faulty time source through majority voting.

2. **Mix server types** - Use a combination of internal and external servers for resilience. If your internal NTP infrastructure fails, external servers provide a safety net.

3. **Use nearby servers** - Lower network latency means more accurate time synchronization. Use servers in your geographic region or on your local network.

4. **Monitor NTP health** - Include time sync status in your monitoring stack. Alert on nodes that have not synchronized recently or have large offsets.

5. **Document your NTP architecture** - Record which NTP servers you use, why you chose them, and how they fit into your broader time synchronization strategy.

Properly configured NTP may seem like a small detail, but it prevents a whole category of subtle and frustrating issues in distributed systems. Take the time to set it up correctly from the start, and your future self will thank you.
