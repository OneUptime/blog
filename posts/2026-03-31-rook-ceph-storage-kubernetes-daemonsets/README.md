# How to Use Ceph Storage with Kubernetes DaemonSets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, DaemonSet, Storage, Node-Level

Description: Use Rook-Ceph volumes with Kubernetes DaemonSets for node-level log collection, monitoring agents, and per-node data operations.

---

## Introduction

DaemonSets run exactly one pod per node (or per node matching a selector). Common uses include log collectors, monitoring agents, and security scanners. When these agents need to persist data or share data centrally, Rook-Ceph provides suitable storage options. However, because DaemonSet pods run on every node, storage access patterns differ from regular deployments.

## Storage Patterns for DaemonSets

DaemonSet pods typically use one of these storage strategies:

1. `hostPath` - Access node filesystem directly (no Ceph needed)
2. Per-pod RBD PVC - Each pod gets its own Ceph block device
3. Shared CephFS PVC - All pods write to a shared CephFS volume
4. Ceph RGW - Each pod uploads to a centralized object store

## Using a Shared CephFS Volume

All DaemonSet pods can write to a shared CephFS `ReadWriteMany` PVC for centralized log aggregation:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: agent-shared-logs
spec:
  storageClassName: rook-cephfs
  accessModes:
  - ReadWriteMany
  resources:
    requests:
      storage: 100Gi
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: log-collector
spec:
  selector:
    matchLabels:
      app: log-collector
  template:
    metadata:
      labels:
        app: log-collector
    spec:
      containers:
      - name: collector
        image: fluent/fluent-bit:latest
        volumeMounts:
        - name: shared-logs
          mountPath: /output
          subPathExpr: $(NODE_NAME)
        - name: host-logs
          mountPath: /var/log
          readOnly: true
        env:
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
      volumes:
      - name: shared-logs
        persistentVolumeClaim:
          claimName: agent-shared-logs
      - name: host-logs
        hostPath:
          path: /var/log
```

Using `subPathExpr: $(NODE_NAME)` ensures each node writes to its own subdirectory, preventing conflicts.

## Using Ceph RGW for Per-Node Metrics Upload

Instead of shared volumes, DaemonSet pods can push metrics directly to object storage:

```yaml
containers:
- name: metrics-collector
  image: metrics-agent:latest
  env:
  - name: S3_ENDPOINT
    value: "http://rook-ceph-rgw-store.rook-ceph:80"
  - name: S3_BUCKET
    value: "node-metrics"
  - name: NODE_NAME
    valueFrom:
      fieldRef:
        fieldPath: spec.nodeName
  command:
  - /bin/sh
  - -c
  - |
    while true; do
      collect_metrics | aws s3 cp - \
        s3://node-metrics/$NODE_NAME/$(date +%s).json \
        --endpoint-url $S3_ENDPOINT
      sleep 60
    done
```

## Node Selector for DaemonSets with Ceph

If only certain nodes have network access to Ceph, use node selectors:

```yaml
spec:
  template:
    spec:
      nodeSelector:
        storage-network: "true"
```

## Monitoring DaemonSet Storage

```bash
# Check all DaemonSet pods
kubectl get pods -l app=log-collector -o wide

# Verify CephFS volume usage
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph fs status
```

## Summary

DaemonSets work well with Rook-Ceph when using CephFS `ReadWriteMany` volumes for shared writes across nodes, or Ceph RGW for per-node object uploads. Using `subPathExpr` with the node name prevents write conflicts when multiple DaemonSet pods share the same CephFS PVC, enabling centralized data collection without dedicated per-node storage.
