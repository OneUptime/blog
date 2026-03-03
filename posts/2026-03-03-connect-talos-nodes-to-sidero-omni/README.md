# How to Connect Talos Nodes to Sidero Omni

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Sidero Omni, Cluster Management, Kubernetes, Infrastructure

Description: A practical guide to connecting Talos Linux nodes to Sidero Omni for centralized cluster management and monitoring

---

Sidero Omni is a cluster management platform built specifically for Talos Linux. It provides a centralized interface for managing Talos nodes and clusters across multiple environments, whether they are running in the cloud, on bare metal, or at the edge. Connecting your Talos nodes to Omni gives you a single pane of glass for monitoring, upgrading, and configuring all your infrastructure.

This guide walks through the process of connecting Talos nodes to Sidero Omni, from initial setup to verification.

## What Is Sidero Omni

Sidero Omni is the management layer for Talos Linux infrastructure. Think of it as the control plane for your control planes. While Talos Linux manages individual Kubernetes clusters, Omni manages the Talos nodes themselves. It provides:

- Centralized visibility into all your Talos nodes and clusters
- One-click cluster creation and scaling
- Rolling upgrades across clusters
- Configuration management and templating
- Access control and audit logging
- SideroLink VPN for secure remote management

Omni is available as a SaaS offering or can be self-hosted. Either way, the process for connecting nodes is similar.

## Prerequisites

Before connecting nodes to Omni, you need:

1. A Sidero Omni account (SaaS or self-hosted)
2. Talos Linux nodes running version 1.5 or later
3. Network connectivity from nodes to the Omni endpoint
4. The `omnictl` command-line tool installed

```bash
# Install omnictl
curl -sL https://omni.siderolabs.com/install | sh

# Verify installation
omnictl version

# Login to your Omni instance
omnictl auth login --url https://your-omni-instance.siderolabs.com
```

## Method 1: Connect Existing Talos Nodes

If you already have Talos Linux nodes running, you can connect them to Omni by generating a join configuration:

```bash
# Get the join token from Omni
omnictl get jointoken

# Generate a machine configuration patch for connecting to Omni
omnictl machineconfig generate --omni-url https://your-omni-instance.siderolabs.com
```

The join process works through SideroLink, which establishes a secure WireGuard VPN tunnel from each node to the Omni instance. This tunnel carries all management traffic.

To add the Omni connection to an existing Talos node, apply a machine configuration patch:

```yaml
# omni-connect-patch.yaml
machine:
  install:
    extraKernelArgs:
      - siderolink.api=https://your-omni-instance.siderolabs.com:8099
      - talos.events.sink=[fdae:41e4:649b:9303::1]:8090
      - talos.logging.kernel=tcp://[fdae:41e4:649b:9303::1]:8092
```

Apply the patch to your nodes:

```bash
# Apply the connection patch
talosctl apply-config --nodes 10.0.0.1 \
  --config-patch @omni-connect-patch.yaml \
  --mode no-reboot
```

After applying, the node establishes a SideroLink tunnel to Omni and appears in the Omni dashboard.

## Method 2: Boot New Nodes with Omni Connection

The recommended approach for new nodes is to boot them with an Omni-aware image. Omni generates custom Talos installation images that include the SideroLink configuration:

```bash
# Download the Omni-enabled Talos image
omnictl download --output talos-omni.iso

# Or get the image URL for PXE booting
omnictl image-url
```

For bare metal servers, use the generated ISO:

```bash
# Write the ISO to a USB drive
dd if=talos-omni.iso of=/dev/sdb bs=4M status=progress

# Or configure PXE boot with the Omni kernel and initrd
# The kernel args will include the SideroLink parameters
```

For cloud environments, use the appropriate image format:

```bash
# For AWS
omnictl download --format ami --region us-east-1

# For GCP
omnictl download --format gcp

# For Azure
omnictl download --format azure-vhd
```

When a node boots with the Omni-enabled image, it automatically connects to your Omni instance and appears in the "Machines" list.

## Verifying the Connection

After a node connects to Omni, verify the connection from both sides:

```bash
# From omnictl: list all connected machines
omnictl get machines

# Expected output:
# NAMESPACE   TYPE      ID                                     VERSION
# default     Machine   abc12345-6789-0def-ghij-klmnopqrstuv   1

# Get detailed information about a machine
omnictl get machine abc12345-6789-0def-ghij-klmnopqrstuv -o yaml

# Check the SideroLink connection status
omnictl get link abc12345-6789-0def-ghij-klmnopqrstuv
```

From the Talos node side:

```bash
# Check SideroLink interface
talosctl read /proc/net/dev --nodes 10.0.0.1 | grep siderolink

# Check the WireGuard tunnel
talosctl get addresses --nodes 10.0.0.1
# Look for the siderolink address (fdae:... prefix)
```

## Creating a Cluster from Connected Nodes

Once nodes are connected to Omni, you can create Kubernetes clusters through the Omni interface:

```bash
# Create a new cluster
omnictl cluster create my-production-cluster

# Add control plane nodes
omnictl cluster scale my-production-cluster \
  --control-planes 3 \
  --machine-class control-plane

# Add worker nodes
omnictl cluster scale my-production-cluster \
  --workers 5 \
  --machine-class worker
```

You can also use machine classes to categorize nodes by their capabilities:

```bash
# Define machine classes
omnictl machineclass create control-plane \
  --label role=control-plane \
  --label hardware=high-mem

omnictl machineclass create worker \
  --label role=worker \
  --label hardware=standard
```

## Configuring Machine Labels

Labels help organize your machines in Omni. Apply labels to machines for easier management:

```bash
# Add labels to a machine
omnictl machine label abc12345-6789-0def-ghij-klmnopqrstuv \
  --label environment=production \
  --label datacenter=us-east-1 \
  --label rack=r42

# List machines with specific labels
omnictl get machines --label environment=production
```

## Handling Disconnected Nodes

If a node loses connectivity to Omni, it continues operating normally. Kubernetes workloads are not affected. The node simply disappears from the Omni dashboard until connectivity is restored.

To troubleshoot connection issues:

```bash
# Check if the node can reach the Omni endpoint
talosctl read /proc/net/dev --nodes 10.0.0.1

# Check for errors in Talos logs
talosctl logs controller-runtime --nodes 10.0.0.1 | grep -i siderolink

# Verify DNS resolution for the Omni endpoint
talosctl read /etc/resolv.conf --nodes 10.0.0.1
```

Common causes of disconnection:
- Firewall blocking WireGuard traffic (UDP port 8099)
- DNS resolution failure for the Omni endpoint
- Network changes affecting the node's outbound connectivity
- Omni instance downtime

## Security Considerations

The connection between Talos nodes and Omni is secured by:

1. WireGuard encryption on the SideroLink tunnel
2. Mutual authentication using cryptographic identities
3. All management traffic flows through the encrypted tunnel

Ensure your firewall allows outbound UDP traffic to the Omni endpoint:

```text
Required outbound ports:
- UDP 8099: SideroLink (WireGuard) tunnel
- TCP 443: Omni API (for initial connection)
```

No inbound ports need to be opened on the Talos nodes. The SideroLink tunnel is initiated from the node to Omni, so nodes behind NAT or firewalls can still connect.

## Automating Node Registration

For large-scale deployments, automate node registration using infrastructure-as-code:

```yaml
# terraform example for cloud nodes
resource "omni_machine" "workers" {
  count = 10

  machine_class = "worker"
  labels = {
    environment = "production"
    pool        = "general"
  }
}
```

For bare metal, use PXE booting with the Omni-enabled image. As servers boot, they automatically register with Omni:

```text
PXE Boot Flow:
1. Server PXE boots
2. DHCP provides the Omni-enabled kernel and initrd
3. Talos boots and establishes SideroLink tunnel
4. Node appears in Omni dashboard
5. Operator assigns node to a cluster
```

## Conclusion

Connecting Talos nodes to Sidero Omni transforms how you manage your Kubernetes infrastructure. Instead of individually managing nodes with talosctl, you get a centralized platform that handles everything from initial provisioning to rolling upgrades. The SideroLink VPN provides secure connectivity regardless of network topology, and the entire connection process can be automated for large-scale deployments. Whether you have 3 nodes or 3,000, Omni gives you consistent visibility and control across your entire Talos Linux fleet.
