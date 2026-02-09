# How to Configure Stacked vs External etcd Topology for HA Control Planes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, etcd, High Availability

Description: Compare stacked and external etcd topologies for Kubernetes high availability setups, understand the tradeoffs, and learn how to implement each approach for production control planes.

---

Kubernetes high availability clusters can use two different etcd topologies: stacked (etcd running on control plane nodes) or external (etcd on dedicated nodes). Each approach has distinct advantages, tradeoffs, and operational characteristics. Choosing the right topology impacts your cluster's resilience, maintenance complexity, and resource requirements.

This guide compares both topologies and demonstrates how to implement each for production-grade high availability.

## Understanding Stacked etcd Topology

In a stacked topology, etcd runs as a static pod on each control plane node alongside the API server, controller manager, and scheduler. This creates a tightly coupled architecture where control plane and state storage share the same nodes.

**Stacked architecture:**
```
Control Plane Node 1: [API Server] [Controller Manager] [Scheduler] [etcd]
Control Plane Node 2: [API Server] [Controller Manager] [Scheduler] [etcd]
Control Plane Node 3: [API Server] [Controller Manager] [Scheduler] [etcd]
```

**Advantages:**
- Simpler deployment and management
- Fewer nodes required (minimum 3 instead of 6)
- Lower infrastructure costs
- Easier to get started with HA

**Disadvantages:**
- Control plane failure also loses an etcd member
- More resource contention on control plane nodes
- Coupled failure domains
- More complex to scale independently

## Understanding External etcd Topology

External topology separates etcd onto dedicated nodes, creating independent control plane and state storage layers.

**External architecture:**
```
Control Plane Node 1: [API Server] [Controller Manager] [Scheduler]
Control Plane Node 2: [API Server] [Controller Manager] [Scheduler]
Control Plane Node 3: [API Server] [Controller Manager] [Scheduler]

etcd Node 1: [etcd]
etcd Node 2: [etcd]
etcd Node 3: [etcd]
```

**Advantages:**
- Independent failure domains
- Can scale etcd separately from control plane
- Better resource isolation
- Easier maintenance and upgrades
- Better suited for very large clusters

**Disadvantages:**
- More infrastructure required (minimum 6 nodes)
- Higher operational complexity
- Additional network hops between components
- Higher costs

## When to Choose Stacked Topology

Use stacked etcd when:
- Running small to medium clusters (< 1000 nodes)
- Budget or infrastructure is constrained
- Simplicity is prioritized over maximum resilience
- You have reliable underlying infrastructure
- Team has limited Kubernetes operational experience

Example use cases:
- Development and staging environments
- Edge deployments with limited hardware
- Small production clusters
- Multi-cluster deployments where individual cluster size is modest

## When to Choose External Topology

Use external etcd when:
- Running large clusters (> 1000 nodes)
- Maximum resilience is required
- You can dedicate infrastructure to etcd
- You need to scale control plane and etcd independently
- Compliance requires separation of concerns

Example use cases:
- Large production clusters
- Multi-tenant platforms
- Regulated environments
- Clusters with heavy API server load
- Organizations with dedicated database teams

## Implementing Stacked etcd Topology

Create kubeadm configuration for stacked etcd:

```yaml
# kubeadm-stacked-config.yaml
apiVersion: kubeadm.k8s.io/v1beta3
kind: ClusterConfiguration
kubernetesVersion: v1.28.0
controlPlaneEndpoint: "k8s-api-lb.example.com:6443"
networking:
  podSubnet: "10.244.0.0/16"
  serviceSubnet: "10.96.0.0/12"
# etcd section is omitted - kubeadm will set up stacked etcd automatically
apiServer:
  certSANs:
  - "k8s-api-lb.example.com"
  - "10.0.0.100"
---
apiVersion: kubeadm.k8s.io/v1beta3
kind: InitConfiguration
localAPIEndpoint:
  advertiseAddress: "10.0.1.10"
  bindPort: 6443
nodeRegistration:
  name: control-plane-1
```

Initialize the first control plane node:

```bash
# On first control plane node
sudo kubeadm init --config kubeadm-stacked-config.yaml --upload-certs

# Save the join command for additional control plane nodes
# The output will contain:
# kubeadm join k8s-api-lb.example.com:6443 --token xxx \
#   --discovery-token-ca-cert-hash sha256:yyy \
#   --control-plane --certificate-key zzz
```

Join additional control plane nodes:

```bash
# On second and third control plane nodes
sudo kubeadm join k8s-api-lb.example.com:6443 \
  --token <token> \
  --discovery-token-ca-cert-hash sha256:<hash> \
  --control-plane \
  --certificate-key <certificate-key>
```

Verify stacked etcd cluster:

```bash
# Check etcd pods on each control plane node
kubectl get pods -n kube-system -l component=etcd

# Check etcd cluster members
kubectl exec -n kube-system etcd-control-plane-1 -- etcdctl \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key \
  member list -w table
```

## Implementing External etcd Topology

First, set up the external etcd cluster (3 dedicated nodes). Follow the etcd installation steps:

```bash
# On each etcd node (etcd-1, etcd-2, etcd-3)
# Install etcd binary
ETCD_VER=v3.5.10
wget https://github.com/etcd-io/etcd/releases/download/${ETCD_VER}/etcd-${ETCD_VER}-linux-amd64.tar.gz
tar xzvf etcd-${ETCD_VER}-linux-amd64.tar.gz
sudo mv etcd-${ETCD_VER}-linux-amd64/etcd* /usr/local/bin/
```

Configure etcd on each node (adjust for node-specific values):

```yaml
# /etc/etcd/etcd.conf.yml on etcd-1
name: 'etcd-1'
data-dir: /var/lib/etcd
listen-peer-urls: 'https://10.0.2.10:2380'
listen-client-urls: 'https://10.0.2.10:2379,https://127.0.0.1:2379'
initial-advertise-peer-urls: 'https://10.0.2.10:2380'
advertise-client-urls: 'https://10.0.2.10:2379'
initial-cluster: 'etcd-1=https://10.0.2.10:2380,etcd-2=https://10.0.2.11:2380,etcd-3=https://10.0.2.12:2380'
initial-cluster-token: 'etcd-cluster-1'
initial-cluster-state: 'new'
client-transport-security:
  cert-file: /etc/etcd/etcd.pem
  key-file: /etc/etcd/etcd-key.pem
  client-cert-auth: true
  trusted-ca-file: /etc/etcd/ca.pem
peer-transport-security:
  cert-file: /etc/etcd/etcd.pem
  key-file: /etc/etcd/etcd-key.pem
  client-cert-auth: true
  trusted-ca-file: /etc/etcd/ca.pem
```

Create kubeadm configuration for external etcd:

```yaml
# kubeadm-external-etcd-config.yaml
apiVersion: kubeadm.k8s.io/v1beta3
kind: ClusterConfiguration
kubernetesVersion: v1.28.0
controlPlaneEndpoint: "k8s-api-lb.example.com:6443"
etcd:
  external:
    endpoints:
    - https://10.0.2.10:2379
    - https://10.0.2.11:2379
    - https://10.0.2.12:2379
    caFile: /etc/kubernetes/pki/etcd/ca.pem
    certFile: /etc/kubernetes/pki/etcd/client.pem
    keyFile: /etc/kubernetes/pki/etcd/client-key.pem
networking:
  podSubnet: "10.244.0.0/16"
  serviceSubnet: "10.96.0.0/12"
---
apiVersion: kubeadm.k8s.io/v1beta3
kind: InitConfiguration
localAPIEndpoint:
  advertiseAddress: "10.0.1.10"
  bindPort: 6443
```

Copy etcd certificates to control plane nodes:

```bash
# On each control plane node
sudo mkdir -p /etc/kubernetes/pki/etcd
sudo cp /path/to/etcd/ca.pem /etc/kubernetes/pki/etcd/ca.pem
sudo cp /path/to/etcd/client.pem /etc/kubernetes/pki/etcd/client.pem
sudo cp /path/to/etcd/client-key.pem /etc/kubernetes/pki/etcd/client-key.pem
```

Initialize cluster with external etcd:

```bash
sudo kubeadm init --config kubeadm-external-etcd-config.yaml --upload-certs
```

## Comparing Resource Requirements

**Stacked topology (3 nodes total):**
```
Per node:
- CPU: 4 cores (shared by control plane + etcd)
- RAM: 16GB (shared)
- Disk: 100GB SSD

Total: 3 nodes × 4 cores = 12 cores
       3 nodes × 16GB = 48GB RAM
```

**External topology (6 nodes total):**
```
Control plane nodes (3):
- CPU: 4 cores each
- RAM: 8GB each
- Disk: 50GB each

etcd nodes (3):
- CPU: 2-4 cores each
- RAM: 8GB each
- Disk: 100GB SSD each

Total: 6 nodes × 4 cores = 24 cores
       6 nodes × 8GB = 48GB RAM
```

## Migration Between Topologies

Migrating from stacked to external etcd:

```bash
# 1. Set up external etcd cluster
# 2. Backup current etcd data from stacked cluster
kubectl exec -n kube-system etcd-control-plane-1 -- etcdctl \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key \
  snapshot save /tmp/snapshot.db

# 3. Copy snapshot to external etcd
kubectl cp kube-system/etcd-control-plane-1:/tmp/snapshot.db ./snapshot.db

# 4. Restore snapshot to external etcd
etcdctl snapshot restore snapshot.db \
  --data-dir=/var/lib/etcd-new \
  --name=etcd-1 \
  --initial-cluster=etcd-1=https://10.0.2.10:2380,etcd-2=https://10.0.2.11:2380,etcd-3=https://10.0.2.12:2380 \
  --initial-advertise-peer-urls=https://10.0.2.10:2380

# 5. Reconfigure control plane to use external etcd
# Edit /etc/kubernetes/manifests/kube-apiserver.yaml
# Update etcd server URLs

# Note: This requires careful planning and may cause downtime
```

## Monitoring Both Topologies

Monitoring stacked etcd:

```bash
# Check etcd health
kubectl get pods -n kube-system -l component=etcd

# Check etcd metrics
kubectl port-forward -n kube-system etcd-control-plane-1 2379:2379
curl -k --cert /etc/kubernetes/pki/etcd/server.crt \
  --key /etc/kubernetes/pki/etcd/server.key \
  https://localhost:2379/metrics
```

Monitoring external etcd:

```bash
# Direct access to etcd nodes
ssh etcd-1
export ETCDCTL_API=3
etcdctl --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/etcd/ca.pem \
  --cert=/etc/etcd/etcd.pem \
  --key=/etc/etcd/etcd-key.pem \
  endpoint health
```

## Best Practices by Topology

**For stacked topology:**
- Use at least 3 control plane nodes (odd numbers)
- Allocate sufficient resources for combined workload
- Monitor control plane resource usage closely
- Implement robust control plane node failure recovery
- Use local SSD storage for etcd data

**For external topology:**
- Deploy etcd on dedicated hardware
- Use high-IOPS SSDs for etcd storage
- Keep network latency between etcd nodes < 10ms
- Separate etcd network from general cluster traffic if possible
- Implement independent backup strategies for etcd

## Making the Decision

Decision matrix for choosing topology:

| Factor | Stacked | External |
|--------|---------|----------|
| Cluster size | < 1000 nodes | > 1000 nodes |
| Budget | Limited | Flexible |
| Operational complexity | Lower | Higher |
| Failure isolation | Coupled | Separated |
| Scalability | Limited | High |
| Infrastructure | 3 nodes minimum | 6 nodes minimum |
| Maintenance | Simpler | More complex |

Choosing between stacked and external etcd topologies depends on your cluster size, budget, operational expertise, and resilience requirements. Stacked topology offers simplicity and lower costs for smaller clusters, while external topology provides better isolation and scalability for large, critical production environments. Evaluate your specific requirements carefully and choose the topology that best balances your operational capabilities with your availability needs.
