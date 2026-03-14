# How to Configure Volume Snapshot Classes with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, VolumeSnapshotClass, Snapshots, Backup, Storage

Description: Manage VolumeSnapshotClass resources using Flux CD GitOps for version-controlled Kubernetes volume snapshot capabilities.

---

## Introduction

Kubernetes Volume Snapshots provide a standardized way to create point-in-time copies of persistent volumes. `VolumeSnapshotClass` resources define how snapshots are created - analogous to how `StorageClass` defines how volumes are provisioned. Each CSI driver that supports snapshots requires a `VolumeSnapshotClass` configured with driver-specific parameters.

Managing `VolumeSnapshotClass` resources through Flux CD ensures your snapshot capabilities are version-controlled and consistently available across clusters. Applications and backup tools can then reference these classes in their `VolumeSnapshot` and scheduled backup configurations.

## Prerequisites

- Kubernetes v1.26+ with the VolumeSnapshot CRDs installed
- CSI driver with snapshot support (AWS EBS, Rook-Ceph, Longhorn, etc.)
- `external-snapshotter` controller installed
- Flux CD bootstrapped to your Git repository
- `kubectl` and `flux` CLIs installed

## Step 1: Install the External Snapshotter

The external snapshotter provides the VolumeSnapshot CRDs and controller:

```yaml
# infrastructure/storage/snapshots/external-snapshotter.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: external-snapshotter
  namespace: flux-system
spec:
  interval: 12h
  url: https://github.com/kubernetes-csi/external-snapshotter
  ref:
    tag: v7.0.2
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: snapshot-controller
  namespace: flux-system
spec:
  interval: 30m
  sourceRef:
    kind: GitRepository
    name: external-snapshotter
  path: ./deploy/kubernetes/snapshot-controller
  prune: true
```

## Step 2: Create VolumeSnapshotClasses for Different Backends

```yaml
# infrastructure/storage/snapshots/snapshot-classes.yaml

# AWS EBS Snapshot Class
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: ebs-vsc
  annotations:
    snapshot.storage.kubernetes.io/is-default-class: "true"
driver: ebs.csi.aws.com
deletionPolicy: Delete   # delete snapshot when VolumeSnapshot is deleted
parameters:
  tagSpecification_1: "Key=Environment,Value=production"
  tagSpecification_2: "Key=ManagedBy,Value=flux-cd"
---
# Rook-Ceph RBD Snapshot Class
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: csi-rbdplugin-snapclass
driver: rook-ceph.rbd.csi.ceph.com
deletionPolicy: Delete
parameters:
  clusterID: rook-ceph
  csi.storage.k8s.io/volumesnapshot/name: "$(volumesnapshotnamespace)/$(volumesnapshotname)"
  csi.storage.k8s.io/volumesnapshot/namespace: "$(volumesnapshotnamespace)"
  csi.storage.k8s.io/volumesnapshot/contentname: "$(volumesnapshotcontentname)"
  csi.storage.k8s.io/snapshotter-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/snapshotter-secret-namespace: rook-ceph
---
# Rook-Ceph CephFS Snapshot Class
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: csi-cephfsplugin-snapclass
driver: rook-ceph.cephfs.csi.ceph.com
deletionPolicy: Delete
parameters:
  clusterID: rook-ceph
  csi.storage.k8s.io/volumesnapshot/name: "$(volumesnapshotnamespace)/$(volumesnapshotname)"
  csi.storage.k8s.io/volumesnapshot/namespace: "$(volumesnapshotnamespace)"
  csi.storage.k8s.io/volumesnapshot/contentname: "$(volumesnapshotcontentname)"
  csi.storage.k8s.io/snapshotter-secret-name: rook-csi-cephfs-provisioner
  csi.storage.k8s.io/snapshotter-secret-namespace: rook-ceph
---
# Longhorn Snapshot Class
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: longhorn-snapshot-vsc
driver: driver.longhorn.io
deletionPolicy: Delete
parameters:
  type: snap   # 'snap' for snapshot, 'bak' for backup to secondary storage
```

## Step 3: Create Scheduled Snapshots with VolumeSnapshot

Use a CronJob to create regular snapshots:

```yaml
# infrastructure/storage/snapshots/snapshot-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: daily-snapshots
  namespace: databases
spec:
  schedule: "0 3 * * *"   # daily at 3 AM
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: snapshot-creator
          restartPolicy: OnFailure
          containers:
            - name: snapshot
              image: bitnami/kubectl:1.29
              command:
                - /bin/sh
                - -c
                - |
                  DATE=$(date +%Y%m%d%H%M)

                  # Snapshot PostgreSQL primary data volume
                  kubectl apply -f - <<EOF
                  apiVersion: snapshot.storage.k8s.io/v1
                  kind: VolumeSnapshot
                  metadata:
                    name: postgres-data-${DATE}
                    namespace: databases
                    labels:
                      automated: "true"
                      schedule: daily
                  spec:
                    volumeSnapshotClassName: csi-rbdplugin-snapclass
                    source:
                      persistentVolumeClaimName: postgresql-data-postgres-primary-1
                  EOF

                  echo "Snapshot postgres-data-${DATE} created"

                  # Clean up snapshots older than 7 days
                  kubectl get volumesnapshot -n databases \
                    -l automated=true,schedule=daily \
                    --sort-by=.metadata.creationTimestamp \
                    -o name | head -n -7 | xargs -r kubectl delete -n databases
```

## Step 4: RBAC for the Snapshot Creator

```yaml
# infrastructure/storage/snapshots/snapshot-rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: snapshot-creator
  namespace: databases
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: snapshot-creator
  namespace: databases
rules:
  - apiGroups: ["snapshot.storage.k8s.io"]
    resources: ["volumesnapshots"]
    verbs: ["get", "list", "create", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: snapshot-creator
  namespace: databases
subjects:
  - kind: ServiceAccount
    name: snapshot-creator
    namespace: databases
roleRef:
  kind: Role
  name: snapshot-creator
  apiGroup: rbac.authorization.k8s.io
```

## Step 5: Restore from Snapshot

Create a new PVC from an existing snapshot:

```yaml
# Restore a PostgreSQL volume from snapshot
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data-restored
  namespace: databases
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: ceph-nvme-rwo
  resources:
    requests:
      storage: 50Gi
  dataSource:
    name: postgres-data-20260313030000  # snapshot name
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
```

## Step 6: Flux Kustomization

```yaml
# clusters/production/snapshot-classes-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: volume-snapshot-classes
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/storage/snapshots
  prune: true
  dependsOn:
    - name: snapshot-controller
    - name: rook-ceph-cluster
```

## Step 7: Verify Snapshot Classes

```bash
# List VolumeSnapshotClasses
kubectl get volumesnapshotclass

# Create a manual test snapshot
kubectl apply -f - <<EOF
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: test-snapshot
  namespace: default
spec:
  volumeSnapshotClassName: ebs-vsc
  source:
    persistentVolumeClaimName: my-pvc
EOF

# Check snapshot status
kubectl get volumesnapshot test-snapshot
kubectl describe volumesnapshot test-snapshot

# Check VolumeSnapshotContent (the actual snapshot)
kubectl get volumesnapshotcontent
```

## Best Practices

- Set `deletionPolicy: Retain` for `VolumeSnapshotClass` on production if you want snapshots to survive `VolumeSnapshot` deletion - useful for long-term archives.
- Label automated snapshots (`automated: "true"`) so cleanup CronJobs can target them without affecting manually created snapshots.
- Test restoration from snapshot in a non-production environment at least monthly to ensure snapshots are valid.
- Store snapshot retention policies in Git comments for compliance documentation.
- Monitor `VolumeSnapshotContent` readiness with `kubectl get volumesnapshotcontent` - a snapshot stuck in `Pending` state indicates a CSI driver issue.

## Conclusion

`VolumeSnapshotClass` resources managed through Flux CD give you a version-controlled snapshot infrastructure that application teams and backup tools can rely on. By combining VolumeSnapshotClasses with scheduled CronJobs that create and clean up snapshots, you build a lightweight backup capability that integrates naturally with your GitOps workflow. Every snapshot class configuration change is a Git commit reviewed by your team, ensuring your data protection policies are as auditable as your application deployments.
