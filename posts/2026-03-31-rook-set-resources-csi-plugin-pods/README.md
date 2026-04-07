# How to Set Resources for Rook CSI Plugin Pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, CSI, Plugin, Resource, Pod

Description: Configure resource requests and limits for Rook CSI plugin pods (csi-rbdplugin and csi-cephfsplugin) to ensure reliable volume mount/unmount operations on all cluster nodes.

---

## Overview

Rook deploys CSI plugin pods as DaemonSets (`csi-rbdplugin` and `csi-cephfsplugin`) on every Kubernetes node that runs workloads using Ceph-backed PersistentVolumes. These pods handle volume mount, unmount, node staging, and resize operations. Insufficient resources can cause pod mount failures and PVC attachment timeouts.

## CSI Plugin Architecture

The CSI plugin DaemonSet includes multiple containers:

- **csi-rbdplugin** - handles RBD (block) volume operations
- **csi-cephfsplugin** - handles CephFS (filesystem) volume operations
- **driver-registrar** - registers the CSI driver with kubelet
- **liveness-prometheus** - exposes liveness metrics

Each container needs its own resource configuration.

## Configuring CSI Plugin Resources via Operator ConfigMap

CSI plugin resources are configured through the Rook operator, not the CephCluster CR. Set them in the `rook-ceph-operator-config` ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-ceph-operator-config
  namespace: rook-ceph
data:
  CSI_RBD_PLUGIN_RESOURCE: |
    - name: driver-registrar
      resource:
        requests:
          memory: 128Mi
          cpu: 50m
        limits:
          memory: 256Mi
    - name: csi-rbdplugin
      resource:
        requests:
          memory: 512Mi
          cpu: 250m
        limits:
          memory: 1Gi
    - name: liveness-prometheus
      resource:
        requests:
          memory: 128Mi
          cpu: 50m
        limits:
          memory: 256Mi
  CSI_CEPHFS_PLUGIN_RESOURCE: |
    - name: driver-registrar
      resource:
        requests:
          memory: 128Mi
          cpu: 50m
        limits:
          memory: 256Mi
    - name: csi-cephfsplugin
      resource:
        requests:
          memory: 512Mi
          cpu: 250m
        limits:
          memory: 1Gi
    - name: liveness-prometheus
      resource:
        requests:
          memory: 128Mi
          cpu: 50m
        limits:
          memory: 256Mi
```

Alternatively, if deploying Rook via Helm, set these in the `rook-ceph` operator chart values under `csi.csiRBDPluginResource` and `csi.csiCephFSPluginResource`.

## Applying the Configuration

```bash
kubectl apply -f operator-configmap.yaml

# Watch CSI plugin pods roll
kubectl -n rook-ceph get pods -l app=csi-rbdplugin -w
kubectl -n rook-ceph get pods -l app=csi-cephfsplugin -w

# Verify resource limits
kubectl -n rook-ceph describe pod csi-rbdplugin-<hash> | grep -A30 "Containers:"
```

## Monitoring CSI Plugin Resources

```bash
# Check real-time usage
kubectl -n rook-ceph top pods | grep csi

# Check for OOM kills on CSI pods
kubectl -n rook-ceph get events | grep -i "OOMKilled\|csi"

# View CSI plugin logs for errors
kubectl -n rook-ceph logs -l app=csi-rbdplugin -c csi-rbdplugin --tail=50
kubectl -n rook-ceph logs -l app=csi-cephfsplugin -c csi-cephfsplugin --tail=50
```

## Common CSI Resource Issues

### Volume Mount Timeouts

If PVC mounts time out, the CSI plugin may be CPU-starved:

```bash
# Check kubelet logs for mount failures
journalctl -u kubelet | grep -i "volume\|mount\|csi" | tail -20

# Increase CPU limit for the plugin container
# (update resources via operator ConfigMap and re-apply)
```

### OOM on Large Volume Operations

Large filesystem resizes or RBD operations can spike memory:

```bash
# Check for OOM events
kubectl describe pod csi-rbdplugin-<hash> | grep -A5 "OOMKilled"

# Increase memory limit
# csi-rbdplugin: increase limits.memory from 1Gi to 2Gi
```

## Node-Specific Resource Profiles

For nodes that serve many PVCs, consider tainting and using nodeAffinity to apply larger resource configs to high-PVC nodes. This requires separate CSI plugin configurations in the Rook Helm chart values.

## CSI Plugin Sizing Guide

| Node PVC Count | Plugin CPU Request | Plugin Memory Limit |
|---|---|---|
| < 20 PVCs | 100m | 512Mi |
| 20-100 PVCs | 250m | 1Gi |
| > 100 PVCs | 500m | 2Gi |

## Summary

Rook CSI plugin pods run on every worker node and handle all Ceph volume mount/unmount operations. Configure resources through the `rook-ceph-operator-config` ConfigMap (`CSI_RBD_PLUGIN_RESOURCE` and `CSI_CEPHFS_PLUGIN_RESOURCE` keys) or via the rook-ceph operator Helm chart values for each container in the DaemonSet. Memory limits are the most critical - OOM-killed CSI plugin pods cause PVC mount failures. Start with 512Mi/1Gi request/limit and scale up based on observed usage, particularly on nodes serving many PVCs simultaneously.
