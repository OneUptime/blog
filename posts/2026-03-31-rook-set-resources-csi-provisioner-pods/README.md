# How to Set Resources for Rook CSI Provisioner Pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, CSI, Provisioner, Resource, Pod

Description: Configure resource requests and limits for Rook CSI provisioner pods to ensure PVC creation, deletion, and snapshot operations complete reliably without resource contention.

---

## Overview

Rook deploys CSI provisioner pods (`csi-rbdplugin-provisioner` and `csi-cephfsplugin-provisioner`) as Deployments (not DaemonSets). These pods handle PVC create, delete, expand, and snapshot operations for the entire cluster. Unlike plugin DaemonSets that run everywhere, provisioners run as a small set of replicas with leader election.

## CSI Provisioner Architecture

Each provisioner Deployment includes multiple sidecars:

- **csi-provisioner** - watches PVC objects and calls CSI CreateVolume
- **csi-snapshotter** - handles VolumeSnapshot creation
- **csi-resizer** - handles PVC expansion requests
- **csi-attacher** - manages volume attachment to nodes
- **csi-omap-generator** - maintains OMap mappings for RBD volumes
- **csi-rbdplugin** or **csi-cephfsplugin** - the main Ceph CSI driver

## Configuring Provisioner Resources via CephCluster

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  csi:
    csiRBDProvisionerResource: |
      - name: csi-provisioner
        resource:
          requests:
            memory: 128Mi
            cpu: 100m
          limits:
            memory: 256Mi
            cpu: 200m
      - name: csi-resizer
        resource:
          requests:
            memory: 128Mi
            cpu: 100m
          limits:
            memory: 256Mi
            cpu: 200m
      - name: csi-attacher
        resource:
          requests:
            memory: 128Mi
            cpu: 100m
          limits:
            memory: 256Mi
            cpu: 200m
      - name: csi-snapshotter
        resource:
          requests:
            memory: 128Mi
            cpu: 100m
          limits:
            memory: 256Mi
            cpu: 200m
      - name: csi-rbdplugin
        resource:
          requests:
            memory: 512Mi
            cpu: 250m
          limits:
            memory: 1Gi
            cpu: 500m
      - name: liveness-prometheus
        resource:
          requests:
            memory: 128Mi
            cpu: 50m
          limits:
            memory: 256Mi
            cpu: 100m
    csiCephFSProvisionerResource: |
      - name: csi-provisioner
        resource:
          requests:
            memory: 128Mi
            cpu: 100m
          limits:
            memory: 256Mi
            cpu: 200m
      - name: csi-cephfsplugin
        resource:
          requests:
            memory: 512Mi
            cpu: 250m
          limits:
            memory: 1Gi
            cpu: 500m
```

## Applying and Verifying

```bash
kubectl apply -f cephcluster.yaml

# Check provisioner pod status
kubectl -n rook-ceph get pods | grep provisioner

# Verify resources on a provisioner pod
kubectl -n rook-ceph describe pod csi-rbdplugin-provisioner-<hash> | \
    grep -A50 "Containers:" | grep -A5 "Limits:"
```

## Testing Provisioner Functionality

```bash
# Create a test PVC to verify provisioner is working
kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-pvc
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
  storageClassName: rook-ceph-block
EOF

# Check PVC is bound
kubectl get pvc test-pvc -w
```

## Monitoring Provisioner Performance

```bash
# Watch provisioner logs for create/delete operations
kubectl -n rook-ceph logs -l app=csi-rbdplugin-provisioner \
    -c csi-provisioner --tail=50 -f

# Check for leader election logs (shows which pod is active)
kubectl -n rook-ceph logs -l app=csi-rbdplugin-provisioner \
    -c csi-provisioner --tail=20 | grep -i "leader\|elected"

# Monitor Prometheus metrics for CSI operations
# csi_sidecar_operations_seconds_bucket{driver_name="rook-ceph.rbd.csi.ceph.com"}
```

## High-Volume PVC Environments

For environments that create/delete many PVCs frequently:

```yaml
# Increase provisioner replicas and resources
spec:
  csi:
    provisionerReplicas: 3  # Default is 2
    csiRBDProvisionerResource: |
      - name: csi-rbdplugin
        resource:
          requests:
            memory: 1Gi
            cpu: 500m
          limits:
            memory: 2Gi
            cpu: 1000m
```

## Troubleshooting PVC Stuck in Pending

```bash
# Check provisioner logs for errors
kubectl -n rook-ceph logs -l app=csi-rbdplugin-provisioner \
    -c csi-rbdplugin --tail=100 | grep -i "error\|fail"

# Check if provisioner is being throttled
kubectl -n rook-ceph top pods | grep provisioner

# Check events for the PVC
kubectl describe pvc <pvc-name> | grep -A10 Events
```

## Summary

Rook CSI provisioner pods handle all PVC lifecycle operations and run as small Deployment replicas with leader election. Configure resources for each sidecar container through the CephCluster `csi.*ProvisionerResource` fields. The main CSI driver container needs the most memory (512Mi-2Gi depending on volume), while sidecars like the provisioner, resizer, and snapshotter need 128-256Mi each. Monitor provisioner logs for errors and increase replicas for high-volume PVC environments.
