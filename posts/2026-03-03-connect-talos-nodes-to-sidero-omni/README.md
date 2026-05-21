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
# Install omnictl via Homebrew (recommended)
brew install siderolabs/tap/sidero-tools

# Or download the binary directly from GitHub releases
curl -LO "https://github.com/siderolabs/omni/releases/latest/download/omnictl-$(uname -s | tr '[:upper:]' '[:lower:]')-$(uname -m | sed 's/x86_64/amd64/; s/aarch64/arm64/')"
chmod +x omnictl-*
sudo mv omnictl-* /usr/local/bin/omnictl

# Verify installation
omnictl --help

# Download omniconfig.yaml from your Omni dashboard, then merge it
omnictl config merge ./omniconfig.yaml

# Verify your context is set up. The first command run opens a browser to authenticate.
omnictl config contexts
```

## Method 1: Connect Existing Talos Nodes

If you already have Talos Linux nodes running, you can connect them to Omni by generating a machine join configuration:

```bash
# List existing join tokens
omnictl jointoken list

# Create a new join token if needed
omnictl jointoken create --name my-token

# Generate a machine configuration snippet that joins this Omni instance.
# Pass --join-token <id> if you have multiple tokens.
omnictl jointoken machine-config
```

The join process works through SideroLink, which establishes a secure WireGuard VPN tunnel from each node to the Omni instance. This tunnel carries all management traffic.

The `machine-config` output contains a `siderolink` section that you supply to the node. The kernel-argument form looks like this (and is what Omni-generated installer media bakes into the image):

```text
siderolink.api=grpc://your-omni-instance.siderolabs.com:8090?jointoken=<token>
talos.events.sink=[fdae:41e4:649b:9303::1]:8090
talos.logging.kernel=tcp://[fdae:41e4:649b:9303::1]:8092
```

To add the Omni connection to an existing Talos node that does not yet have these kernel arguments, apply the generated join config as a machine config patch:

```bash
# Save the snippet from `omnictl jointoken machine-config` to omni-join.yaml,
# then apply it to the node
talosctl apply-config --nodes 10.0.0.1 \
  --patch @omni-join.yaml
```

After the configuration is applied, the node establishes a SideroLink tunnel to Omni and appears in the Omni dashboard. Note that a node connected only through machine-config (and not through kernel args) will lose its Omni link if it is reset, so for long-lived nodes prefer reinstalling from an Omni-generated image so the SideroLink kernel args persist.

## Method 2: Boot New Nodes with Omni Connection

The recommended approach for new nodes is to boot them with an Omni-aware image. Omni generates custom Talos installation images that include the SideroLink configuration. The `omnictl download` command pulls installer media for a given image name from the Omni server:

```bash
# Download an ISO (the image name is taken from the Omni "Download Installation Media" page)
omnictl download iso --output talos-omni.iso

# You can also select architecture, Talos version, and system extensions
omnictl download iso \
  --arch amd64 \
  --talos-version v1.9.0 \
  --extensions siderolabs/iscsi-tools \
  --output talos-omni.iso
```

For bare metal servers, use the generated ISO:

```bash
# Write the ISO to a USB drive
dd if=talos-omni.iso of=/dev/sdb bs=4M status=progress

# Or configure PXE boot with the Omni kernel and initrd
# (use --pxe with omnictl download to fetch the PXE-ready assets)
```

For cloud environments, download the appropriate image type for your platform from the Omni dashboard or `omnictl download` (Omni surfaces the image types its Image Factory supports - AWS AMI, GCP, Azure VHD, etc.). For example:

```bash
omnictl download "Amazon AWS" --arch amd64 --output talos-aws.raw.xz
omnictl download "Google Cloud" --arch amd64 --output talos-gcp.tar.gz
omnictl download "Azure" --arch amd64 --output talos-azure.vhd
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
# Check the WireGuard tunnel addresses on the node
talosctl --nodes 10.0.0.1 get addresses
# Look for the siderolink address (fdae:... prefix)

# Inspect SideroLink-related links
talosctl --nodes 10.0.0.1 get links
```

## Creating a Cluster from Connected Nodes

Once nodes are connected to Omni, you create Kubernetes clusters declaratively from a cluster template. Define the cluster in YAML and apply it with `omnictl cluster template sync`:

```yaml
# my-cluster.yaml
kind: Cluster
name: my-production-cluster
kubernetes:
  version: v1.31.0
talos:
  version: v1.9.0
---
kind: ControlPlane
machineClass:
  name: control-plane
  size: 3
---
kind: Workers
machineClass:
  name: worker
  size: 5
```

```bash
# Validate the template offline
omnictl cluster template validate -f my-cluster.yaml

# Push the template to Omni - this creates the cluster
omnictl cluster template sync -f my-cluster.yaml

# Wait for the cluster to converge
omnictl cluster status my-production-cluster
```

Machine classes are themselves Omni resources. Define each class as YAML and apply it with `omnictl apply`:

```yaml
# control-plane-class.yaml
metadata:
  namespace: default
  type: MachineClasses.omni.sidero.dev
  id: control-plane
spec:
  matchlabels:
    - omni.sidero.dev/role-controlplane = ""
```

```bash
omnictl apply -f control-plane-class.yaml
```

## Configuring Machine Labels

Labels help organize your machines in Omni. The Machines view in the Omni UI is the primary place to add or remove labels on a connected machine; the same labels are what Machine Classes match against in their `matchlabels` selectors:

```yaml
# worker-class.yaml - matches machines labeled environment=production
metadata:
  namespace: default
  type: MachineClasses.omni.sidero.dev
  id: worker
spec:
  matchlabels:
    - environment = production
```

You can also list machines filtered by a label selector with `omnictl get`:

```bash
omnictl get machines -l environment=production
```

## Handling Disconnected Nodes

If a node loses connectivity to Omni, it continues operating normally. Kubernetes workloads are not affected. The node simply disappears from the Omni dashboard until connectivity is restored.

To troubleshoot connection issues:

```bash
# Inspect SideroLink links and addresses on the node
talosctl --nodes 10.0.0.1 get links
talosctl --nodes 10.0.0.1 get addresses

# Tail Talos logs and filter for SideroLink
talosctl --nodes 10.0.0.1 logs controller-runtime | grep -i siderolink

# Verify DNS resolvers configured on the node
talosctl --nodes 10.0.0.1 get resolvers
```

Common causes of disconnection:
- Firewall blocking the outbound WireGuard UDP port assigned to your Omni account
- DNS resolution failure for the Omni endpoint
- Network changes affecting the node's outbound connectivity
- Omni instance downtime

## Security Considerations

The connection between Talos nodes and Omni is secured by:

1. WireGuard encryption on the SideroLink tunnel
2. Mutual authentication using cryptographic identities
3. All management traffic flows through the encrypted tunnel

Ensure your firewall allows the node's outbound traffic to your Omni instance:

```text
Required outbound ports:
- TCP 443: Omni gRPC/HTTPS API (initial registration)
- UDP <wireguard-port>: SideroLink tunnel - the port is assigned per Omni
  account; check the SideroLink settings in the Omni UI for the exact value
```

No inbound ports need to be opened on the Talos nodes. The SideroLink tunnel is initiated from the node to Omni, so nodes behind NAT or firewalls can still connect.

## Automating Node Registration

For large-scale deployments, automate node registration declaratively. Omni itself is template-driven: define clusters and machine classes as YAML and check them into Git, then apply them with `omnictl cluster template sync` and `omnictl apply -f`:

```yaml
# workers.yaml - a Workers MachineSet inside a cluster template
kind: Workers
machineClass:
  name: worker
  size: 10
patches:
  - name: workload-labels
    inline:
      machine:
        nodeLabels:
          environment: production
          pool: general
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
