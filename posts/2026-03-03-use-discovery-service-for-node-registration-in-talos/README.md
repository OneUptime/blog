# How to Use Discovery Service for Node Registration in Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Discovery Service, Node Registration, Cluster Management, Kubernetes

Description: Learn how the Talos Linux discovery service handles node registration and how to use it for managing cluster membership and node lifecycle.

---

Node registration is a critical part of running a Kubernetes cluster. When a new node boots, it needs to announce itself to the cluster and receive the information it needs to participate. In Talos Linux, the discovery service plays a central role in this process. This guide explains how node registration works through the discovery service and how to use it effectively.

## How Node Registration Works

When a Talos Linux node starts up with the discovery service enabled, it goes through a registration process:

1. The node reads its machine configuration, which includes the cluster ID and discovery endpoint
2. The node encrypts its identity information (IP addresses, WireGuard public key, hostname) using keys derived from the cluster secrets
3. The node sends this encrypted data to the discovery service endpoint
4. The discovery service stores the data, indexed by cluster ID
5. The node then queries the discovery service for all other members of the same cluster
6. The node receives encrypted responses and decrypts them using the same cluster-derived keys

This all happens automatically. You do not need to manually register nodes or maintain a list of cluster members.

```bash
# View the node's own discovery identity

talosctl get identities --nodes <node-ip> -o yaml

# View all confirmed cluster members the node knows about
talosctl get members --nodes <node-ip>
```

## The Registration Payload

Each node publishes several pieces of information through the discovery service:

```bash
# View detailed discovery member information
talosctl get affiliates --nodes <node-ip> -o yaml
```

The payload typically includes:
- The node's discovery identity
- Network endpoints (IP addresses and ports)
- KubeSpan public key (if KubeSpan is enabled)
- Operating system version
- Node type (control plane or worker)

All of this information is encrypted before being sent to the discovery service, so the service itself only sees opaque blobs.

## Watching Node Registration in Real Time

You can watch the discovery process as nodes join:

```bash
# Watch for new members appearing
talosctl get members --nodes <node-ip> --watch
```

This is particularly useful during cluster bootstrapping or when adding new nodes. You can see each node appear as it registers with the discovery service.

## Adding New Nodes to an Existing Cluster

When you add a new node to an existing cluster, the discovery service handles the registration automatically:

```bash
# Apply the worker configuration to a new node
talosctl apply-config --insecure \
  --nodes <new-node-ip> \
  --file worker.yaml
```

The new node will:
1. Boot with the machine configuration
2. Register with the discovery service
3. Be discovered by existing nodes
4. If KubeSpan is enabled, existing nodes will establish WireGuard tunnels to the new node
5. The node will join the Kubernetes cluster and become Ready

You can track the process:

```bash
# Watch from an existing node as the new node appears
talosctl get members --nodes <existing-node-ip> --watch

# Check Kubernetes node status
kubectl get nodes --watch
```

## Node Deregistration

When a node leaves the cluster (either intentionally or because it crashed), the discovery service handles cleanup. The service has a TTL (time-to-live) for registrations. If a node stops refreshing its registration, its entry expires after a period.

For intentional removal:

```bash
# Reset a node (this removes it from the cluster)
talosctl reset --nodes <node-to-remove-ip> --graceful

# A reset node removes itself from the discovery service
# If it does not reset cleanly, the entry expires after the TTL
```

You can verify that a node has been deregistered:

```bash
# Check discovered members - the removed node should disappear
talosctl get members --nodes <existing-node-ip>
```

## Using Discovery for Cluster Bootstrap

During initial cluster creation, the discovery service helps Talos resolve peer and control plane endpoints. This is especially useful for multi-node control planes and later troubleshooting:

```bash
# Bootstrap the first control plane node
talosctl bootstrap --nodes <first-cp-ip>

# Other control plane nodes can use discovery data
# as part of endpoint resolution
```

Without the discovery service, Talos can still operate, but endpoint resolution depends more heavily on configured endpoints and Kubernetes API availability. With discovery, nodes publish and read peer information automatically.

## Discovery Service Endpoints

The discovery service communicates over TCP port 443. By default, nodes use `https://discovery.talos.dev/`. Nodes publish their own encrypted affiliate data and read encrypted peer data from the service registry.

```bash
# Check if the node can reach the discovery service
talosctl logs controller-runtime --nodes <node-ip> | grep discovery
```

If the discovery service is unreachable, nodes can still use the Kubernetes registry if it is enabled. However, the Kubernetes registry is disabled by default, depends on Kubernetes being available, and is deprecated because it is not compatible with the default Kubernetes 1.32+ authorization configuration.

## Managing Registration in Large Clusters

For large clusters, remember that each node keeps a local view of the members it discovers. There are a few things to consider:

```bash
# Check how many members are registered
talosctl get members --nodes <node-ip> -o json | jq '.items | length'
```

Each node receives discovery information for members of its cluster and maintains that list locally. The amount of discovery data grows with the number of nodes, so validate scale expectations in your own environment.

## Registration with Multiple Registries

Talos supports two registries simultaneously: the external service registry and the Kubernetes registry. Peers from enabled registries are aggregated and merged. The Kubernetes registry is disabled by default and deprecated for Kubernetes 1.32+, but the configuration looks like this when both registries are enabled:

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

The service registry is the default source for discovery and does not depend on Kubernetes or etcd. When both registries are enabled, nodes check both registries and merge the results.

```bash
# View which registries are providing raw affiliate data
talosctl get affiliates --nodes <node-ip> --namespace=cluster-raw
```

## Troubleshooting Registration Issues

When a node fails to register or does not appear in the members list:

```bash
# Step 1: Check if discovery is enabled
talosctl get machineconfig --nodes <node-ip> -o yaml | grep -A10 discovery

# Step 2: Check controller logs for registration errors
talosctl logs controller-runtime --nodes <node-ip> | grep -i discovery

# Step 3: Check network connectivity to the discovery endpoint
talosctl logs controller-runtime --nodes <node-ip> | grep -i "discovery.talos.dev"

# Step 4: Verify whether the node appears as an affiliate
talosctl get affiliates --nodes <working-node-ip>
```

Common registration failures include:
- Incorrect cluster secrets (the node was configured with different cluster secrets)
- DNS resolution failure (the node cannot resolve the discovery service hostname)
- HTTPS connectivity issues (firewall blocking outbound HTTPS)
- Clock skew (TLS certificate validation fails due to incorrect system time)

```bash
# Check system time on the node
talosctl time --nodes <node-ip>
```

## Security Considerations

The discovery service design includes several security properties. Data is encrypted end-to-end, so the discovery service operator cannot read registration data. Nodes can only decrypt affiliate data for their own cluster because they need the cluster secrets. The cluster ID is a random value generated as part of the cluster secrets in the machine configuration.

However, be aware that the discovery service knows the cluster ID and the approximate number of nodes (based on registration count). If this metadata leaks, an attacker knows the cluster exists and its size, but nothing about the actual node addresses or identities.

For environments where even this metadata is sensitive, consider running a self-hosted discovery service or disabling the service registry. Relying only on the Kubernetes registry is not recommended for new clusters because that registry is deprecated and unavailable until Kubernetes is running.

Node registration through the Talos discovery service is one of those features that simplifies cluster operations significantly. Nodes automatically find each other, KubeSpan tunnels establish themselves, and the cluster topology adjusts dynamically. Understanding how it works helps you plan node additions, handle failures, and troubleshoot connectivity issues with confidence.
