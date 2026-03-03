# How to Set Up KubeSpan Mesh Networking in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, KubeSpan, Mesh Networking, WireGuard, Kubernetes

Description: A hands-on guide to setting up KubeSpan mesh networking in Talos Linux for seamless, encrypted connectivity across distributed clusters.

---

KubeSpan is a built-in mesh networking feature in Talos Linux that creates encrypted WireGuard tunnels between all nodes in a cluster automatically. Unlike manually configuring WireGuard point-to-point tunnels, KubeSpan handles peer discovery, key exchange, and tunnel management for you. It is designed to make multi-site and hybrid cloud Kubernetes clusters work as if all nodes were on the same network.

This post covers what KubeSpan does, how to enable and configure it, and when it makes sense for your deployment.

## What KubeSpan Does

At its core, KubeSpan creates a full mesh of WireGuard tunnels between all nodes in your Talos cluster. Every node can communicate with every other node directly over an encrypted tunnel, regardless of the underlying network topology.

This solves several real problems:

- **NAT traversal** - Nodes behind different NAT gateways can communicate directly
- **Multi-site clusters** - Nodes in different data centers or cloud regions form a single cluster
- **Hybrid cloud** - On-premises nodes connect seamlessly with cloud-based nodes
- **Encryption** - All inter-node traffic is encrypted by default, even on trusted networks
- **Simplified networking** - No need to manually configure VPN tunnels between every pair of nodes

## How KubeSpan Works

KubeSpan builds on three components:

1. **WireGuard** - Each node gets a WireGuard interface managed by KubeSpan. All node-to-node traffic flows through encrypted WireGuard tunnels.

2. **Peer Discovery** - Nodes discover each other using the Talos Discovery Service (or a local discovery mechanism). Each node announces its WireGuard public key and its reachable endpoints.

3. **Route Management** - KubeSpan automatically configures routes so that pod and service traffic between nodes goes through the WireGuard tunnels.

The result is that from a Kubernetes perspective, all nodes appear to be on the same network, even if they are physically on different continents.

## Enabling KubeSpan

KubeSpan is enabled in the machine configuration. The simplest setup is:

```yaml
# machine-config.yaml
machine:
  network:
    kubespan:
      enabled: true
```

That is it for the basic case. When KubeSpan is enabled, Talos automatically:
- Generates a WireGuard key pair for each node
- Creates a WireGuard interface
- Discovers other nodes in the cluster
- Establishes tunnels to all peers
- Routes pod and service traffic through the tunnels

## Enabling KubeSpan During Cluster Creation

The easiest way to enable KubeSpan is during initial config generation:

```bash
# Generate config with KubeSpan enabled
talosctl gen config my-cluster https://192.168.1.100:6443 \
  --config-patch '{"machine": {"network": {"kubespan": {"enabled": true}}}}'
```

Or use a patch file:

```yaml
# kubespan-patch.yaml
machine:
  network:
    kubespan:
      enabled: true
```

```bash
talosctl gen config my-cluster https://192.168.1.100:6443 \
  --config-patch @kubespan-patch.yaml
```

## Enabling KubeSpan on an Existing Cluster

You can enable KubeSpan on a running cluster by patching each node:

```bash
# Enable KubeSpan on a control plane node
talosctl patch machineconfig --nodes 192.168.1.10 \
  --patch '{"machine": {"network": {"kubespan": {"enabled": true}}}}'

# Enable on worker nodes
talosctl patch machineconfig --nodes 192.168.1.20 \
  --patch '{"machine": {"network": {"kubespan": {"enabled": true}}}}'
```

KubeSpan takes effect without a reboot. Nodes will start discovering peers and forming tunnels within seconds.

## Discovery Service

KubeSpan uses a discovery service to find other nodes in the cluster. By default, it uses the public Talos Discovery Service hosted by Sidero Labs. Nodes register their endpoints and WireGuard public keys with this service, and other nodes retrieve this information to establish tunnels.

The discovery service does not see any of your traffic - it only facilitates the exchange of endpoint information and public keys. All actual data flows directly between nodes through WireGuard.

You can control the discovery mechanism:

```yaml
cluster:
  discovery:
    enabled: true
    registries:
      kubernetes:
        disabled: false
      service:
        disabled: false
        endpoint: https://discovery.talos.dev/
```

The two discovery registries are:
- **kubernetes** - Uses Kubernetes API to store discovery information (works without external services)
- **service** - Uses the Talos Discovery Service (helps with initial bootstrap when Kubernetes is not yet running)

## KubeSpan Configuration Options

For more control over KubeSpan behavior:

```yaml
machine:
  network:
    kubespan:
      enabled: true
      # Advertise specific endpoints for this node
      advertiseKubernetesNetworks: false
      # Allow traffic from nodes in the same subnet to bypass KubeSpan
      allowDownPeerBypass: false
      # Harvest additional endpoints from peer connections
      harvestExtraEndpoints: true
```

### advertiseKubernetesNetworks

When `true`, KubeSpan advertises the Kubernetes pod and service CIDRs through the WireGuard tunnels. This ensures that pod-to-pod traffic between nodes flows through the encrypted mesh. This is generally what you want.

### allowDownPeerBypass

When `true`, if a KubeSpan peer is unreachable, traffic to that peer is allowed to flow through the regular network (unencrypted) instead of being dropped. This provides a fallback at the cost of losing encryption for that traffic path.

### harvestExtraEndpoints

When `true`, KubeSpan learns additional endpoints from active connections. This helps with NAT traversal by discovering the external addresses that peers use.

## Multi-Site Cluster Example

Here is a practical example of a cluster spanning two sites:

### Site A - On-Premises (192.168.1.0/24)

```yaml
# Control plane node at Site A
machine:
  network:
    hostname: cp-site-a
    interfaces:
      - interface: eth0
        addresses:
          - 192.168.1.10/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
    kubespan:
      enabled: true
    nameservers:
      - 8.8.8.8
cluster:
  clusterName: multi-site-cluster
  controlPlane:
    endpoint: https://192.168.1.10:6443
```

### Site B - Cloud (10.0.0.0/24)

```yaml
# Worker node at Site B
machine:
  network:
    hostname: worker-site-b
    interfaces:
      - interface: eth0
        addresses:
          - 10.0.0.20/24
        routes:
          - network: 0.0.0.0/0
            gateway: 10.0.0.1
    kubespan:
      enabled: true
    nameservers:
      - 8.8.8.8
cluster:
  clusterName: multi-site-cluster
  controlPlane:
    endpoint: https://192.168.1.10:6443
```

With KubeSpan enabled on both nodes, they discover each other through the discovery service, establish a WireGuard tunnel, and the worker node joins the cluster seamlessly. Pod traffic between the sites flows through the encrypted tunnel.

## Firewall Requirements

KubeSpan uses WireGuard, which requires UDP connectivity between nodes. The default port is 51820, but KubeSpan can also work on other ports.

Make sure your firewalls allow:
- **UDP port 51820** (or whatever port KubeSpan uses) between all nodes
- **TCP port 443** to the discovery service (if using the public Talos Discovery Service)

If nodes are behind NAT, KubeSpan handles traversal automatically using its endpoint harvesting feature.

## Verifying KubeSpan

Check KubeSpan status on a running node:

```bash
# View KubeSpan peer status
talosctl get kubespanpeerspecs --nodes 192.168.1.10

# View KubeSpan peer statuses
talosctl get kubespanpeerstatuses --nodes 192.168.1.10

# Check the KubeSpan network interface
talosctl get links --nodes 192.168.1.10

# View KubeSpan identity
talosctl get kubespanidentity --nodes 192.168.1.10
```

The peer status shows which nodes are connected, their endpoints, and the tunnel state. All peers should show as "up" with recent handshake times.

## Performance Considerations

KubeSpan adds WireGuard encryption overhead to all inter-node traffic. In practice, this overhead is small:

- **CPU** - WireGuard is highly optimized and runs in the kernel. On modern CPUs with AES-NI, the crypto overhead is negligible.
- **Latency** - Adds 1-2ms for the encapsulation/decapsulation, plus any additional latency from the tunnel path.
- **Bandwidth** - WireGuard header adds about 60-80 bytes per packet. For most workloads, this is not noticeable.

For nodes on the same local network, the overhead is minimal. For nodes across the internet, the WireGuard tunnel does not add significantly more latency than the underlying network path.

## When to Use KubeSpan

KubeSpan is a good fit when:

- You have nodes in multiple locations (data centers, cloud regions, edge sites)
- You want all inter-node traffic encrypted without managing individual VPN tunnels
- You need to connect nodes behind NAT or in different private networks
- You want simplified networking for hybrid or multi-cloud Kubernetes

KubeSpan might not be necessary when:

- All nodes are on the same trusted local network
- Your CNI already provides encryption (like Cilium with transparent encryption)
- You have existing VPN infrastructure that handles inter-site connectivity

## Troubleshooting

**Peers not discovering each other** - Check that the discovery service is reachable. Verify that both nodes are in the same cluster (same cluster ID).

```bash
# Check discovery configuration
talosctl get discoveryconfig --nodes 192.168.1.10
```

**Tunnels established but traffic not flowing** - Check firewall rules. WireGuard UDP traffic might be blocked. Also verify that routes are being created correctly.

**High latency between sites** - This is usually due to the underlying network path, not KubeSpan itself. Check the route between sites and consider using a closer transit path.

**One node cannot reach another** - Check the peer status on both sides. If one side shows the peer as "down," there might be a firewall or NAT issue preventing the WireGuard handshake.

## Disabling KubeSpan

If you need to disable KubeSpan:

```bash
talosctl patch machineconfig --nodes 192.168.1.10 \
  --patch '{"machine": {"network": {"kubespan": {"enabled": false}}}}'
```

This removes the KubeSpan interface and routes. Traffic reverts to the regular network path. Make sure your regular network can handle all inter-node traffic before disabling KubeSpan.

## Conclusion

KubeSpan is one of the most powerful networking features in Talos Linux. It turns the complex problem of multi-site encrypted connectivity into a single configuration flag. Enable it, and nodes automatically discover each other, establish WireGuard tunnels, and route traffic through the encrypted mesh. For distributed Kubernetes deployments, this eliminates entire categories of networking headaches. The setup is minimal, the performance overhead is small, and the result is a cluster that works seamlessly regardless of how the underlying networks are connected.
