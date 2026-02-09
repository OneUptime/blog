# Using Velero with Volume Snapshots for Kubernetes Persistent Volume Backup and Restore
Author: [nawazdhandala](https://github.com/nawazdhandala)
Tags: Velero, Volume Snapshots, Kubernetes, Backup, Persistent Volume
Description: Learn how to configure Velero with CSI volume snapshots to back up and restore Kubernetes persistent volumes for disaster recovery and migration.
---

Persistent data is the Achilles heel of Kubernetes disaster recovery. While stateless workloads can be redeployed from manifests, databases, message queues, and file stores hold irreplaceable data in PersistentVolumes. Velero is the de facto standard for Kubernetes backup and restore, and when combined with CSI volume snapshots, it provides crash-consistent backups of your persistent data without application downtime. In this post, we will set up Velero with volume snapshot support, configure backup schedules, and walk through restore procedures.

## How Velero Works

Velero operates as a Kubernetes controller that watches for Backup and Restore custom resources. When a Backup is created, Velero does two things: it exports all Kubernetes resource manifests (Deployments, Services, ConfigMaps, etc.) and stores them in an object storage bucket, and it takes snapshots of PersistentVolumes associated with the backed-up resources.

For volume snapshots, Velero supports two approaches. The legacy approach uses cloud provider-specific snapshot APIs through plugins (AWS EBS snapshots, GCE persistent disk snapshots, Azure disk snapshots). The modern approach uses the Kubernetes CSI VolumeSnapshot API, which provides a standardized interface regardless of the underlying storage provider.

## Prerequisites

Before deploying Velero with CSI snapshots, ensure your cluster has the CSI snapshot controller and CRDs installed:

```bash
# Check if VolumeSnapshot CRDs exist
kubectl get crd volumesnapshots.snapshot.storage.k8s.io
kubectl get crd volumesnapshotcontents.snapshot.storage.k8s.io
kubectl get crd volumesnapshotclasses.snapshot.storage.k8s.io
```

If they are not installed, deploy them:

```bash
# Install snapshot CRDs
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/v7.0.1/client/config/crd/snapshot.storage.k8s.io_volumesnapshots.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/v7.0.1/client/config/crd/snapshot.storage.k8s.io_volumesnapshotcontents.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/v7.0.1/client/config/crd/snapshot.storage.k8s.io_volumesnapshotclasses.yaml

# Install the snapshot controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/v7.0.1/deploy/kubernetes/snapshot-controller/rbac-snapshot-controller.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/v7.0.1/deploy/kubernetes/snapshot-controller/setup-snapshot-controller.yaml
```

Create a VolumeSnapshotClass for your CSI driver:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: csi-snapclass
  labels:
    velero.io/csi-volumesnapshot-class: "true"
driver: ebs.csi.aws.com
deletionPolicy: Retain
parameters:
  tagSpecification_1: "velero-backup=true"
```

The label `velero.io/csi-volumesnapshot-class: "true"` tells Velero to use this snapshot class for CSI-based backups.

## Installing Velero

Install Velero using the CLI tool. First, download and install the Velero CLI:

```bash
brew install velero  # macOS
# or
wget https://github.com/vmware-tanzu/velero/releases/download/v1.13.0/velero-v1.13.0-linux-amd64.tar.gz
tar -xvf velero-v1.13.0-linux-amd64.tar.gz
mv velero-v1.13.0-linux-amd64/velero /usr/local/bin/
```

Create the AWS credentials file:

```ini
# credentials-velero
[default]
aws_access_key_id=AKIAIOSFODNN7EXAMPLE
aws_secret_access_key=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

Install Velero with the AWS plugin and CSI snapshot support:

```bash
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.9.0,velero/velero-plugin-for-csi:v0.7.0 \
  --bucket myorg-velero-backups \
  --backup-location-config region=us-east-1 \
  --snapshot-location-config region=us-east-1 \
  --secret-file ./credentials-velero \
  --features=EnableCSI \
  --use-volume-snapshots=true
```

Alternatively, deploy with Helm for more configuration options:

```yaml
# velero-values.yaml
initContainers:
  - name: velero-plugin-for-aws
    image: velero/velero-plugin-for-aws:v1.9.0
    volumeMounts:
      - mountPath: /target
        name: plugins
  - name: velero-plugin-for-csi
    image: velero/velero-plugin-for-csi:v0.7.0
    volumeMounts:
      - mountPath: /target
        name: plugins

configuration:
  features: EnableCSI
  backupStorageLocation:
    - name: default
      provider: aws
      bucket: myorg-velero-backups
      config:
        region: us-east-1
  volumeSnapshotLocation:
    - name: default
      provider: aws
      config:
        region: us-east-1

credentials:
  useSecret: true
  secretContents:
    cloud: |
      [default]
      aws_access_key_id=AKIAIOSFODNN7EXAMPLE
      aws_secret_access_key=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

resources:
  requests:
    cpu: 500m
    memory: 256Mi
  limits:
    cpu: "1"
    memory: 512Mi

deployNodeAgent: true
nodeAgent:
  resources:
    requests:
      cpu: 500m
      memory: 256Mi
    limits:
      cpu: "1"
      memory: 1Gi
```

```bash
helm repo add vmware-tanzu https://vmware-tanzu.github.io/helm-charts
helm install velero vmware-tanzu/velero \
  --namespace velero \
  --create-namespace \
  -f velero-values.yaml
```

## Creating Backups

Create a one-time backup of a specific namespace:

```bash
velero backup create db-backup-20260209 \
  --include-namespaces databases \
  --snapshot-volumes=true \
  --csi-snapshot-timeout=30m \
  --wait
```

Check backup status:

```bash
velero backup describe db-backup-20260209 --details
```

The output shows the resources backed up and the volume snapshots taken:

```
Name:         db-backup-20260209
Namespace:    velero
Phase:        Completed

CSI Volume Snapshots:
  databases/postgresql-data-postgresql-0:
    Snapshot:   velero-snapshot-postgresql-data-abc123
    Type:       CSI
    Status:     ReadyToUse
    Size:       107374182400
```

## Backup Schedules

For production, set up scheduled backups:

```bash
# Full backup every night at 2 AM UTC, retain for 30 days
velero schedule create nightly-full \
  --schedule="0 2 * * *" \
  --ttl 720h \
  --snapshot-volumes=true \
  --include-namespaces databases,stateful-apps

# Hourly backup of critical namespaces, retain for 3 days
velero schedule create hourly-critical \
  --schedule="0 * * * *" \
  --ttl 72h \
  --snapshot-volumes=true \
  --include-namespaces databases \
  --include-resources persistentvolumeclaims,persistentvolumes,pods,deployments,statefulsets,services,configmaps,secrets
```

You can also create schedules as Kubernetes resources:

```yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: nightly-database-backup
  namespace: velero
spec:
  schedule: "0 2 * * *"
  template:
    includedNamespaces:
      - databases
    snapshotVolumes: true
    csiSnapshotTimeout: 30m
    ttl: 720h0m0s
    storageLocation: default
    volumeSnapshotLocations:
      - default
    hooks:
      resources:
        - name: postgresql-pre-backup
          includedNamespaces:
            - databases
          labelSelector:
            matchLabels:
              app: postgresql
          pre:
            - exec:
                container: postgresql
                command:
                  - /bin/bash
                  - -c
                  - "pg_dump -U postgres -Fc mydb > /tmp/backup.dump && sync"
                onError: Fail
                timeout: 5m
```

The `pre` hook runs a command inside the pod before the snapshot is taken. This is essential for databases: you want to ensure the data is in a consistent state before snapshotting the volume.

## Restoring from Backup

Restore an entire backup to the same namespace:

```bash
velero restore create --from-backup db-backup-20260209 --wait
```

Restore to a different namespace (for testing):

```bash
velero restore create --from-backup db-backup-20260209 \
  --namespace-mappings databases:databases-restored \
  --wait
```

Restore specific resources only:

```bash
velero restore create --from-backup db-backup-20260209 \
  --include-resources persistentvolumeclaims,persistentvolumes \
  --wait
```

Check restore status:

```bash
velero restore describe <restore-name> --details
```

## Cross-Cluster Migration

Velero can migrate workloads between clusters by sharing the backup storage location. On the source cluster, create a backup. On the destination cluster, configure Velero to point to the same object storage bucket:

```bash
# Source cluster: create backup
velero backup create migration-backup \
  --include-namespaces app-production \
  --snapshot-volumes=true \
  --wait

# Destination cluster: restore from the shared bucket
velero restore create --from-backup migration-backup --wait
```

For cross-region or cross-provider migrations where volume snapshots are not portable, use Velero's File System Backup (formerly Restic) approach instead:

```bash
# Annotate pods to use file system backup
kubectl annotate pod/postgresql-0 -n databases \
  backup.velero.io/backup-volumes=data

velero backup create fs-migration \
  --include-namespaces databases \
  --default-volumes-to-fs-backup \
  --wait
```

## Monitoring Backup Health

Set up alerts for backup failures:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: velero-alerts
  namespace: monitoring
spec:
  groups:
    - name: velero
      rules:
        - alert: VeleroBackupFailed
          expr: increase(velero_backup_failure_total[1h]) > 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Velero backup failed"
            description: "A Velero backup has failed in the last hour."

        - alert: VeleroBackupNotRunRecently
          expr: time() - velero_backup_last_successful_timestamp{schedule="nightly-full"} > 90000
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Velero nightly backup has not run"
            description: "The nightly full backup has not completed successfully in over 25 hours."
```

Also check backups regularly from the command line:

```bash
# List all backups
velero backup get

# Check scheduled backup status
velero schedule get

# View backup logs for troubleshooting
velero backup logs db-backup-20260209
```

## Best Practices

Always test your restores regularly. A backup that cannot be restored is worthless. Set up a monthly or weekly restore drill in a test namespace to verify that your backups produce working recoverable state.

Use pre-backup hooks for databases to ensure data consistency. For PostgreSQL, run `pg_start_backup` or use `pg_dump`. For MySQL, consider `FLUSH TABLES WITH READ LOCK` or use a replica for backups.

Set appropriate TTLs on your backups to manage storage costs. Keep nightly backups for 30 days, weekly backups for 90 days, and monthly backups for a year.

Enable encryption on your backup storage bucket. Velero backups contain all your Kubernetes Secrets, including database passwords and API keys.

Velero with CSI volume snapshots provides a comprehensive disaster recovery solution for stateful Kubernetes workloads. By automating backup schedules, testing restores, and monitoring backup health, you can confidently protect your persistent data against accidental deletion, cluster failures, and regional outages.
