# How to Enable KubeSpan Mesh Networking in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, KubeSpan, Mesh Networking, WireGuard, Kubernetes

Description: Learn how to enable and configure KubeSpan mesh networking in Talos Linux to create encrypted node-to-node connections across any network topology.

---

KubeSpan is one of the most powerful features built into Talos Linux. It creates a full mesh WireGuard network between all nodes in your cluster, encrypting all node-to-node traffic automatically. This is particularly useful when your nodes span multiple networks, cloud providers, or physical locations. This guide walks through enabling KubeSpan from scratch and getting it running on your Talos Linux cluster.

## What KubeSpan Does

KubeSpan uses WireGuard tunnels to create encrypted point-to-point connections between every node in your cluster. Once enabled, all Kubernetes traffic between nodes flows through these encrypted tunnels. This includes pod-to-pod traffic across nodes, control plane communication, and etcd replication traffic.

The practical benefit is that you can build clusters that span networks without worrying about the underlying network topology. Nodes can be in different subnets, different data centers, or even different cloud providers, and KubeSpan handles the connectivity. You do not need to set up VPNs, configure complex routing, or worry about firewall rules between sites.

## Prerequisites

Before enabling KubeSpan, make sure you have a working Talos Linux cluster with the discovery service enabled (it is enabled by default). KubeSpan relies on the discovery service to learn about other nodes and their endpoints.

Also confirm that your Talos version supports KubeSpan:

```bash
# Check Talos version
talosctl version --nodes <node-ip>
```

KubeSpan has been available since Talos 1.0 and is stable in all recent versions.

## Enabling KubeSpan During Cluster Creation

The easiest time to enable KubeSpan is when you first create your cluster. Use `talosctl gen config` with the KubeSpan flag:

```bash
# Generate cluster config with KubeSpan enabled
talosctl gen config my-cluster https://<control-plane-ip>:6443 \
  --with-kubespan
```

This generates machine configuration files with KubeSpan already configured. The generated config will include something like this:

```yaml
machine:
  network:
    kubespan:
      enabled: true
      advertiseKubernetesNetworks: false
      allowDownPeerBypass: false
      mtu: 1420
```

## Enabling KubeSpan on an Existing Cluster

If you already have a running cluster and want to enable KubeSpan, you can patch the machine configuration on each node. Create a patch file:

```yaml
# kubespan-patch.yaml
machine:
  network:
    kubespan:
      enabled: true
```

Apply the patch to each node:

```bash
# Apply to control plane nodes
talosctl patch machineconfig --patch @kubespan-patch.yaml \
  --nodes 192.168.1.10,192.168.1.11,192.168.1.12

# Apply to worker nodes
talosctl patch machineconfig --patch @kubespan-patch.yaml \
  --nodes 192.168.1.20,192.168.1.21,192.168.1.22
```

After patching, the nodes will establish WireGuard tunnels between each other automatically.

## Understanding the Configuration Options

Let's look at each KubeSpan configuration option in detail:

```yaml
machine:
  network:
    kubespan:
      # Enable or disable KubeSpan
      enabled: true

      # Advertise Kubernetes pod and service CIDRs through KubeSpan
      # Set to true if you want pod-to-pod traffic to use KubeSpan tunnels
      advertiseKubernetesNetworks: false

      # Allow traffic to bypass KubeSpan when a peer is down
      # Useful for hybrid setups where some traffic can go over the LAN
      allowDownPeerBypass: false

      # MTU for the WireGuard interface
      # Default is 1420, lower it if you have encapsulation overhead
      mtu: 1420

      # Filters for which endpoints to advertise
      filters:
        endpoints:
          - "0.0.0.0/0"  # Advertise all endpoints
```

### advertiseKubernetesNetworks

When set to `false` (the default), only node-to-node traffic uses KubeSpan. Pod-to-pod traffic uses your regular CNI. When set to `true`, pod and service network CIDRs are advertised through KubeSpan, meaning all inter-node pod traffic goes through the WireGuard tunnels.

For most single-site clusters, leave this as `false`. For multi-site clusters where nodes cannot reach each other's pod networks directly, set this to `true`:

```yaml
# kubespan-multi-site.yaml
machine:
  network:
    kubespan:
      enabled: true
      advertiseKubernetesNetworks: true
```

### allowDownPeerBypass

When a KubeSpan peer is unreachable, traffic to that peer is normally dropped. Setting `allowDownPeerBypass` to `true` allows the traffic to fall back to regular routing. This is useful in hybrid environments where nodes on the same LAN can reach each other directly:

```yaml
machine:
  network:
    kubespan:
      enabled: true
      allowDownPeerBypass: true
```

## Verifying KubeSpan Status

After enabling KubeSpan, check that it is working:

```bash
# Check KubeSpan identity on a node
talosctl get kubespanidentity --nodes <node-ip>

# Check KubeSpan peer status
talosctl get kubespanpeerstatus --nodes <node-ip>

# Check the WireGuard interface
talosctl get addresses --nodes <node-ip> | grep kubespan

# View KubeSpan endpoint information
talosctl get kubespanendpoint --nodes <node-ip>
```

The peer status output shows each peer's state. You want to see `up` for all peers:

```text
NODE           NAMESPACE   TYPE                 ID                                      VERSION   LABEL               ENDPOINT             STATE
192.168.1.10   network     KubeSpanPeerStatus   <peer-id>                               1         worker-1             192.168.1.20:51820   up
192.168.1.10   network     KubeSpanPeerStatus   <peer-id>                               1         worker-2             192.168.1.21:51820   up
```

## Network Requirements

KubeSpan uses WireGuard, which runs on UDP. By default, it uses port 51820. Make sure this port is open between all nodes:

```bash
# If using a cloud provider, allow UDP 51820 between nodes
# Example for AWS security groups (not a Talos command, just for reference):
# Inbound: UDP 51820 from cluster security group
# Outbound: UDP 51820 to cluster security group
```

If you are running nodes behind NAT, KubeSpan supports NAT traversal. It will try to establish direct connections and fall back to relaying through nodes that are directly reachable.

## Monitoring KubeSpan

You can set up monitoring for KubeSpan to track tunnel health:

```bash
# Create a script to check KubeSpan status periodically
#!/bin/bash
# check-kubespan.sh

NODES="192.168.1.10 192.168.1.11 192.168.1.20 192.168.1.21"

for node in $NODES; do
  echo "Checking KubeSpan on $node"
  talosctl get kubespanpeerstatus --nodes $node -o json | \
    jq '.[] | {label: .spec.label, state: .spec.state, endpoint: .spec.endpoint}'
done
```

For production clusters, consider sending KubeSpan metrics to your monitoring stack:

```bash
# Check WireGuard interface statistics
talosctl get kubespanpeerstatus --nodes <node-ip> -o json | \
  jq '.[] | {peer: .spec.label, rxBytes: .spec.receiveBytes, txBytes: .spec.transmitBytes}'
```

## Troubleshooting

If KubeSpan is not establishing connections, check the following:

```bash
# Check if the discovery service is working
talosctl get discoveredmembers --nodes <node-ip>

# Check KubeSpan logs
talosctl logs controller-runtime --nodes <node-ip> | grep -i kubespan

# Verify the WireGuard interface exists
talosctl get links --nodes <node-ip> | grep kubespan

# Check for firewall issues
talosctl dmesg --nodes <node-ip> | grep -i wireguard
```

Common issues include UDP port 51820 being blocked by a firewall, the discovery service not being reachable, and MTU mismatches causing packet drops. If you see connections establishing but traffic not flowing, try lowering the MTU:

```yaml
machine:
  network:
    kubespan:
      enabled: true
      mtu: 1380  # Lower MTU for environments with extra encapsulation
```

KubeSpan is one of those features that makes Talos Linux stand out from other Kubernetes operating systems. With a single configuration flag, you get encrypted mesh networking between all your nodes, without installing additional software or managing WireGuard configurations manually. Enable it early in your cluster setup and you will have a solid foundation for building clusters that span any network topology.
