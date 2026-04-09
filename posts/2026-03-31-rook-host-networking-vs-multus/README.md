# How to Configure Host Networking vs Multus for Rook-Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Networking, Multus, Host Network, Kubernetes, Performance

Description: Compare and configure host networking versus Multus CNI for Rook-Ceph to optimize network performance, isolation, and bandwidth for storage traffic.

---

## Overview

Rook-Ceph supports two primary networking models: host networking (using the node's network directly) and Multus CNI (attaching dedicated network interfaces to Ceph pods). Each has distinct trade-offs for performance, isolation, and security.

## Host Networking

Host networking allows Ceph pods to use the host's network stack directly, bypassing the Kubernetes overlay network.

### Enable Host Networking

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  network:
    provider: host
```

### Advantages of Host Networking
- Lowest latency - no overlay encapsulation overhead
- Maximum throughput - direct access to physical NICs
- Simpler configuration

### Disadvantages
- Ceph pods share the host network namespace
- Port conflicts possible with other host services
- Less network isolation between tenants

## Multus CNI Networking

Multus CNI allows attaching additional network interfaces to Ceph pods, enabling dedicated storage networks.

### Prerequisites

Install Multus and configure a NetworkAttachmentDefinition:

```yaml
apiVersion: k8s.cni.cncf.io/v1
kind: NetworkAttachmentDefinition
metadata:
  name: ceph-public-net
  namespace: rook-ceph
spec:
  config: '{
    "cniVersion": "0.3.1",
    "type": "macvlan",
    "master": "eth1",
    "mode": "bridge",
    "ipam": {
      "type": "whereabouts",
      "range": "192.168.200.0/24"
    }
  }'
```

### Configure Rook to Use Multus

```yaml
spec:
  network:
    provider: multus
    selectors:
      public: rook-ceph/ceph-public-net
      cluster: rook-ceph/ceph-cluster-net
```

This assigns separate networks for:
- `public`: client-to-OSD traffic
- `cluster`: OSD-to-OSD replication traffic

## Performance Comparison

Run benchmark tests to compare:

```bash
# Test host network throughput
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rados bench -p replicapool 30 write --no-cleanup

# After switching to Multus, re-run the same test
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rados bench -p replicapool 30 write --no-cleanup
```

## Choosing Between the Two

| Factor | Host Network | Multus |
|--------|-------------|--------|
| Latency | Lowest | Low |
| Isolation | None | High |
| Config complexity | Simple | Moderate |
| Multi-tenant | Not recommended | Yes |
| Dedicated storage NICs | Via Ceph config | Yes |

## Verification

After configuration, verify networking is active:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph -s

kubectl -n rook-ceph get pods -l app=rook-ceph-osd -o yaml | \
  grep -A5 "annotations"
```

## Summary

Host networking provides the simplest, lowest-latency option for Rook-Ceph, while Multus CNI enables network isolation and dedicated storage networks for multi-tenant or high-performance environments. Choose host networking for single-tenant bare-metal clusters and Multus when network isolation or dedicated NICs are required.
