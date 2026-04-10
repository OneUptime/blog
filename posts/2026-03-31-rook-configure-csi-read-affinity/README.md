# How to Configure CSI Read Affinity in Rook-Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CSI, Read Affinity, Kubernetes, Storage, Performance

Description: Configure CSI read affinity in Rook-Ceph so that RBD and CephFS reads prefer OSDs on the same node as the workload, reducing network overhead.

---

## What Is CSI Read Affinity

By default, Ceph serves reads from the primary OSD regardless of where the client pod is running. CSI read affinity is a feature that instructs the Ceph CSI driver to prefer reading from a replica OSD that is local to the Kubernetes node running the workload. This reduces cross-node network traffic for read-heavy workloads without affecting data durability or write behavior.

Read affinity is configured at the CSI driver level through the `CephCluster` custom resource, and the Rook operator propagates the setting to the CSI driver.

## Prerequisites

- Rook-Ceph v1.11 or later
- Ceph Pacific (v16) or later
- Linux kernel 5.8 or higher on all nodes (required for the `read_from_replica` and `crush_location` kernel RBD options)
- The Ceph RBD or CephFS CSI driver deployed by Rook

## Enabling Read Affinity via the CephCluster CR

Read affinity is configured in the `CephCluster` custom resource under `spec.csi.readAffinity`. The Rook operator reads this setting and propagates it to the `rook-ceph-csi-config` ConfigMap automatically. Do not edit the `rook-ceph-csi-config` ConfigMap directly, as the operator manages it and will overwrite manual changes.

Add the `readAffinity` section to your `CephCluster` CR:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  csi:
    readAffinity:
      enabled: true
      crushLocationLabels:
        - topology.kubernetes.io/zone
        - kubernetes.io/hostname
```

Apply the change:

```bash
kubectl apply -f cephcluster.yaml
```

Or patch an existing cluster:

```bash
kubectl patch cephclusters.ceph.rook.io rook-ceph -n rook-ceph --type=merge \
  -p '{"spec":{"csi":{"readAffinity":{"enabled":true,"crushLocationLabels":["topology.kubernetes.io/zone","kubernetes.io/hostname"]}}}}'
```

## Understanding crushLocationLabels

The `crushLocationLabels` array maps Kubernetes node labels to CRUSH topology keys. When a CSI node plugin starts on a node, it reads these labels and passes them as CRUSH location hints to the Ceph client. Ceph then prefers replicas in the same CRUSH bucket.

Common label mappings:

| Kubernetes Label | CRUSH Key |
|---|---|
| `topology.kubernetes.io/zone` | zone |
| `topology.kubernetes.io/region` | region |
| `kubernetes.io/hostname` | host |

Ensure your nodes have the correct labels applied:

```bash
kubectl label node worker-01 topology.kubernetes.io/zone=zone-a
kubectl label node worker-02 topology.kubernetes.io/zone=zone-b
```

## Applying the Configuration

After updating the `CephCluster` CR, the Rook operator reconciles the change and updates the CSI configuration. If the CSI pods do not pick up the change automatically, restart the Rook operator pod to trigger CSI pod recreation:

```bash
kubectl -n rook-ceph delete pod -l app=rook-ceph-operator
```

Wait for the CSI daemonsets to be recreated:

```bash
kubectl -n rook-ceph rollout status daemonset/csi-rbdplugin
```

## Verifying Read Affinity Is Active

Check the CSI node plugin logs for read affinity messages:

```bash
kubectl -n rook-ceph logs daemonset/csi-rbdplugin -c csi-rbdplugin | grep -i "affinity"
```

You can also run a benchmark pod on a specific node and use `ceph tell` to observe which OSD services the reads, confirming they come from a local replica.

## Limitations and Considerations

- Read affinity only applies when a local replica exists. If the primary is local, reads are already optimal.
- Read affinity does not apply to erasure-coded pools. EC pools require reading from multiple OSDs to reconstruct data, so local-replica optimization is not applicable.
- Enabling read affinity adds a small latency overhead for OSD selection during the read path. For write-heavy workloads the benefit is negligible.

## Summary

CSI read affinity in Rook-Ceph routes reads to the OSD closest to the consuming pod by mapping Kubernetes node topology labels to Ceph CRUSH locations. Configure it through the `CephCluster` CR at `spec.csi.readAffinity` and verify that node topology labels are present. This is a low-risk optimization that meaningfully reduces cross-node read traffic in multi-zone or large single-site clusters.
