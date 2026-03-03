# How to Set Up Custom Time Sources for Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, NTP, Time Sources, Kubernetes, Infrastructure, Configuration

Description: Learn how to configure custom time sources for Talos Linux, including internal NTP servers, cloud provider endpoints, and local reference clocks.

---

Default NTP configurations work fine for development and testing, but production Kubernetes clusters often need custom time sources. Whether you are running in a restricted network, need to comply with specific timing standards, or want to reduce dependency on external services, setting up custom time sources on Talos Linux is a straightforward process with significant operational benefits.

## Why Use Custom Time Sources?

There are several reasons you might want to move away from the default public NTP pools:

**Compliance requirements**: Some industries (finance, telecommunications, government) have strict requirements about time accuracy and traceability. You may need to use specific time servers that are certified or auditable.

**Network restrictions**: Air-gapped environments, private clouds, or networks with strict egress policies may not allow connections to public NTP servers.

**Improved accuracy**: Local NTP servers on your network have lower latency than public servers, which can improve synchronization precision from milliseconds to microseconds.

**Reduced external dependencies**: If your cluster's time synchronization depends on external servers and those servers become unreachable, you could face a cascading failure.

## Setting Up an Internal NTP Server

The first step is having your own NTP infrastructure. If your organization does not already have internal NTP servers, you can set one up using chrony or ntpd on a dedicated server.

Here is a basic chrony configuration for an internal NTP server:

```bash
# /etc/chrony/chrony.conf on your NTP server

# Upstream sources - these connect to public NTP
server time.cloudflare.com iburst
server time1.google.com iburst
server time2.google.com iburst
server time3.google.com iburst

# Allow clients from your network
allow 192.168.0.0/16
allow 10.0.0.0/8

# Serve time even when not synced to upstream
local stratum 10

# Log file
logdir /var/log/chrony
```

This server syncs to public NTP upstream and then serves as a time source for your internal network, including your Talos Linux nodes.

## Configuring Talos to Use Custom Time Sources

Once your internal NTP infrastructure is ready, configure Talos to use it.

### Method 1: During Cluster Generation

Include the time configuration in your config patches:

```yaml
# custom-time-patch.yaml
machine:
  time:
    disabled: false
    servers:
      - 10.0.1.50    # Primary internal NTP
      - 10.0.1.51    # Secondary internal NTP
      - 10.0.2.50    # Tertiary internal NTP (different subnet)
```

```bash
# Generate configuration with custom time sources
talosctl gen config my-cluster https://192.168.1.10:6443 \
  --config-patch @custom-time-patch.yaml
```

### Method 2: Patching Running Nodes

For existing clusters, apply the change live:

```bash
# Update NTP servers on a running node
talosctl -n 192.168.1.10 patch machineconfig -p '[
  {
    "op": "replace",
    "path": "/machine/time",
    "value": {
      "disabled": false,
      "servers": [
        "10.0.1.50",
        "10.0.1.51",
        "10.0.2.50"
      ]
    }
  }
]'
```

This change takes effect immediately without a reboot.

## Cloud Provider Time Sources

Each major cloud provider offers optimized NTP endpoints. Using these instead of public NTP pools gives you better accuracy and reliability within the provider's network.

### AWS

Amazon provides the Amazon Time Sync Service at a link-local address:

```yaml
machine:
  time:
    servers:
      - 169.254.169.123
```

This endpoint is accessible from any EC2 instance without any network configuration. It supports both NTP and PTP (Precision Time Protocol) on Nitro-based instances.

### Google Cloud

GCP provides its own time servers:

```yaml
machine:
  time:
    servers:
      - metadata.google.internal
      - time1.google.com
      - time2.google.com
      - time3.google.com
      - time4.google.com
```

Note that Google handles leap seconds differently from the rest of the NTP ecosystem. Google "smears" the leap second over a period of time rather than inserting it all at once. If you mix Google time sources with non-Google sources, you may see small discrepancies during leap second events.

### Azure

Azure VMs can use the Hyper-V host as a time reference:

```yaml
machine:
  time:
    servers:
      - time.windows.com
```

### On-Premises VMware

For VMware environments, you can configure NTP at the ESXi host level and optionally pass time through VMware Tools. However, for Talos Linux, it is better to configure NTP directly rather than relying on VMware time sync:

```yaml
machine:
  time:
    servers:
      - ntp1.datacenter.internal
      - ntp2.datacenter.internal
```

## Hierarchical Time Source Architecture

For large deployments, consider a hierarchical NTP architecture:

```text
Stratum 1: GPS/atomic clock reference
    |
Stratum 2: Your primary NTP servers (sync to stratum 1)
    |
Stratum 3: Regional NTP servers (sync to stratum 2)
    |
Stratum 4: Talos nodes (sync to stratum 3)
```

This architecture provides:

- **Scalability** - Regional servers handle local traffic, reducing load on primary servers
- **Resilience** - Multiple levels of fallback
- **Accuracy** - Each level adds only a small amount of jitter

```yaml
# Talos nodes in US-East datacenter
machine:
  time:
    servers:
      - ntp-useast1.internal.com
      - ntp-useast2.internal.com
      - ntp-central.internal.com   # Cross-region fallback

# Talos nodes in EU-West datacenter
machine:
  time:
    servers:
      - ntp-euwest1.internal.com
      - ntp-euwest2.internal.com
      - ntp-central.internal.com   # Cross-region fallback
```

## Applying Time Sources to All Nodes

When deploying a cluster, you want consistent time configuration across all nodes. Here is a script that applies custom time sources to every node:

```bash
#!/bin/bash

# Define your custom NTP servers
NTP_SERVERS='["10.0.1.50", "10.0.1.51", "10.0.2.50"]'

# Control plane nodes
CP_NODES="192.168.1.10 192.168.1.11 192.168.1.12"

# Worker nodes
WORKER_NODES="192.168.1.20 192.168.1.21 192.168.1.22 192.168.1.23"

ALL_NODES="$CP_NODES $WORKER_NODES"

for node in $ALL_NODES; do
  echo "Configuring NTP on $node..."
  talosctl -n "$node" patch machineconfig -p "[
    {
      \"op\": \"replace\",
      \"path\": \"/machine/time\",
      \"value\": {
        \"disabled\": false,
        \"servers\": $NTP_SERVERS
      }
    }
  ]"
done

echo "Verifying time sync status..."
for node in $ALL_NODES; do
  echo "Node: $node"
  talosctl -n "$node" get timestatus
done
```

## Validating Your Custom Time Sources

After configuration, validate that everything is working:

```bash
# Check sync status
talosctl -n 192.168.1.10 get timestatus -o yaml

# Verify the configured servers
talosctl -n 192.168.1.10 get timeserverconfig -o yaml

# Check time service logs for successful sync
talosctl -n 192.168.1.10 logs timed | tail -20

# Compare time across nodes
talosctl -n 192.168.1.10,192.168.1.11,192.168.1.12 time
```

Look for confirmation that the node is syncing with your custom servers rather than the defaults.

## Monitoring Custom Time Sources

Once running, monitor your time infrastructure:

```bash
# Script for periodic time health checks
#!/bin/bash

NODES="192.168.1.10 192.168.1.11 192.168.1.12 192.168.1.20 192.168.1.21"

for node in $NODES; do
  status=$(talosctl -n "$node" get timestatus -o yaml 2>/dev/null)
  synced=$(echo "$status" | grep "synced" | awk '{print $2}')

  if [ "$synced" = "true" ]; then
    echo "OK: $node is synchronized"
  else
    echo "ALERT: $node is NOT synchronized"
  fi
done
```

## Fallback Strategy

Always configure fallback time sources in case your primary servers become unavailable:

```yaml
machine:
  time:
    servers:
      # Primary - internal
      - 10.0.1.50
      - 10.0.1.51
      # Fallback - external (if network policy allows)
      - time.cloudflare.com
      - time1.google.com
```

The NTP client will try servers in order and fall back to the next one if the previous is unreachable.

Setting up custom time sources is a small investment that pays off in reliability and control. By owning your time infrastructure, you eliminate a class of external dependencies and gain the ability to meet specific accuracy or compliance requirements for your Talos Linux clusters.
