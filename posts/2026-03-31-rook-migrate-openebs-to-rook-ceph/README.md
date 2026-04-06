# How to Migrate from OpenEBS to Rook-Ceph on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, OpenEBS, Migration, Kubernetes, Block Storage

Description: A guide for migrating Kubernetes workloads from OpenEBS (cStor or Jiva) to Rook-Ceph RBD block storage with minimal downtime.

---

## Overview

OpenEBS provides several storage engines (Jiva, cStor, LocalPV) for Kubernetes. While these work well for smaller deployments, organizations migrating to Rook-Ceph gain centralized storage management, native Ceph tooling, object storage, and better horizontal scalability. This guide covers the migration path from OpenEBS cStor or Jiva to Rook-Ceph RBD.

## Assessing OpenEBS Usage

```bash
# List all OpenEBS storage classes
kubectl get storageclass | grep openebs

# List OpenEBS-backed PVCs
kubectl get pvc -A | grep -E "openebs|cstor|jiva"

# Check OpenEBS volume status
kubectl get cstorvolume -A
kubectl get cstorvolumeclaim -A
```

## Step 1: Deploy Rook-Ceph

```bash
# Verify Rook-Ceph cluster health
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  ceph status

# Create target StorageClass
```

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-block
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: replicapool
  imageFormat: "2"
  imageFeatures: layering
reclaimPolicy: Retain
allowVolumeExpansion: true
```

## Step 2: Export OpenEBS Volume Data

For cStor volumes, use the iSCSI interface to create a consistent snapshot:

```bash
# Get cStor volume details
kubectl get cstorvolume -n openebs

# Create a cStor snapshot
cat << EOF | kubectl apply -f -
apiVersion: volumesnapshot.external-storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: pre-migration-snap
  namespace: production
spec:
  persistentVolumeClaimName: my-app-data
EOF
```

## Step 3: Create Ceph PVC and Copy Data

```yaml
# New Ceph PVC matching source size
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-app-data-ceph
  namespace: production
spec:
  storageClassName: rook-ceph-block
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 100Gi
```

Migration pod:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: openebs-to-ceph
  namespace: production
spec:
  restartPolicy: Never
  initContainers:
  - name: wait-for-pvcs
    image: busybox
    command: ['sh', '-c', 'until test -d /src/lost+found || test -f /src/.ready; do sleep 2; done']
    volumeMounts:
    - name: source
      mountPath: /src
  containers:
  - name: copy
    image: alpine
    command:
    - /bin/sh
    - -c
    - |
      apk add --no-cache rsync
      rsync -avz --progress /src/ /dst/
      echo "DONE: $(find /dst -type f | wc -l) files copied"
    volumeMounts:
    - name: source
      mountPath: /src
    - name: dest
      mountPath: /dst
  volumes:
  - name: source
    persistentVolumeClaim:
      claimName: my-app-data
  - name: dest
    persistentVolumeClaim:
      claimName: my-app-data-ceph
```

```bash
kubectl apply -f migration-pod.yaml
kubectl wait pod openebs-to-ceph -n production \
  --for=condition=Succeeded --timeout=3600s
```

## Step 4: Application Cutover

```bash
# Scale down the application
kubectl scale deployment my-app -n production --replicas=0

# Update volume reference
kubectl patch deployment my-app -n production --type=json \
  -p='[{"op":"replace","path":"/spec/template/spec/volumes/0/persistentVolumeClaim/claimName","value":"my-app-data-ceph"}]'

# Scale back up
kubectl scale deployment my-app -n production --replicas=2

# Watch pods come up
kubectl get pods -n production -l app=my-app -w
```

## Step 5: Validate Data Integrity

```bash
# Check application-specific health (e.g., for a database)
kubectl exec -n production $(kubectl get pod -l app=my-app \
  -o jsonpath='{.items[0].metadata.name}') -- \
  psql -U appuser -c "SELECT COUNT(*) FROM main_table;"
```

## Step 6: Decommission OpenEBS Resources

```bash
# Delete OpenEBS PVCs after validation period
kubectl delete pvc my-app-data -n production

# Check for orphaned cStor volumes
kubectl get cstorvolume -n openebs

# Delete cStor volume if no longer referenced
kubectl delete cstorvolume <volume-name> -n openebs
```

## Key Differences: OpenEBS vs Rook-Ceph

| Feature | OpenEBS cStor | Rook-Ceph RBD |
|---------|---------------|----------------|
| Replication | Synchronous | Synchronous |
| Snapshots | External snapshot | CSI snapshots |
| Object storage | No | Yes (RGW) |
| File storage | No | Yes (CephFS) |
| Management UI | OpenEBS Dashboard | Ceph Dashboard |
| Tooling maturity | Moderate | High |

## Summary

Migrating from OpenEBS to Rook-Ceph follows the same pattern as other block storage migrations: create matching Ceph PVCs, run a migration pod to copy data using rsync, scale down the application for cutover, update PVC references, and validate before removing OpenEBS resources. The main benefit of this migration is consolidating block, file, and object storage onto a single Rook-Ceph platform managed uniformly from within Kubernetes.
