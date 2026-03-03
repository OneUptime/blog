# How to Set Up Cluster Peering with Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Cluster Peering, Networking, Multi-Cluster

Description: A hands-on guide to establishing network peering between Talos Linux clusters for direct pod-to-pod communication and shared services across cluster boundaries.

---

Cluster peering connects two or more Kubernetes clusters at the network level so that pods and services can communicate directly across cluster boundaries. Unlike federation, which operates at the workload scheduling layer, peering works at the network layer. Pods in cluster A can reach pods in cluster B using their pod IPs, without going through external load balancers or gateways.

For Talos Linux clusters, peering is particularly useful when you have workloads that need low-latency communication across clusters or when you want to share services without exposing them externally.

## Prerequisites

Before setting up cluster peering, you need to ensure a few things:

**Non-overlapping CIDRs**: Each cluster must use unique pod and service CIDRs. If two clusters use the same CIDR range, routing will break.

```yaml
# Cluster A - Talos machine config
cluster:
  network:
    podSubnets:
      - 10.0.0.0/16
    serviceSubnets:
      - 10.96.0.0/16

# Cluster B - Talos machine config
cluster:
  network:
    podSubnets:
      - 10.1.0.0/16
    serviceSubnets:
      - 10.97.0.0/16
```

**Network connectivity**: The nodes in both clusters need to be able to reach each other. This could be direct connectivity on the same network, a VPN, or cloud VPC peering.

**Same or compatible CNI**: Both clusters should run the same CNI plugin, or at least compatible ones. Cilium ClusterMesh requires Cilium on both sides.

## Option 1: Cilium ClusterMesh

Cilium ClusterMesh is the most mature and well-integrated option for Talos Linux cluster peering. It establishes encrypted tunnels between clusters and synchronizes service information.

### Installing Cilium with ClusterMesh Support

First, install Cilium on each cluster with unique cluster IDs and names:

```bash
# Install Cilium on Cluster A
cilium install --context cluster-a \
  --set cluster.name=cluster-a \
  --set cluster.id=1 \
  --set ipam.operator.clusterPoolIPv4PodCIDRList=10.0.0.0/16

# Install Cilium on Cluster B
cilium install --context cluster-b \
  --set cluster.name=cluster-b \
  --set cluster.id=2 \
  --set ipam.operator.clusterPoolIPv4PodCIDRList=10.1.0.0/16
```

### Enabling ClusterMesh

Enable ClusterMesh on both clusters:

```bash
# Enable on Cluster A
cilium clustermesh enable --context cluster-a --service-type LoadBalancer

# Enable on Cluster B
cilium clustermesh enable --context cluster-b --service-type LoadBalancer

# Wait for ClusterMesh API server to be ready
cilium clustermesh status --context cluster-a --wait
cilium clustermesh status --context cluster-b --wait
```

### Connecting the Clusters

Now peer the clusters:

```bash
# Connect Cluster A to Cluster B
cilium clustermesh connect \
  --context cluster-a \
  --destination-context cluster-b

# Verify the connection
cilium clustermesh status --context cluster-a
```

You should see output like:

```
Cluster Connections:
  cluster-b:
    connected: true
    nodes: 3/3
    identities: 24
    endpoints: 156
```

### Testing the Peering

Deploy a test workload and verify cross-cluster connectivity:

```bash
# Deploy a service on Cluster B
kubectl --context cluster-b create deployment hello --image=nginx
kubectl --context cluster-b expose deployment hello --port=80

# Annotate the service for global visibility
kubectl --context cluster-b annotate service hello \
  service.cilium.io/global="true"

# From Cluster A, test connectivity
kubectl --context cluster-a run test --rm -it --image=busybox -- \
  wget -qO- hello.default.svc.cluster.local
```

## Option 2: WireGuard Mesh

If you are not using Cilium or want a CNI-independent approach, you can set up WireGuard tunnels between cluster nodes. Talos Linux has built-in WireGuard support.

### Configuring WireGuard on Talos Nodes

Add WireGuard interfaces to your Talos machine configuration:

```yaml
# Cluster A control plane node
machine:
  network:
    interfaces:
      - interface: wg0
        mtu: 1420
        wireguard:
          privateKey: <cluster-a-private-key>
          listenPort: 51820
          peers:
            - publicKey: <cluster-b-node1-public-key>
              endpoint: cluster-b-node1.example.com:51820
              allowedIPs:
                - 10.1.0.0/16    # Cluster B pod CIDR
                - 10.97.0.0/16   # Cluster B service CIDR
                - 192.168.2.0/24 # Cluster B node network
              persistentKeepalive: 25
        addresses:
          - 172.16.0.1/32
```

```yaml
# Cluster B control plane node
machine:
  network:
    interfaces:
      - interface: wg0
        mtu: 1420
        wireguard:
          privateKey: <cluster-b-private-key>
          listenPort: 51820
          peers:
            - publicKey: <cluster-a-node1-public-key>
              endpoint: cluster-a-node1.example.com:51820
              allowedIPs:
                - 10.0.0.0/16    # Cluster A pod CIDR
                - 10.96.0.0/16   # Cluster A service CIDR
                - 192.168.1.0/24 # Cluster A node network
              persistentKeepalive: 25
        addresses:
          - 172.16.0.2/32
```

Apply the configuration:

```bash
# Apply to Cluster A node
talosctl apply-config --nodes 192.168.1.10 \
  --file cluster-a-cp.yaml

# Apply to Cluster B node
talosctl apply-config --nodes 192.168.2.10 \
  --file cluster-b-cp.yaml
```

### Adding Routes

After WireGuard tunnels are up, you need routing so that pods know how to reach the remote cluster's pod network. This depends on your CNI. With Cilium, you can add custom routes:

```yaml
machine:
  network:
    interfaces:
      - interface: wg0
        routes:
          - network: 10.1.0.0/16
            gateway: 172.16.0.2
          - network: 10.97.0.0/16
            gateway: 172.16.0.2
```

## Option 3: Submariner

Submariner is a CNCF project specifically designed for multi-cluster networking. It creates encrypted tunnels between clusters and handles route management automatically.

```bash
# Install subctl CLI
curl -Ls https://get.submariner.io | bash

# Deploy the Submariner broker on a management cluster
subctl deploy-broker --context management-cluster

# Join Cluster A
subctl join broker-info.subm --context cluster-a \
  --clusterid cluster-a \
  --natt=false

# Join Cluster B
subctl join broker-info.subm --context cluster-b \
  --clusterid cluster-b \
  --natt=false
```

Verify the peering:

```bash
# Check connection status
subctl show connections --context cluster-a
# GATEWAY         CLUSTER     REMOTE IP     STATUS
# talos-node-1    cluster-b   192.168.2.10  connected

# Run connectivity tests
subctl verify --context cluster-a --tocontext cluster-b
```

Submariner also supports service discovery through its Lighthouse component, so services exported in one cluster are automatically discoverable in the other.

## Firewall and Security Considerations

Cluster peering requires opening specific ports between clusters. For Talos Linux, make sure the following ports are accessible:

```yaml
# Required ports for Cilium ClusterMesh
# 2379 - ClusterMesh API server (etcd)
# 4240 - Cilium health checks
# 4244 - Hubble relay
# 8472 - VXLAN overlay (if using tunnel mode)

# Required ports for WireGuard
# 51820 - WireGuard (UDP)

# Required ports for Submariner
# 4500 - IPsec NAT-T
# 4490 - Submariner tunnel
# 8080 - Submariner metrics
```

On Talos Linux, you configure firewall rules through the machine config:

```yaml
machine:
  network:
    kubespan:
      enabled: false  # Disable if using your own tunneling
  install:
    extraKernelArgs:
      - net.ipv4.ip_forward=1
```

## Monitoring Peering Health

Set up monitoring for your peered clusters to catch connectivity issues early:

```bash
# Cilium ClusterMesh status
cilium clustermesh status --context cluster-a

# Check WireGuard tunnel status on Talos
talosctl get links --nodes 192.168.1.10 | grep wg0

# Submariner connection status
subctl show connections
```

Create alerts for tunnel disconnections and latency spikes between clusters. Cross-cluster communication adds latency, and knowing your baseline helps you detect problems before they affect users.

## Choosing the Right Approach

For Talos Linux clusters, Cilium ClusterMesh is usually the best choice. Cilium pairs well with Talos, and ClusterMesh provides the richest feature set including identity-aware security, load balancing, and service discovery. WireGuard is a good option when you need a lightweight tunnel without additional software dependencies since Talos already supports it natively. Submariner works well if you need a CNI-agnostic solution or are already using it in your organization.

Whichever approach you pick, start with two clusters, verify everything works, and then expand to more clusters. Peering complexity grows with each additional cluster, so get your automation and monitoring right early.
