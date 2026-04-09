# How to Configure Multus Networking for Rook-Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Multus, Networking, CNI, Kubernetes

Description: Learn how to configure Rook-Ceph to use Multus for dedicated storage networks, separating Ceph cluster traffic from Kubernetes pod traffic.

---

## Why Use Multus with Rook-Ceph

By default, Ceph daemons use the Kubernetes pod network for all communication. This means:
- Ceph OSD replication traffic shares bandwidth with application traffic
- Ceph internal cluster traffic (OSD to OSD) uses the same interface as API traffic
- High storage throughput can impact application network performance

Multus allows assigning multiple network interfaces to pods. With Multus, Rook-Ceph can use:
- A **public network**: For Ceph client (CSI driver) to Ceph daemon communication
- A **cluster network**: For OSD replication and internal Ceph daemon communication

## Prerequisites

```bash
# Verify Multus is installed
kubectl get pods -n kube-system | grep multus

# Verify the Multus Thick Plugin is available (required for Rook)
kubectl get network-attachment-definitions -A
```

Rook requires the Multus **thick plugin** (not the thin shim). The thick plugin is a deployment variant of Multus where the binary handles CNI calls directly rather than delegating to a thin shim on the host.

## Create NetworkAttachmentDefinitions

Create two network attachment definitions - one for the public network and one for the cluster network:

```yaml
# public-network.yaml
apiVersion: "k8s.cni.cncf.io/v1"
kind: NetworkAttachmentDefinition
metadata:
  name: rook-public-network
  namespace: rook-ceph
spec:
  config: '{
    "cniVersion": "0.3.1",
    "type": "macvlan",
    "master": "eth1",
    "mode": "bridge",
    "ipam": {
      "type": "whereabouts",
      "range": "192.168.100.0/24"
    }
  }'
```

```yaml
# cluster-network.yaml
apiVersion: "k8s.cni.cncf.io/v1"
kind: NetworkAttachmentDefinition
metadata:
  name: rook-cluster-network
  namespace: rook-ceph
spec:
  config: '{
    "cniVersion": "0.3.1",
    "type": "macvlan",
    "master": "eth2",
    "mode": "bridge",
    "ipam": {
      "type": "whereabouts",
      "range": "192.168.200.0/24"
    }
  }'
```

```bash
kubectl apply -f public-network.yaml
kubectl apply -f cluster-network.yaml
```

## Configure the CephCluster to Use Multus

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  network:
    provider: multus
    selectors:
      public: rook-ceph/rook-public-network    # For client-to-daemon traffic
      cluster: rook-ceph/rook-cluster-network  # For OSD replication traffic
    # Optional: IP family settings
    ipFamily: IPv4
    dualStack: false
```

With this configuration:
- CSI drivers communicate with Ceph MONs and OSDs over the public network
- OSD-to-OSD replication traffic uses the cluster network exclusively

## Validating the Multus Configuration

Rook provides a validation tool for Multus that runs inside the operator pod:

```bash
# Exec into the Rook operator pod
kubectl --namespace rook-ceph exec -it deploy/rook-ceph-operator -- bash

# View available options
rook multus validation run --help

# Run the validation (from inside the operator pod)
rook multus validation run \
  --public rook-ceph/rook-public-network \
  --cluster rook-ceph/rook-cluster-network
```

```bash
# After cluster is deployed, verify Ceph daemons have extra interfaces
kubectl -n rook-ceph exec -it <osd-pod> -- ip addr show
# Should show eth0 (pod network), net1 (public), net2 (cluster)
```

## Checking Ceph Network Configuration

```bash
# Verify Ceph sees the correct networks
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph config dump | grep network
```

```text
global  cluster_network  192.168.200.0/24
global  public_network   192.168.100.0/24
```

```bash
# Check OSD network addresses
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd metadata 0 | grep -E "front_addr|back_addr"
```

## Single Network vs Dual Network

If you only have one dedicated storage network:

```yaml
spec:
  network:
    provider: multus
    selectors:
      public: rook-ceph/rook-storage-network
      # Omit cluster: - cluster traffic uses the same interface as public
```

## CNI Plugin Options

Multus works with different underlying CNI plugins:

```yaml
# Using MACVLAN (most common for bare metal)
spec:
  config: '{"type": "macvlan", "master": "eth1", ...}'

# Using IPVLAN
spec:
  config: '{"type": "ipvlan", "master": "eth1", "mode": "l2", ...}'

# Using SR-IOV for maximum performance
spec:
  config: '{"type": "sriov", "resourceName": "openshift.io/mlnx_sriov_rdma", ...}'
```

## Performance Considerations

```text
Without Multus:
- All Ceph traffic shares the pod network interface
- OSD replication competes with application traffic
- Typical: pod network at 10Gbps saturated by replication

With Multus (dedicated 25/40/100Gbps storage NICs):
- Application traffic stays on pod network
- Ceph replication gets dedicated high-bandwidth interface
- Storage throughput is not limited by shared network bandwidth
```

## Summary

Multus allows Rook-Ceph to use dedicated network interfaces for storage traffic by assigning multiple NICs to Ceph daemon pods. Configure `NetworkAttachmentDefinitions` for your public and cluster networks, then reference them in the `CephCluster` spec under `network.selectors`. The public network carries client-to-daemon traffic while the cluster network carries OSD replication. Use Rook's Multus validation tool before deploying to verify the configuration is correct.
