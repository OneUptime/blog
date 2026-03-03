# How to Configure KubeSpan for Multi-Site Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, KubeSpan, Multi-Site, Hybrid Cloud, WireGuard

Description: A practical guide to configuring KubeSpan for Talos Linux clusters that span multiple sites, data centers, or cloud regions with encrypted connectivity.

---

Running a Kubernetes cluster across multiple physical sites is one of the harder problems in infrastructure. You need encrypted connectivity between nodes that might be separated by firewalls, NATs, and unreliable links. KubeSpan in Talos Linux was designed specifically for this use case, and it makes multi-site clusters remarkably straightforward. This guide covers the configuration, network planning, and operational considerations for running KubeSpan across multiple sites.

## Why Multi-Site Clusters

There are several reasons you might want a single Kubernetes cluster spanning multiple locations. Disaster recovery is one: if one site goes down, workloads can continue on the remaining sites. Low-latency access is another: deploying pods close to users in different geographic regions. Some organizations also need to keep certain data in specific locations for compliance while still managing everything as a single cluster.

KubeSpan solves the networking layer of this problem by creating encrypted WireGuard tunnels between all nodes, regardless of where they are physically located.

## Network Planning

Before configuring anything, plan your network layout. Here is a typical multi-site setup:

```
Site A (Primary Data Center)
  - Control plane nodes: 10.1.0.10, 10.1.0.11, 10.1.0.12
  - Worker nodes: 10.1.0.20, 10.1.0.21
  - Public IPs: 203.0.113.10-14

Site B (Secondary Data Center)
  - Control plane node: 10.2.0.10
  - Worker nodes: 10.2.0.20, 10.2.0.21
  - Public IPs: 198.51.100.10-12

Site C (Cloud Region)
  - Worker nodes: 172.16.0.10, 172.16.0.11
  - Public IPs: Elastic IPs from cloud provider
```

The key thing to notice is that the private IP ranges do not overlap between sites, and each site has public IPs that are reachable from the other sites.

## Generating Cluster Configuration

When creating a multi-site cluster, generate the base configuration with KubeSpan enabled:

```bash
# Generate config with KubeSpan enabled
talosctl gen config multi-site-cluster https://203.0.113.10:6443 \
  --with-kubespan \
  --config-patch='[{"op": "add", "path": "/machine/network/kubespan/advertiseKubernetesNetworks", "value": true}]'
```

The `advertiseKubernetesNetworks: true` flag is critical for multi-site clusters. Without it, pod-to-pod traffic between sites will not flow through the KubeSpan tunnels, and pods on different sites will not be able to reach each other.

## Site-Specific Configuration

Each site needs slightly different configuration. Create patch files for each site:

```yaml
# site-a-patch.yaml
machine:
  network:
    kubespan:
      enabled: true
      advertiseKubernetesNetworks: true
      mtu: 1420
      filters:
        endpoints:
          - "0.0.0.0/0"  # Advertise all endpoints
  install:
    disk: /dev/sda
```

```yaml
# site-b-patch.yaml
machine:
  network:
    kubespan:
      enabled: true
      advertiseKubernetesNetworks: true
      mtu: 1420
      filters:
        endpoints:
          - "0.0.0.0/0"
  install:
    disk: /dev/sda
```

```yaml
# site-c-cloud-patch.yaml
machine:
  network:
    kubespan:
      enabled: true
      advertiseKubernetesNetworks: true
      mtu: 1380  # Lower MTU for cloud environments with encapsulation
      filters:
        endpoints:
          - "!172.16.0.0/12"  # Do not advertise private cloud IPs
          - "0.0.0.0/0"       # Advertise public IPs
```

Notice that Site C filters out its private IPs from endpoint advertisements. This is because the private IPs in the cloud are not routable from the other sites. Only the public elastic IPs should be advertised.

## Firewall Requirements

Each site's firewall needs to allow WireGuard traffic between all sites:

```bash
# Required ports between sites:
# UDP 51820 - WireGuard (KubeSpan)
# TCP 6443 - Kubernetes API (for control plane nodes)
# TCP 50000 - Talos API
# TCP 50001 - Talos trustd

# Example iptables rules for Site A (apply on the site firewall)
# Allow WireGuard from Site B
iptables -A INPUT -p udp --dport 51820 -s 198.51.100.0/24 -j ACCEPT
# Allow WireGuard from Site C
iptables -A INPUT -p udp --dport 51820 -s <cloud-ip-range> -j ACCEPT
```

## Control Plane Distribution

For a multi-site cluster, you need to decide how to distribute control plane nodes. The recommended approach for three sites is to run one control plane node at each site (or three at the primary and one at each secondary):

```bash
# Apply controlplane config to Site A nodes
talosctl apply-config --insecure \
  --nodes 10.1.0.10,10.1.0.11,10.1.0.12 \
  --file controlplane.yaml \
  --config-patch @site-a-patch.yaml

# Apply controlplane config to Site B node
talosctl apply-config --insecure \
  --nodes 10.2.0.10 \
  --file controlplane.yaml \
  --config-patch @site-b-patch.yaml

# Apply worker config to all worker nodes
talosctl apply-config --insecure \
  --nodes 10.1.0.20,10.1.0.21 \
  --file worker.yaml \
  --config-patch @site-a-patch.yaml

talosctl apply-config --insecure \
  --nodes 10.2.0.20,10.2.0.21 \
  --file worker.yaml \
  --config-patch @site-b-patch.yaml

talosctl apply-config --insecure \
  --nodes 172.16.0.10,172.16.0.11 \
  --file worker.yaml \
  --config-patch @site-c-cloud-patch.yaml
```

## Verifying Cross-Site Connectivity

After all nodes are up, verify that KubeSpan has established connections between sites:

```bash
# Check peer status from a Site A node
talosctl get kubespanpeerstatus --nodes 10.1.0.10

# You should see peers from all three sites with state "up"
# Look for peers with endpoints from different sites

# Check that all nodes are part of the cluster
kubectl get nodes -o wide

# Verify pod-to-pod connectivity across sites
kubectl run test-site-a --image=busybox --overrides='{"spec":{"nodeName":"site-a-worker-1"}}' \
  --restart=Never -- sleep 3600

kubectl run test-site-b --image=busybox --overrides='{"spec":{"nodeName":"site-b-worker-1"}}' \
  --restart=Never -- sleep 3600

# Get the IP of the test pod on Site B
SITE_B_POD_IP=$(kubectl get pod test-site-b -o jsonpath='{.status.podIP}')

# Ping from Site A pod to Site B pod
kubectl exec test-site-a -- ping -c 3 $SITE_B_POD_IP
```

## Handling Asymmetric Links

In multi-site setups, network links between sites often have different characteristics. The link between two data centers might be low-latency and high-bandwidth, while the link to a cloud region might have higher latency. KubeSpan does not have built-in traffic prioritization, but you can use Kubernetes scheduling to place latency-sensitive workloads on the same site:

```yaml
# Use node affinity to keep latency-sensitive pods on the same site
apiVersion: apps/v1
kind: Deployment
metadata:
  name: database
spec:
  replicas: 3
  selector:
    matchLabels:
      app: database
  template:
    metadata:
      labels:
        app: database
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  - key: topology.kubernetes.io/zone
                    operator: In
                    values:
                      - site-a
      containers:
        - name: database
          image: postgres:16
```

Label your nodes with site information:

```bash
# Label nodes by site
kubectl label node site-a-cp-1 topology.kubernetes.io/zone=site-a
kubectl label node site-a-worker-1 topology.kubernetes.io/zone=site-a
kubectl label node site-b-cp-1 topology.kubernetes.io/zone=site-b
kubectl label node site-b-worker-1 topology.kubernetes.io/zone=site-b
```

## Monitoring Cross-Site Health

Set up monitoring to track the health of cross-site connections:

```bash
#!/bin/bash
# monitor-cross-site.sh
# Monitor KubeSpan connectivity between sites

SITE_A_NODE="10.1.0.10"
SITE_B_NODE="10.2.0.10"

echo "=== Site A to Site B connectivity ==="
talosctl get kubespanpeerstatus --nodes $SITE_A_NODE -o json | \
  jq '.[] | select(.spec.endpoint | contains("198.51.100")) | {peer: .spec.label, state: .spec.state, endpoint: .spec.endpoint}'

echo "=== Site B to Site A connectivity ==="
talosctl get kubespanpeerstatus --nodes $SITE_B_NODE -o json | \
  jq '.[] | select(.spec.endpoint | contains("203.0.113")) | {peer: .spec.label, state: .spec.state, endpoint: .spec.endpoint}'
```

## Dealing with Site Failures

When a site goes down, KubeSpan peers from that site will transition to the `down` state. Kubernetes will mark those nodes as `NotReady`, and workloads will be rescheduled to healthy nodes on other sites (assuming you have not pinned them with node affinity).

The `allowDownPeerBypass` setting can be useful in multi-site scenarios. If nodes at the same site can reach each other directly without KubeSpan, enabling this setting means local traffic continues to flow even if KubeSpan has issues:

```yaml
machine:
  network:
    kubespan:
      enabled: true
      advertiseKubernetesNetworks: true
      allowDownPeerBypass: true
```

Multi-site clusters with KubeSpan on Talos Linux give you a unified Kubernetes experience across geographically distributed infrastructure. The key is careful network planning, proper endpoint filtering, and thoughtful workload placement. KubeSpan handles the encrypted connectivity, and you focus on running your applications.
