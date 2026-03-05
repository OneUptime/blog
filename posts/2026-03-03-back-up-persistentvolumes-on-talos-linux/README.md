# How to Back Up PersistentVolumes on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Backup, PersistentVolume, Velero, Disaster Recovery

Description: Learn how to back up and restore PersistentVolumes on Talos Linux using Velero, CSI snapshots, and other backup strategies.

---

Backing up PersistentVolumes is one of the most critical tasks when running stateful workloads on Kubernetes. On Talos Linux, the immutable operating system means your data lives entirely within PersistentVolumes. If you lose that data without a backup, there is no way to recover it from the host filesystem. A solid backup strategy is not optional - it is essential.

This guide covers multiple approaches to backing up PersistentVolumes on Talos Linux, from simple tools to full-featured backup solutions.

## Backup Strategy Overview

There are several approaches to backing up PVs on Kubernetes:

1. **Velero with CSI snapshots**: Full cluster backup solution with volume snapshot support
2. **CSI volume snapshots**: Built-in Kubernetes snapshots for point-in-time recovery
3. **Application-level backups**: Backing up at the application layer (database dumps, file syncs)
4. **Restic/Kopia file-level backups**: File-by-file backup through Velero

Each approach has trade-offs, and the best strategy often combines multiple methods.

## Setting Up Velero

Velero is the standard backup tool for Kubernetes. It backs up cluster resources and PersistentVolume data.

### Installing Velero CLI

```bash
# macOS
brew install velero

# Linux
wget https://github.com/vmware-tanzu/velero/releases/latest/download/velero-linux-amd64.tar.gz
tar -zxvf velero-linux-amd64.tar.gz
sudo mv velero-linux-amd64/velero /usr/local/bin/

# Verify
velero version --client-only
```

### Deploying Velero with S3 Backend

```bash
# Create credentials file for S3 storage
cat > credentials-velero << 'CREDS'
[default]
aws_access_key_id = your-access-key
aws_secret_access_key = your-secret-key
CREDS

# Install Velero with S3 backend and CSI snapshot support
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.9.0,velero/velero-plugin-for-csi:v0.7.0 \
  --bucket velero-backups \
  --backup-location-config region=us-east-1,s3ForcePathStyle=true,s3Url=https://s3.amazonaws.com \
  --snapshot-location-config region=us-east-1 \
  --secret-file ./credentials-velero \
  --features=EnableCSI \
  --use-node-agent
```

For using MinIO as the backup target (running on your Talos cluster or elsewhere):

```bash
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.9.0,velero/velero-plugin-for-csi:v0.7.0 \
  --bucket velero-backups \
  --backup-location-config region=minio,s3ForcePathStyle=true,s3Url=http://minio.minio.svc.cluster.local:9000 \
  --snapshot-location-config region=minio \
  --secret-file ./credentials-velero \
  --features=EnableCSI \
  --use-node-agent
```

Verify Velero is running:

```bash
# Check Velero pods
kubectl -n velero get pods

# Check backup locations
velero backup-location get
```

### Configuring CSI Snapshot Support

Make sure you have VolumeSnapshotClasses configured for your storage:

```yaml
# csi-snapshot-class.yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: ceph-block-snapshot
  labels:
    velero.io/csi-volumesnapshot-class: "true"
driver: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  csi.storage.k8s.io/snapshotter-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/snapshotter-secret-namespace: rook-ceph
deletionPolicy: Retain
```

The label `velero.io/csi-volumesnapshot-class: "true"` tells Velero to use this snapshot class for backups.

## Creating Backups with Velero

### Full Cluster Backup

```bash
# Back up the entire cluster
velero backup create full-backup-$(date +%Y%m%d)

# Back up a specific namespace
velero backup create my-app-backup \
  --include-namespaces my-app

# Back up with volume snapshots
velero backup create db-backup \
  --include-namespaces databases \
  --snapshot-volumes=true

# Check backup status
velero backup describe db-backup
velero backup logs db-backup
```

### Selective Backups with Labels

```bash
# Back up only resources with a specific label
velero backup create labeled-backup \
  --selector app=postgres

# Exclude specific resources
velero backup create partial-backup \
  --include-namespaces my-app \
  --exclude-resources events,events.events.k8s.io
```

### Using File-Level Backups (Kopia)

For storage backends that do not support CSI snapshots, Velero can use Kopia (or Restic) to do file-level backups:

```bash
# Install Velero with node-agent (file-level backup support)
# The --use-node-agent flag was included in our install command above

# Create a backup with file-level backup for all PVs
velero backup create file-backup \
  --include-namespaces my-app \
  --default-volumes-to-fs-backup
```

To enable file-level backup for specific pods, add an annotation:

```yaml
# Add this annotation to pods that need file-level backup
metadata:
  annotations:
    backup.velero.io/backup-volumes: data,config
```

## Scheduling Automated Backups

```bash
# Create a daily backup schedule
velero schedule create daily-backup \
  --schedule="0 2 * * *" \
  --include-namespaces databases,my-app \
  --snapshot-volumes=true \
  --ttl 168h  # Keep backups for 7 days

# Create a weekly full backup
velero schedule create weekly-full \
  --schedule="0 3 * * 0" \
  --ttl 720h  # Keep for 30 days

# List schedules
velero schedule get

# View backup history
velero backup get
```

## Restoring from Backups

### Full Namespace Restore

```bash
# List available backups
velero backup get

# Restore a specific backup
velero restore create --from-backup db-backup

# Restore to a different namespace
velero restore create --from-backup db-backup \
  --namespace-mappings databases:databases-restored

# Check restore status
velero restore describe <restore-name>
velero restore logs <restore-name>
```

### Partial Restore

```bash
# Restore only specific resources
velero restore create --from-backup full-backup \
  --include-resources persistentvolumeclaims,persistentvolumes

# Restore with label selector
velero restore create --from-backup full-backup \
  --selector app=postgres
```

## CSI Volume Snapshots (Without Velero)

You can use CSI snapshots directly for quick point-in-time recovery:

```yaml
# Take a snapshot
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: postgres-snap-20240115
  namespace: databases
spec:
  volumeSnapshotClassName: ceph-block-snapshot
  source:
    persistentVolumeClaimName: postgres-data
```

```yaml
# Restore from snapshot to a new PVC
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data-restored
  namespace: databases
spec:
  storageClassName: ceph-block
  dataSource:
    name: postgres-snap-20240115
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
```

```bash
# Create the snapshot
kubectl apply -f snapshot.yaml

# Check snapshot status
kubectl get volumesnapshot -n databases

# Create the restored PVC
kubectl apply -f restore-pvc.yaml
```

## Application-Level Backups

For databases, application-level backups are often the most reliable:

```yaml
# postgres-backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: databases
spec:
  schedule: "0 */6 * * *"  # Every 6 hours
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: postgres:16
              command:
                - /bin/sh
                - -c
                - |
                  TIMESTAMP=$(date +%Y%m%d_%H%M%S)
                  pg_dump -h postgres -U appuser -d myapp | gzip > /backups/myapp_${TIMESTAMP}.sql.gz
                  # Remove backups older than 7 days
                  find /backups -name "*.sql.gz" -mtime +7 -delete
                  echo "Backup completed: myapp_${TIMESTAMP}.sql.gz"
              env:
                - name: PGPASSWORD
                  valueFrom:
                    secretKeyRef:
                      name: postgres-secret
                      key: password
              volumeMounts:
                - name: backups
                  mountPath: /backups
          restartPolicy: OnFailure
          volumes:
            - name: backups
              persistentVolumeClaim:
                claimName: backup-storage
```

## Backup Verification

Always verify your backups can actually be restored:

```bash
# Create a restore test
velero restore create test-restore \
  --from-backup daily-backup \
  --namespace-mappings databases:databases-test

# Verify the restored data
kubectl -n databases-test get pods
kubectl -n databases-test exec deploy/postgres -- psql -U appuser -d myapp -c "SELECT count(*) FROM users;"

# Clean up the test
kubectl delete namespace databases-test
```

## Monitoring Backup Health

```bash
# Check backup status
velero backup get

# Look for failed backups
velero backup get --selector velero.io/schedule-name=daily-backup | grep -v Completed

# Check the Velero server logs
kubectl -n velero logs deploy/velero --tail=100

# Check node-agent logs (for file-level backups)
kubectl -n velero logs ds/node-agent --tail=100
```

## Summary

Backing up PersistentVolumes on Talos Linux is non-negotiable for any production deployment. Velero provides the most complete solution, combining Kubernetes resource backups with volume snapshots and file-level backups. CSI snapshots give you fast point-in-time recovery within the cluster, while application-level backups provide the most reliable data protection for databases. The best approach uses a combination: scheduled Velero backups for disaster recovery, CSI snapshots for quick rollbacks, and application-level backups for data integrity. Whatever method you choose, test your restores regularly. A backup you have never tested is a backup you cannot trust.
