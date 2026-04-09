# How to Migrate from GlusterFS to Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, GlusterFS, Migration, Storage, Kubernetes

Description: A guide for migrating distributed file storage from GlusterFS to Ceph (CephFS or RBD) via Rook, covering data transfer strategies and application cutover.

---

## Overview

GlusterFS has been a popular distributed file system for Kubernetes (via Heketi and gluster-kubernetes), but its development has slowed and CephFS provides stronger Kubernetes-native integration for features like snapshots and quotas, as well as capabilities GlusterFS lacks such as storage tiering and active-active MDS. This guide covers a practical migration from GlusterFS to Rook-Ceph while minimizing application downtime.

## Assessing Your GlusterFS Setup

```bash
# List GlusterFS-backed PVCs
kubectl get pv -o json | python3 -c "
import sys, json
pvs = json.load(sys.stdin)['items']
for pv in pvs:
  if 'glusterfs' in pv.get('spec', {}):
    print(pv['metadata']['name'], pv['spec']['glusterfs']['path'])
"

# Check GlusterFS volume sizes
gluster volume info
gluster volume status
```

## Step 1: Deploy Rook-Ceph

If Rook is not yet installed, deploy the operator and cluster:

```bash
kubectl apply -f https://raw.githubusercontent.com/rook/rook/master/deploy/examples/common.yaml
kubectl apply -f https://raw.githubusercontent.com/rook/rook/master/deploy/examples/operator.yaml
kubectl apply -f https://raw.githubusercontent.com/rook/rook/master/deploy/examples/cluster.yaml

# Wait for cluster health
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  ceph status
```

## Step 2: Create CephFS for File Workloads

```yaml
apiVersion: ceph.rook.io/v1
kind: CephFilesystem
metadata:
  name: cephfs
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 3
  dataPools:
  - name: data0
    replicated:
      size: 3
  metadataServer:
    activeCount: 1
    activeStandby: true
```

## Step 3: Snapshot GlusterFS Before Migration

Take GlusterFS snapshots to create a consistent point-in-time baseline:

```bash
# Create a GlusterFS snapshot
gluster snapshot create pre-migration myvol no-timestamp

# Activate the snapshot
gluster snapshot activate pre-migration
```

## Step 4: Initial Data Copy with rsync

Perform an initial sync while applications are still running on GlusterFS:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gluster-to-ceph-sync
  namespace: production
spec:
  restartPolicy: Never
  containers:
  - name: sync
    image: alpine
    command:
    - /bin/sh
    - -c
    - |
      apk add --no-cache rsync
      # Initial sync (allows continued writes to GlusterFS)
      rsync -avz --delete /gluster-src/ /ceph-dst/
      echo "Initial sync done: $(du -sh /ceph-dst)"
      # Keep pod running for the final sync in Step 5
      sleep infinity
    volumeMounts:
    - name: gluster-src
      mountPath: /gluster-src
    - name: ceph-dst
      mountPath: /ceph-dst
  volumes:
  - name: gluster-src
    persistentVolumeClaim:
      claimName: gluster-pvc
  - name: ceph-dst
    persistentVolumeClaim:
      claimName: cephfs-pvc
```

## Step 5: Final Sync and Cutover

```bash
# Scale down applications
kubectl scale deployment my-app -n production --replicas=0

# Run final incremental sync
kubectl exec -n production gluster-to-ceph-sync -- \
  rsync -avz --delete /gluster-src/ /ceph-dst/

# Update application to use CephFS PVC
kubectl patch deployment my-app -n production --type=json \
  -p='[{"op":"replace","path":"/spec/template/spec/volumes/0/persistentVolumeClaim/claimName","value":"cephfs-pvc"}]'

kubectl scale deployment my-app -n production --replicas=3
```

## Step 6: Verify and Decommission GlusterFS

```bash
# Confirm application is healthy
kubectl get pods -n production -l app=my-app

# After validation period (1-2 weeks), decommission GlusterFS
gluster volume stop myvol
gluster volume delete myvol
```

## Key Differences: GlusterFS vs CephFS

| Feature | GlusterFS | CephFS |
|---------|----------|--------|
| Snapshots | Yes (CLI only) | Yes (Kubernetes native) |
| Quotas | Directory quotas | Per-directory quotas |
| Kubernetes integration | Heketi (deprecated) | CSI driver (active) |
| Multi-protocol | NFS, SMB | Native (kernel/FUSE), NFS via Ganesha |
| Active development | Slowing | Active |

## Summary

Migrating from GlusterFS to Ceph involves an initial rsync while applications remain online, followed by a brief maintenance window for the final incremental sync and PVC swap. CephFS provides all the file system semantics of GlusterFS with the addition of Kubernetes-native snapshots, better CSI integration, and a more active development community. After migration, Rook manages the entire Ceph lifecycle within Kubernetes.
