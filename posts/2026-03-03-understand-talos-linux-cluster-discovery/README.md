# How to Understand Talos Linux Cluster Discovery

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Cluster Discovery, Kubernetes, Networking, Distributed Systems

Description: Learn how Talos Linux nodes discover each other and form clusters using built-in discovery mechanisms.

---

When you bring up a Talos Linux cluster, the nodes need to find each other. A control plane node needs to know about other control plane nodes for etcd clustering. Worker nodes need to find the control plane to register with the Kubernetes API server. And all nodes benefit from knowing which peers are part of the same cluster.

Talos Linux includes a built-in cluster discovery mechanism that handles this automatically. Understanding how it works helps you troubleshoot cluster formation issues and configure discovery for different network environments.

## The Problem Discovery Solves

In a traditional Kubernetes deployment, you manually configure each node with the addresses of the control plane. You might hard-code IP addresses in a kubeadm join command or configure a load balancer that sits in front of the control plane nodes.

Talos takes a different approach. While you still need to provide the control plane endpoint in the machine configuration, Talos adds a peer discovery layer that lets nodes find and communicate with each other dynamically. This is particularly useful for:

- Nodes discovering new cluster members without configuration changes
- Monitoring cluster membership
- Building network overlays that need to know about all peers
- Facilitating KubeSpan (Talos's built-in WireGuard mesh networking)

## Discovery Backends

Talos supports two discovery backends that can be used independently or together.

### Discovery Service (SaaS)

The default discovery backend uses a centralized discovery service hosted by Sidero Labs at https://discovery.talos.dev. Nodes register with this service using a cluster-specific identifier, and the service helps them find each other.

The discovery service does not receive any sensitive information. It only sees encrypted endpoint data and cluster IDs. The actual connection details are encrypted with keys derived from the cluster's trust bundle, so even the discovery service operator cannot read them.

```yaml
# Machine config: using the discovery service (default)
cluster:
  discovery:
    enabled: true
    registries:
      service:
        endpoint: https://discovery.talos.dev
```

### Kubernetes Registry

The second backend uses Kubernetes itself as a discovery registry. Nodes register their endpoints as annotations on their Kubernetes Node objects. Other nodes read these annotations to discover peers.

This approach keeps all discovery data within your cluster and does not require external connectivity. However, it only works after Kubernetes is running, so it cannot help with initial cluster formation.

```yaml
# Machine config: using Kubernetes-based discovery
cluster:
  discovery:
    enabled: true
    registries:
      kubernetes:
        disabled: false
      service:
        disabled: true  # Disable the SaaS service if not needed
```

## How Discovery Works

The discovery process follows these steps:

1. A node boots and reads its machine configuration
2. The node generates a discovery identity based on the cluster's trust bundle
3. The node registers itself with the configured discovery backend(s)
4. The node queries the backend for other members with the same cluster identity
5. Discovered members are verified using the cluster's PKI
6. The node maintains a list of known peers and continuously updates it

```bash
# View discovered cluster members
talosctl -n 10.0.0.11 get members

# Get detailed member information
talosctl -n 10.0.0.11 get members -o yaml

# Watch for member changes in real time
talosctl -n 10.0.0.11 get members --watch
```

The output of `get members` shows all nodes that the current node has discovered, including their addresses, roles (control plane or worker), and hostname.

## The Cluster Identity

Each Talos cluster has a unique identity derived from its trust bundle (certificates and tokens). When a node registers with a discovery backend, it uses this identity to associate itself with the correct cluster.

This means that even if multiple Talos clusters use the same discovery service, they will not see each other's nodes. The cluster identity acts as a namespace that separates clusters.

```bash
# View the cluster identity
talosctl -n 10.0.0.11 get clusterid

# The cluster ID is derived from the cluster CA certificate
# It is the same for all nodes in the cluster
```

## Discovery and KubeSpan

KubeSpan is Talos's built-in mesh networking feature based on WireGuard. It creates encrypted tunnels between all nodes in the cluster, enabling direct communication even across NAT boundaries and different networks.

Discovery is essential for KubeSpan because it provides the information needed to set up WireGuard peers. Each node advertises its WireGuard public key and endpoints through the discovery mechanism, and other nodes use this information to establish tunnels.

```yaml
# Machine config: enable KubeSpan with discovery
machine:
  network:
    kubespan:
      enabled: true
      # KubeSpan automatically uses discovered peers
      # to set up WireGuard tunnels

cluster:
  discovery:
    enabled: true
    registries:
      service:
        endpoint: https://discovery.talos.dev
      kubernetes:
        disabled: false
```

```bash
# View KubeSpan peer status
talosctl -n 10.0.0.11 get kubespanpeerspecs
talosctl -n 10.0.0.11 get kubespanpeerstatuses

# Check WireGuard interface
talosctl -n 10.0.0.11 get links kubespan
```

## Discovery in Air-Gapped Environments

If your cluster runs in an air-gapped environment without internet access, you cannot use the Sidero Labs discovery service. You have several options.

### Self-Hosted Discovery Service

You can run your own instance of the discovery service inside your network.

```bash
# Run the discovery service container
docker run -d \
  --name talos-discovery \
  -p 443:443 \
  ghcr.io/siderolabs/discovery-service:latest
```

```yaml
# Point your cluster to the self-hosted service
cluster:
  discovery:
    enabled: true
    registries:
      service:
        endpoint: https://discovery.internal.example.com
```

### Kubernetes-Only Discovery

In an air-gapped environment, you can disable the external service and rely solely on Kubernetes-based discovery. The trade-off is that discovery will not work until Kubernetes is running.

```yaml
# Air-gapped discovery configuration
cluster:
  discovery:
    enabled: true
    registries:
      service:
        disabled: true
      kubernetes:
        disabled: false
```

### Static Configuration

For small clusters or environments where dynamic discovery is not needed, you can configure node endpoints statically in the machine configuration.

```yaml
# Static endpoint configuration (no discovery needed)
cluster:
  controlPlane:
    endpoint: https://10.0.0.10:6443
  # Specific node addresses are known ahead of time
```

## Troubleshooting Discovery Issues

When nodes cannot discover each other, here is how to diagnose the problem.

### Check Discovery Status

```bash
# Verify discovery is enabled
talosctl -n 10.0.0.11 get machineconfig -o yaml | grep -A10 "discovery"

# List discovered members
talosctl -n 10.0.0.11 get members

# If no members are found, check the discovery service connectivity
talosctl -n 10.0.0.11 logs machined | grep -i "discovery"
```

### Verify Cluster Identity

All nodes in a cluster must share the same cluster identity. If they do not, they will not discover each other.

```bash
# Compare cluster IDs across nodes
talosctl -n 10.0.0.11 get clusterid
talosctl -n 10.0.0.12 get clusterid
# These should match
```

### Check Network Connectivity

Nodes need network access to the discovery service (or to each other for Kubernetes-based discovery).

```bash
# Check if the discovery service is reachable
talosctl -n 10.0.0.11 netstat | grep discovery

# Check for DNS resolution issues
talosctl -n 10.0.0.11 get resolvers
```

### Review Certificates

Discovery uses the cluster's PKI for verification. Expired or mismatched certificates will cause discovery failures.

```bash
# Check certificate status
talosctl -n 10.0.0.11 get certificate -o yaml
```

## Discovery Security

The discovery mechanism is designed with security in mind.

Node identities are verified using the cluster's CA. A rogue node cannot join the discovery group without a valid certificate signed by the cluster CA.

Data sent to the external discovery service is encrypted. The service sees only opaque blobs that it cannot decrypt. Only nodes with the cluster's trust bundle can decrypt the discovery data.

The Kubernetes-based registry stores data as annotations on Node objects, which are protected by Kubernetes RBAC.

## Conclusion

Cluster discovery in Talos Linux automates the process of nodes finding each other. The dual-backend approach - with both an external service and Kubernetes-based registry - provides flexibility for different deployment scenarios. For internet-connected clusters, the default Sidero Labs discovery service works out of the box. For air-gapped environments, you can self-host the service or rely on Kubernetes-only discovery. Combined with KubeSpan, discovery enables automatic mesh networking across complex network topologies. Understanding how discovery works helps you configure it correctly for your environment and troubleshoot issues when nodes fail to find each other.
