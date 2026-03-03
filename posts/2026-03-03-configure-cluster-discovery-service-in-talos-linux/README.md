# How to Configure Cluster Discovery Service in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Cluster Discovery, Machine Configuration, Kubernetes, Networking

Description: A complete guide to configuring the cluster discovery service in Talos Linux for automatic node detection and cluster membership management.

---

Cluster discovery is how Talos Linux nodes find each other and form a cluster. When a node boots, it needs to know about other nodes in the cluster, their addresses, and their roles. Talos provides a built-in discovery service that handles this automatically, but you can configure how it works, where it runs, and what information it shares. Proper discovery configuration is essential for clusters that span multiple networks, use VPNs, or have strict security requirements.

This guide covers the cluster discovery service in Talos Linux, its configuration options, and how to tailor it for different network environments.

## How Discovery Works

Talos uses two discovery backends: the Talos Discovery Service (a cloud-hosted registry) and Kubernetes-based discovery (using cluster member information from the API server). Nodes register themselves with one or both backends and discover other cluster members through them.

The discovery service lives under `cluster.discovery` in the machine configuration:

```yaml
# Basic discovery configuration
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

By default, both registries are enabled. The Kubernetes registry discovers members through the Kubernetes API, and the service registry uses the Talos cloud discovery endpoint.

## The Talos Discovery Service

The external discovery service at `discovery.talos.dev` is run by Sidero Labs. Nodes send encrypted membership information to this service, and other nodes in the same cluster retrieve it. The data is encrypted with the cluster's encryption key, so the discovery service itself cannot read the membership details.

```yaml
# Use the default Talos Discovery Service
cluster:
  discovery:
    enabled: true
    registries:
      service:
        disabled: false
        endpoint: https://discovery.talos.dev/
```

This works well for most deployments. The service is lightweight and just acts as a rendezvous point - it does not store any sensitive cluster information in a readable form.

## Self-Hosting the Discovery Service

If you prefer not to use the cloud-hosted service (for compliance, air-gapped environments, or latency reasons), you can run your own discovery service:

```bash
# Run the discovery service as a Docker container
docker run -d \
  --name talos-discovery \
  -p 443:443 \
  ghcr.io/siderolabs/discovery-service:latest
```

Then point your nodes to your self-hosted instance:

```yaml
# Use a self-hosted discovery service
cluster:
  discovery:
    enabled: true
    registries:
      service:
        disabled: false
        endpoint: https://discovery.internal.company.com/
```

The self-hosted discovery service is stateless and can be run behind a load balancer for high availability.

## Kubernetes-Based Discovery

The Kubernetes discovery registry uses the Kubernetes API server to discover cluster members. This is useful as a fallback when the external discovery service is unreachable:

```yaml
# Enable Kubernetes-based discovery
cluster:
  discovery:
    enabled: true
    registries:
      kubernetes:
        disabled: false
```

With Kubernetes discovery, nodes register themselves as Kubernetes resources that other nodes can query. This only works once the control plane is up, so it cannot be used for initial cluster formation. It serves as a secondary discovery mechanism that helps nodes find each other after the cluster is already running.

## Disabling External Discovery

For air-gapped or highly secure environments, you might want to disable the external discovery service entirely and rely only on Kubernetes discovery:

```yaml
# Disable external discovery, use Kubernetes only
cluster:
  discovery:
    enabled: true
    registries:
      kubernetes:
        disabled: false
      service:
        disabled: true
```

In this configuration, initial cluster formation depends on the nodes being able to reach the control plane endpoint directly. The discovery service is not needed for bootstrapping if you provide the control plane endpoint in the machine configuration.

## Disabling Discovery Entirely

You can disable discovery completely, though this is not recommended for most setups:

```yaml
# Disable all discovery (not recommended)
cluster:
  discovery:
    enabled: false
```

Without discovery, nodes will not automatically detect new cluster members. You would need to manage cluster membership entirely through static configuration, which is error-prone and does not scale well.

## Discovery and Cluster ID

The discovery service uses a cluster ID to group nodes. This ID is derived from the cluster secret and is unique per cluster. Nodes from different clusters cannot discover each other even if they use the same discovery endpoint:

```yaml
# The cluster ID is derived from these values (auto-generated)
cluster:
  id: <auto-generated-cluster-id>
  secret: <auto-generated-cluster-secret>
```

You do not typically need to set these manually. They are generated when you run `talosctl gen config` and are included in both control plane and worker configurations.

## Viewing Discovery Status

You can check the discovery status on any node:

```bash
# View discovered members
talosctl get members --nodes 192.168.1.100

# Output shows all discovered cluster members
# NODE            NAMESPACE   TYPE     ID                    VERSION   HOSTNAME     MACHINE TYPE    OS               ADDRESSES
# 192.168.1.100   cluster     Member   AbCdEf...             1         cp-01        controlplane    Talos (v1.6.0)   ["192.168.1.100"]
# 192.168.1.101   cluster     Member   GhIjKl...             1         cp-02        controlplane    Talos (v1.6.0)   ["192.168.1.101"]
# 192.168.1.110   cluster     Member   MnOpQr...             1         worker-01    worker          Talos (v1.6.0)   ["192.168.1.110"]
```

This command shows all members that have been discovered through either backend. Each member includes its hostname, machine type, OS version, and addresses.

## Discovery Across Network Boundaries

If your cluster spans multiple networks or subnets, discovery configuration becomes more important. Nodes need to be able to reach the discovery endpoint and the advertised addresses of other nodes:

```yaml
# Discovery configuration for multi-network clusters
cluster:
  discovery:
    enabled: true
    registries:
      service:
        disabled: false
        endpoint: https://discovery.talos.dev/
      kubernetes:
        disabled: false
```

Make sure that the addresses nodes advertise are reachable from other nodes. If nodes are behind NAT, you might need to configure the node's network settings to advertise the correct external address.

## Troubleshooting Discovery Issues

If nodes are not discovering each other, check these things:

```bash
# Check if discovery is enabled in the config
talosctl get machineconfig --nodes 192.168.1.100 -o yaml | grep -A 10 discovery

# Check network connectivity to the discovery service
talosctl dmesg --nodes 192.168.1.100 | grep -i discovery

# Verify the cluster ID matches between nodes
talosctl get clusterid --nodes 192.168.1.100
talosctl get clusterid --nodes 192.168.1.110
```

Common issues include:
- Firewall rules blocking access to the discovery endpoint (port 443)
- Proxy settings not including the discovery endpoint in NO_PROXY
- Mismatched cluster IDs between nodes (usually from generating configs separately)
- DNS resolution failures for the discovery endpoint

## Discovery and Security

The Talos discovery service encrypts all membership data with the cluster's encryption key. This means that even if someone intercepts the data or gains access to the discovery service, they cannot read the cluster membership information.

However, if you are concerned about metadata (like the fact that your cluster exists and how many nodes it has), self-hosting the discovery service gives you full control:

```yaml
# Self-hosted discovery for maximum security
cluster:
  discovery:
    enabled: true
    registries:
      service:
        disabled: false
        endpoint: https://discovery.private-network.internal/
      kubernetes:
        disabled: false
```

## Best Practices

Keep both discovery backends enabled for redundancy. If the external service goes down, Kubernetes discovery takes over. If the API server is having issues, the external service keeps working. For production clusters, consider self-hosting the discovery service to reduce external dependencies. Monitor discovery health as part of your cluster monitoring setup - if nodes stop appearing in the member list, something is wrong with discovery or network connectivity.

Cluster discovery is one of those features that works silently in the background when configured correctly, but causes real headaches when it breaks. Get it right during initial setup, and it will serve you well throughout the cluster's lifecycle.
