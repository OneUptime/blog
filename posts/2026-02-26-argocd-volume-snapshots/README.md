# How to Handle Volume Snapshots with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Storage, Volume Snapshots

Description: Learn how to manage Kubernetes volume snapshots declaratively using ArgoCD, including VolumeSnapshot resources, snapshot scheduling, and restore workflows in a GitOps pipeline.

---

Volume snapshots give you the ability to capture point-in-time copies of persistent volume data. When you combine this with ArgoCD, you get a fully declarative, Git-driven approach to creating, managing, and restoring snapshots. This post walks through the practical steps of handling volume snapshots in an ArgoCD-managed Kubernetes environment.

## Prerequisites

Before working with volume snapshots in ArgoCD, you need a CSI driver that supports the VolumeSnapshot API. Most modern cloud providers and storage solutions support this:

- AWS EBS CSI Driver
- GCE PD CSI Driver
- Azure Disk CSI Driver
- Longhorn
- Rook-Ceph

You also need the VolumeSnapshot CRDs and the snapshot controller installed in your cluster. These are not part of the core Kubernetes distribution and must be installed separately.

```bash
# Install VolumeSnapshot CRDs
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/client/config/crd/snapshot.storage.k8s.io_volumesnapshots.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/client/config/crd/snapshot.storage.k8s.io_volumesnapshotcontents.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/client/config/crd/snapshot.storage.k8s.io_volumesnapshotclasses.yaml

# Install the snapshot controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/deploy/kubernetes/snapshot-controller/
```

## Defining VolumeSnapshotClass in Git

The first thing to manage through ArgoCD is the VolumeSnapshotClass. This is similar to a StorageClass but for snapshots.

```yaml
# storage/volume-snapshot-class.yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: csi-snapshot-class
  annotations:
    # Mark as default snapshot class
    snapshot.storage.kubernetes.io/is-default-class: "true"
driver: ebs.csi.aws.com  # Replace with your CSI driver
deletionPolicy: Retain    # Keep snapshots even if VolumeSnapshot is deleted
```

Store this in your Git repository and let ArgoCD manage it. The `Retain` deletion policy is important because it prevents accidental data loss when someone deletes a VolumeSnapshot resource.

## Creating VolumeSnapshots Declaratively

Here is a VolumeSnapshot resource that references an existing PVC:

```yaml
# snapshots/postgres-snapshot.yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: postgres-data-snapshot-2026-02-26
  namespace: database
  labels:
    app: postgres
    snapshot-type: scheduled
    created-by: argocd
spec:
  volumeSnapshotClassName: csi-snapshot-class
  source:
    persistentVolumeClaimName: postgres-data-pvc
```

When ArgoCD syncs this manifest, Kubernetes will create a snapshot of the `postgres-data-pvc` volume. The snapshot is taken at the point in time when the CSI driver processes the request.

## ArgoCD Application for Snapshot Management

Organize your snapshot resources in a dedicated ArgoCD Application:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: volume-snapshots
  namespace: argocd
spec:
  project: storage
  source:
    repoURL: https://github.com/your-org/k8s-configs.git
    targetRevision: main
    path: snapshots
  destination:
    server: https://kubernetes.default.svc
    namespace: database
  syncPolicy:
    automated:
      prune: false  # Never auto-delete snapshots
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - RespectIgnoreDifferences=true
```

Notice that `prune` is set to `false`. This is critical for snapshots. You do not want ArgoCD to automatically delete snapshots when they are removed from Git. Instead, handle snapshot cleanup through a separate retention policy.

## Using Sync Hooks for Pre-Snapshot Operations

Before taking a snapshot of a database volume, you typically want to flush writes and ensure consistency. ArgoCD sync hooks are perfect for this:

```yaml
# hooks/pre-snapshot-flush.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: postgres-flush-before-snapshot
  namespace: database
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      containers:
        - name: flush
          image: postgres:16
          command:
            - /bin/sh
            - -c
            - |
              # Connect to postgres and flush WAL
              PGPASSWORD=$POSTGRES_PASSWORD psql -h postgres-svc -U postgres -c "CHECKPOINT;"
              echo "Database checkpoint complete - safe to snapshot"
          env:
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: password
      restartPolicy: Never
  backoffLimit: 3
```

This job runs before the sync, ensuring the database has flushed all pending writes to disk before the snapshot is created.

## Restoring from Volume Snapshots

To restore data from a snapshot, create a new PVC that references the VolumeSnapshot as its data source:

```yaml
# restore/postgres-restore-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data-restored
  namespace: database
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: gp3-csi
  resources:
    requests:
      storage: 50Gi
  dataSource:
    name: postgres-data-snapshot-2026-02-26
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
```

You can then update your StatefulSet or Deployment to use this restored PVC. Since everything is in Git, you have a full audit trail of when and why you restored from a snapshot.

## Snapshot Scheduling with CronJobs

While you can manually commit new VolumeSnapshot manifests to Git, a more practical approach for recurring snapshots is to use a Kubernetes CronJob managed by ArgoCD:

```yaml
# scheduled/snapshot-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-snapshot-schedule
  namespace: database
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: snapshot-creator
          containers:
            - name: snapshot
              image: bitnami/kubectl:latest
              command:
                - /bin/sh
                - -c
                - |
                  # Create a timestamped snapshot
                  TIMESTAMP=$(date +%Y%m%d-%H%M%S)
                  cat <<SNAP | kubectl apply -f -
                  apiVersion: snapshot.storage.k8s.io/v1
                  kind: VolumeSnapshot
                  metadata:
                    name: postgres-snap-${TIMESTAMP}
                    namespace: database
                    labels:
                      app: postgres
                      snapshot-type: scheduled
                  spec:
                    volumeSnapshotClassName: csi-snapshot-class
                    source:
                      persistentVolumeClaimName: postgres-data-pvc
                  SNAP
                  echo "Snapshot postgres-snap-${TIMESTAMP} created"
          restartPolicy: OnFailure
```

This CronJob is managed by ArgoCD, so the schedule itself is version-controlled. The actual snapshots it creates live outside of Git, which is the right approach for high-frequency automated snapshots.

## Handling Snapshot Drift and Ignore Differences

Volume snapshots have status fields that change after creation. Configure ArgoCD to ignore these:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: volume-snapshots
  namespace: argocd
spec:
  ignoreDifferences:
    - group: snapshot.storage.k8s.io
      kind: VolumeSnapshot
      jsonPointers:
        - /status
        - /spec/source/volumeSnapshotContentName
```

This prevents ArgoCD from showing the application as OutOfSync because of status updates or content name bindings that happen after the snapshot is created.

## Retention and Cleanup

Manage snapshot retention with a cleanup CronJob:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: snapshot-cleanup
  namespace: database
spec:
  schedule: "0 3 * * 0"  # Weekly on Sundays at 3 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: snapshot-creator
          containers:
            - name: cleanup
              image: bitnami/kubectl:latest
              command:
                - /bin/sh
                - -c
                - |
                  # Delete snapshots older than 30 days
                  CUTOFF=$(date -d '30 days ago' +%Y%m%d)
                  kubectl get volumesnapshots -n database \
                    -l snapshot-type=scheduled \
                    -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.metadata.creationTimestamp}{"\n"}{end}' | \
                  while read NAME TS; do
                    SNAP_DATE=$(echo $TS | cut -d'T' -f1 | tr -d '-')
                    if [ "$SNAP_DATE" -lt "$CUTOFF" ]; then
                      echo "Deleting old snapshot: $NAME"
                      kubectl delete volumesnapshot "$NAME" -n database
                    fi
                  done
          restartPolicy: OnFailure
```

## Monitoring Snapshot Health

Integrate snapshot monitoring with your observability stack. You can use [OneUptime](https://oneuptime.com/blog/post/2026-02-26-argocd-alerts-failed-syncs/view) to set up alerts when snapshot creation fails or when your snapshot count drops below the expected retention count.

## Summary

Handling volume snapshots with ArgoCD involves storing VolumeSnapshotClass definitions, snapshot resources, scheduling CronJobs, and restore PVC definitions in Git. The key considerations are disabling automatic pruning for snapshot resources, using sync hooks for application-consistent snapshots, configuring ignore differences for status fields, and implementing retention policies through scheduled cleanup jobs. This approach gives you a fully auditable, repeatable snapshot workflow that fits cleanly into a GitOps pipeline.
