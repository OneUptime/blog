# How to Understand KubeSpan Architecture in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, KubeSpan, Architecture, WireGuard, Networking

Description: A deep dive into the architecture of KubeSpan in Talos Linux, covering how it builds encrypted mesh networks using WireGuard and the discovery service.

---

KubeSpan is a built-in feature of Talos Linux that creates an encrypted WireGuard mesh network between all cluster nodes. Understanding how it works under the hood helps you make better configuration decisions, troubleshoot issues more effectively, and appreciate why certain design choices were made. This post breaks down the architecture of KubeSpan piece by piece.

## The High-Level Picture

At its core, KubeSpan does three things: it discovers other nodes in the cluster, it establishes WireGuard tunnels to each of those nodes, and it manages routing so that traffic between nodes flows through those tunnels. All of this happens automatically without any manual WireGuard configuration.

The system relies on several components working together: the Talos discovery service for node discovery, WireGuard for encrypted tunnels, and a set of controllers in the Talos runtime that manage the lifecycle of connections.

## Component Breakdown

### The Discovery Service

The discovery service is the starting point for KubeSpan. Before nodes can establish WireGuard tunnels, they need to know about each other. The discovery service handles this.

By default, Talos uses a public discovery service hosted at `https://discovery.talos.dev`. Each cluster registers with a unique cluster ID generated as part of the cluster secrets. Nodes periodically announce their presence and endpoints to the discovery service and retrieve information about other nodes.

```bash
# View discovered affiliates from a node

talosctl get affiliates --nodes <node-ip>

# Output shows discovered potential cluster members and their addresses
# ID                                             VERSION   HOSTNAME                       MACHINE TYPE   ADDRESSES
# 2VfX3nu67ZtZPl57IdJrU87BMjVWkSBJiL9ulP9TCnF    2         talos-default-controlplane-2   controlplane   ["172.20.0.3","fd83:b1f7:fcb5:2802:986b:7eff:fec5:889d"]
```

The discovery data is encrypted end-to-end. The discovery service itself cannot read the node information because it does not have the cluster's encryption key. This means even if someone compromised the discovery service, they could not read the decrypted cluster topology.

### WireGuard Integration

WireGuard is the transport layer for KubeSpan. Each node generates a WireGuard keypair when KubeSpan is enabled. The public key is shared through the discovery service, and the private key never leaves the node.

```bash
# View the KubeSpan identity (includes the WireGuard public key)
talosctl get kubespanidentities --nodes <node-ip> -o yaml

# Output:
# spec:
#   address: fd83:b1f7:fcb5:2802:8c13:71ff:feaf:7c94/128
#   subnet: fd83:b1f7:fcb5:2802::/64
#   publicKey: <base64-encoded-public-key>
```

Talos creates a WireGuard network interface called `kubespan` on each node. This interface has a unique IPv6 address from a cluster-specific ULA prefix used for KubeSpan:

```bash
# View the KubeSpan interface and its address
talosctl get addresses --nodes <node-ip> | grep kubespan

# The KubeSpan address is shown on the kubespan interface
```

### The Controller Runtime

The intelligence behind KubeSpan lives in several controllers within the Talos runtime. These controllers are responsible for different parts of the lifecycle.

The KubeSpan Identity Controller generates and manages the WireGuard identity for the node. It creates the keypair and publishes the identity resource that other components use.

The KubeSpan Peer Spec Controller watches discovered affiliates and creates WireGuard peer specifications. The KubeSpan Manager Controller manages the WireGuard interface from those peer specifications. When a new node is discovered, it is added as a WireGuard peer. When a node disappears, the peer specification is removed.

The KubeSpan Endpoint Controller harvests additional working endpoints from peer status when endpoint harvesting is enabled. If a peer has multiple endpoints (for example, both a public and private IP), Talos cycles through available endpoints until it finds one that works.

```bash
# View controller logs related to KubeSpan
talosctl logs controller-runtime --nodes <node-ip> | grep -i kubespan
```

## The Connection Lifecycle

When a node boots with KubeSpan enabled, the following sequence happens:

1. The node generates or loads its WireGuard keypair
2. The node registers with the discovery service, advertising its WireGuard public key and network endpoints
3. The node queries the discovery service for other cluster members
4. For each discovered member, the node configures a WireGuard peer
5. WireGuard establishes the encrypted tunnel
6. Routes are added to direct cluster traffic through the KubeSpan interface

This process is continuous. The node periodically updates its registration and queries for changes. When nodes join or leave, the mesh adjusts automatically.

## Routing Architecture

KubeSpan manages routes on each node to direct traffic through the WireGuard mesh. The routing depends on the `advertiseKubernetesNetworks` setting.

When `advertiseKubernetesNetworks` is `false` (the default), KubeSpan only routes traffic destined for other nodes' KubeSpan addresses through the mesh. Regular pod-to-pod traffic uses the CNI's normal routing.

When `advertiseKubernetesNetworks` is `true`, KubeSpan advertises Kubernetes pod networks from the node, and Talos can route inter-node pod traffic through the WireGuard tunnels instead of relying on the CNI's node-to-node encapsulation:

```bash
# Check routes related to KubeSpan
talosctl get routes --nodes <node-ip> | grep kubespan
```

The routing table on a node with KubeSpan looks something like this (conceptually):

```text
# Node-to-node traffic via KubeSpan
10.244.1.0/24 via kubespan (if advertiseKubernetesNetworks is true)
10.244.2.0/24 via kubespan (if advertiseKubernetesNetworks is true)

# KubeSpan peer addresses
fd7a:115c:a1e0::/48 via kubespan  # KubeSpan address space
```

## Peer State Machine

Each KubeSpan peer status uses one of three states:

```text
unknown -> up -> down
```

The peer status resource tracks the current state:

```bash
# View peer states
talosctl get kubespanpeerstatuses --nodes <node-ip>

# Detailed peer status
talosctl get kubespanpeerstatuses --nodes <node-ip> -o yaml
```

A peer is considered `up` when there is a recent WireGuard handshake from the peer. A peer is `down` when there is no recent handshake. The controller then cycles through alternative endpoints if available, and peer status information is updated every 30 seconds.

## Endpoint Selection

Nodes can have multiple network endpoints. For example, a node in a cloud environment might have a private IP (10.0.1.5) and a public IP (203.0.113.10). KubeSpan advertises all available endpoints through the discovery service.

When establishing a connection, Talos cycles through available endpoints. If one endpoint fails (for example, the private IP is not routable from the connecting node), it can move to another one. This is how KubeSpan supports mixed environments where some nodes can reach each other directly and others need to use public endpoints.

```yaml
# You can filter which endpoints are advertised
machine:
  network:
    kubespan:
      enabled: true
      filters:
        endpoints:
          - "0.0.0.0/0"         # Advertise IPv4 addresses
          - "!10.0.0.0/8"      # Do not advertise private IPs
          - "::/0"              # Advertise IPv6 addresses
```

## Security Model

KubeSpan's security model is built on several layers. WireGuard provides authenticated encryption using Curve25519 for key exchange, ChaCha20-Poly1305 for authenticated data encryption, and BLAKE2s for hashing. The discovery service data is encrypted end-to-end using cluster discovery secrets, so the discovery service operator cannot see peer information. Node identity is tied to cluster discovery data, so only nodes that share the cluster discovery credentials can publish and consume the KubeSpan information needed to establish tunnels.

The trust chain looks like this:

```text
Cluster discovery secrets -> KubeSpan Identity -> WireGuard Tunnel
```

A node cannot participate in the KubeSpan mesh without the cluster discovery credentials and KubeSpan peer data. This is fundamentally different from manually setting up WireGuard, where any node with the right keys can connect.

## Performance Considerations

WireGuard is known for high performance, but there are still things to consider. The MTU of the KubeSpan interface defaults to 1420, which is the WireGuard default. This accounts for the WireGuard encapsulation overhead. If your underlying network already uses encapsulation (VXLAN, GRE, or another tunnel), you may need to lower the MTU further.

The encryption overhead of WireGuard is minimal on modern hardware. On most systems, you will see less than 5% throughput reduction compared to unencrypted traffic. Latency adds roughly 0.1-0.5ms per hop due to the encryption and decryption processing.

```yaml
# Adjust MTU if needed
machine:
  network:
    kubespan:
      enabled: true
      mtu: 1380  # Adjusted for additional encapsulation
```

## How KubeSpan Differs from Other Solutions

Compared to setting up WireGuard manually, KubeSpan automates peer discovery, key distribution, and endpoint management. Compared to VPN solutions like Tailscale or ZeroTier, KubeSpan is tightly integrated with Kubernetes and does not require an external service (beyond the lightweight discovery endpoint). Compared to CNI-level encryption (like Cilium's WireGuard mode), KubeSpan operates at the node level and works with any CNI.

Understanding KubeSpan's architecture helps you troubleshoot issues, plan your network topology, and make informed decisions about when and how to use this feature. It is a well-designed system that solves a real problem, and knowing how the pieces fit together will make you more effective at operating Talos Linux clusters.
