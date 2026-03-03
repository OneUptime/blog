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

By default, Talos uses a public discovery service hosted at `https://discovery.talos.dev`. Each cluster registers with a unique cluster ID derived from the cluster's secrets. Nodes periodically announce their presence and endpoints to the discovery service and retrieve information about other nodes.

```bash
# View discovery members from a node
talosctl get discoveredmembers --nodes <node-ip>

# Output shows each cluster member and their endpoints
# NODE           NAMESPACE   TYPE               ID          VERSION   ADDRESSES
# 192.168.1.10   cluster     DiscoveredMember   <id>        1         ["192.168.1.20:51820"]
```

The discovery data is encrypted end-to-end. The discovery service itself cannot read the endpoint information because it is encrypted with keys derived from the cluster's trust domain. This means even if someone compromised the discovery service, they could not learn your cluster's topology.

### WireGuard Integration

WireGuard is the transport layer for KubeSpan. Each node generates a WireGuard keypair when KubeSpan is enabled. The public key is shared through the discovery service, and the private key never leaves the node.

```bash
# View the KubeSpan identity (includes the WireGuard public key)
talosctl get kubespanidentity --nodes <node-ip>

# Output:
# NODE           NAMESPACE   TYPE               ID          VERSION   PUBLIC KEY
# 192.168.1.10   network     KubeSpanIdentity   kubespan    1         <base64-encoded-public-key>
```

Talos creates a WireGuard network interface called `kubespan` on each node. This interface has an IP address from a special subnet used only for KubeSpan:

```bash
# View the KubeSpan interface and its address
talosctl get addresses --nodes <node-ip> | grep kubespan

# The KubeSpan address is derived from the node's WireGuard public key
```

### The Controller Runtime

The intelligence behind KubeSpan lives in several controllers within the Talos runtime. These controllers are responsible for different parts of the lifecycle.

The KubeSpan Identity Controller generates and manages the WireGuard identity for the node. It creates the keypair and publishes the identity resource that other components use.

The KubeSpan Manager Controller is the main orchestrator. It watches for discovered members, creates WireGuard peer configurations, and manages the WireGuard interface. When a new node is discovered, this controller adds it as a WireGuard peer. When a node disappears, it removes the peer.

The KubeSpan Endpoint Controller manages endpoint resolution. It determines which IP addresses and ports to use when connecting to a peer. If a peer has multiple endpoints (for example, both a public and private IP), this controller handles endpoint selection and rotation.

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

When `advertiseKubernetesNetworks` is `true`, KubeSpan also adds routes for the pod CIDR and service CIDR. This means all inter-node pod traffic goes through the WireGuard tunnels:

```bash
# Check routes related to KubeSpan
talosctl get routes --nodes <node-ip> | grep kubespan
```

The routing table on a node with KubeSpan looks something like this (conceptually):

```
# Node-to-node traffic via KubeSpan
10.244.1.0/24 via kubespan (if advertiseKubernetesNetworks is true)
10.244.2.0/24 via kubespan (if advertiseKubernetesNetworks is true)

# KubeSpan peer addresses
fd7a:115c:a1e0::/48 via kubespan  # KubeSpan address space
```

## Peer State Machine

Each KubeSpan peer goes through several states:

```
Unknown -> Establishing -> Up -> (Down -> Establishing -> Up)
```

The peer status resource tracks the current state:

```bash
# View peer states
talosctl get kubespanpeerstatus --nodes <node-ip>

# Detailed peer status
talosctl get kubespanpeerstatus --nodes <node-ip> -o yaml
```

A peer is considered `up` when WireGuard has completed its handshake and traffic can flow. A peer transitions to `down` when no handshake has been received within a timeout period (typically two minutes). The controller then retries connection using alternative endpoints if available.

## Endpoint Selection

Nodes can have multiple network endpoints. For example, a node in a cloud environment might have a private IP (10.0.1.5) and a public IP (203.0.113.10). KubeSpan advertises all available endpoints through the discovery service.

When establishing a connection, the endpoint controller tries each endpoint in order. If the first endpoint fails (for example, the private IP is not routable from the connecting node), it moves to the next one. This is how KubeSpan supports mixed environments where some nodes can reach each other directly and others need to use public endpoints.

```yaml
# You can filter which endpoints are advertised
machine:
  network:
    kubespan:
      enabled: true
      filters:
        endpoints:
          - "!10.0.0.0/8"      # Do not advertise private IPs
          - "0.0.0.0/0"         # Advertise everything else
```

## Security Model

KubeSpan's security model is built on several layers. WireGuard provides authenticated encryption using Curve25519 for key exchange, ChaCha20Poly1305 for data encryption, and BLAKE2s for hashing. The discovery service data is encrypted end-to-end using the cluster's trust domain keys, so the discovery service operator cannot see peer information. Node identity is tied to the cluster membership, so only nodes that are part of the cluster can establish KubeSpan tunnels.

The trust chain looks like this:

```
Cluster CA -> Node Certificate -> KubeSpan Identity -> WireGuard Tunnel
```

A node cannot participate in the KubeSpan mesh without being a valid member of the cluster. This is fundamentally different from manually setting up WireGuard, where any node with the right keys can connect.

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
