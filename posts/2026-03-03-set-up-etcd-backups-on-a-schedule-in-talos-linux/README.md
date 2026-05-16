# How to Set Up etcd Backups on a Schedule in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, etcd, Backup, Kubernetes, Disaster Recovery

Description: Learn how to set up automated scheduled etcd backups in Talos Linux to protect your Kubernetes cluster state from data loss.

---

If there is one thing every Kubernetes administrator should have in place from day one, it is etcd backups. etcd holds your entire cluster state. Lose it without a backup, and you are rebuilding everything from scratch. On Talos Linux, setting up automated etcd backups requires a slightly different approach than traditional Linux setups because you cannot install cron jobs or backup scripts directly on the host OS. Instead, you use talosctl, Kubernetes CronJobs, or external backup solutions.

## Why etcd Backups Matter

etcd stores every Kubernetes object in your cluster: deployments, services, secrets, ConfigMaps, RBAC rules, custom resources, and more. A single etcd snapshot captures the entire cluster state at a point in time. With a good backup, you can recover from:

- Accidental deletion of namespaces or critical resources
- etcd data corruption
- Failed cluster upgrades
- Complete cluster loss (disaster recovery)

Without a backup, these scenarios mean starting over. The time investment in setting up automated backups is trivial compared to the pain of losing your cluster state.

## Method 1: Manual Snapshots with talosctl

The simplest way to take an etcd backup on Talos Linux is with talosctl:

```bash
# Take a snapshot and save it to a local file

talosctl -n 192.168.1.10 etcd snapshot ./etcd-backup-$(date +%Y%m%d-%H%M%S).snapshot

# Verify the snapshot file was created
ls -la etcd-backup-*.snapshot
```

This downloads a consistent snapshot of the etcd database to your local machine. The snapshot file can be used with Talos disaster recovery on a compatible cluster when you also have the required Talos machine configuration and secret material.

## Method 2: Automated Backups with a Kubernetes CronJob

For automated backups from inside the cluster, use Talos API access from Kubernetes instead of mounting Talos host secrets and calling `etcdctl` directly. First enable Kubernetes access to the Talos API for the namespace and backup role:

```yaml
machine:
  features:
    kubernetesTalosAPIAccess:
      enabled: true
      allowedRoles:
        - os:etcd:backup
      allowedKubernetesNamespaces:
        - kube-system
```

Then create a CronJob that takes regular snapshots and stores the latest snapshot on a PersistentVolume. Use a `talosctl` image version that matches your Talos Linux version:

```yaml
# etcd-backup-cronjob.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: etcd-backup
  namespace: kube-system
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: etcd-backup
  namespace: kube-system
spec:
  # Run every 6 hours
  schedule: "0 */6 * * *"
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      backoffLimit: 2
      template:
        spec:
          nodeSelector:
            node-role.kubernetes.io/control-plane: ""
          tolerations:
          - key: node-role.kubernetes.io/control-plane
            effect: NoSchedule
          containers:
          - name: etcd-backup
            image: ghcr.io/siderolabs/talosctl:v1.12.7
            command:
            - talosctl
            args:
            - -n
            - "192.168.1.10"
            - etcd
            - snapshot
            - /backup/latest.snapshot
            volumeMounts:
            - name: backup-dir
              mountPath: /backup
          volumes:
          - name: backup-dir
            persistentVolumeClaim:
              claimName: etcd-backup
          restartPolicy: OnFailure
```

```bash
# Inject the Talos API ServiceAccount and apply the CronJob
talosctl inject serviceaccount --roles=os:etcd:backup -f etcd-backup-cronjob.yaml > etcd-backup-cronjob-injected.yaml
kubectl apply -f etcd-backup-cronjob-injected.yaml

# Verify the CronJob was created
kubectl get cronjobs -n kube-system

# Trigger a manual backup run to test
kubectl create job etcd-backup-test --from=cronjob/etcd-backup -n kube-system

# Check the job status
kubectl get jobs -n kube-system | grep etcd-backup

# View the backup job logs
kubectl logs job/etcd-backup-test -n kube-system
```

## Method 3: Backup with S3 Upload

For a more complete solution that includes uploading to S3, use an init container to take the snapshot and a main container to upload it:

```yaml
# etcd-backup-s3-cronjob.yaml
apiVersion: v1
kind: Secret
metadata:
  name: etcd-backup-s3-credentials
  namespace: kube-system
type: Opaque
stringData:
  AWS_ACCESS_KEY_ID: "your-access-key"
  AWS_SECRET_ACCESS_KEY: "your-secret-key"
  AWS_DEFAULT_REGION: "us-east-1"
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: etcd-backup-s3
  namespace: kube-system
spec:
  schedule: "0 */4 * * *"
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        spec:
          nodeSelector:
            node-role.kubernetes.io/control-plane: ""
          tolerations:
          - key: node-role.kubernetes.io/control-plane
            effect: NoSchedule
          initContainers:
          # Step 1: Take the etcd snapshot
          - name: snapshot
            image: ghcr.io/siderolabs/talosctl:v1.12.7
            command:
            - talosctl
            args:
            - -n
            - "192.168.1.10"
            - etcd
            - snapshot
            - /backup/snapshot.db
            volumeMounts:
            - name: backup
              mountPath: /backup
          containers:
          # Step 2: Upload to S3
          - name: upload
            image: amazon/aws-cli:2.15.0
            args:
            - s3
            - cp
            - /backup/snapshot.db
            - s3://my-etcd-backups/my-talos-cluster/$(POD_NAME).snapshot
            env:
            - name: POD_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
            envFrom:
            - secretRef:
                name: etcd-backup-s3-credentials
            volumeMounts:
            - name: backup
              mountPath: /backup
              readOnly: true
          volumes:
          - name: backup
            emptyDir:
              sizeLimit: 10Gi
          restartPolicy: OnFailure
```

Apply this manifest the same way as the previous CronJob, by running `talosctl inject serviceaccount --roles=os:etcd:backup -f etcd-backup-s3-cronjob.yaml > etcd-backup-s3-cronjob-injected.yaml` before `kubectl apply`.

## Method 4: Using talosctl in an External Script

If you have a management machine that can reach your Talos nodes, you can run backups from there with a simple cron job:

```bash
#!/bin/bash
# etcd-backup.sh - Run this from your management machine

BACKUP_DIR="/backups/etcd"
CONTROL_PLANE_IP="192.168.1.10"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
SNAPSHOT_FILE="${BACKUP_DIR}/etcd-snapshot-${TIMESTAMP}.snapshot"

# Create backup directory
mkdir -p ${BACKUP_DIR}

# Take the snapshot
echo "Taking etcd snapshot from ${CONTROL_PLANE_IP}..."
talosctl -n ${CONTROL_PLANE_IP} etcd snapshot ${SNAPSHOT_FILE}

# Verify the snapshot
if [ -f "${SNAPSHOT_FILE}" ]; then
    SIZE=$(du -h ${SNAPSHOT_FILE} | cut -f1)
    echo "Snapshot saved: ${SNAPSHOT_FILE} (${SIZE})"
else
    echo "ERROR: Snapshot file not created!"
    exit 1
fi

# Remove old backups
echo "Cleaning up backups older than ${RETENTION_DAYS} days..."
find ${BACKUP_DIR} -name "etcd-snapshot-*.snapshot" -mtime +${RETENTION_DAYS} -delete

echo "Backup complete"
```

Add this to your crontab:

```bash
# Run etcd backup every 4 hours
0 */4 * * * /opt/scripts/etcd-backup.sh >> /var/log/etcd-backup.log 2>&1
```

## Verifying Backups

A backup you have never tested is not really a backup. Regularly verify that your snapshots are valid:

```bash
# Check snapshot metadata using etcdutl
etcdutl snapshot status ./etcd-snapshot-20260303-120000.snapshot --write-out=table

# Output shows:
# +----------+----------+------------+------------+
# |   HASH   | REVISION | TOTAL KEYS | TOTAL SIZE |
# +----------+----------+------------+------------+
# | 2c655123 |   987654 |      12345 |    234 MB  |
# +----------+----------+------------+------------+
```

A valid snapshot will show a hash, revision number, key count, and size. If the command returns an error, treat the snapshot as invalid.

## Backup Best Practices

Take backups frequently. Every 4 to 6 hours is a good starting point. For high-change clusters, consider hourly backups.

Store backups off-cluster. If your entire cluster goes down, you need the backups to be somewhere else. S3, Google Cloud Storage, or a separate NFS server are all good options.

Encrypt your backups. etcd contains secrets, RBAC rules, and other sensitive data. Make sure backup storage is encrypted at rest.

Keep at least 7 days of backup history. This gives you multiple recovery points if an issue is not discovered immediately.

Test restores regularly. At least once a quarter, practice restoring from a backup to a test cluster. This validates both the backup integrity and your restore procedure.

## Summary

Setting up automated etcd backups on Talos Linux can be done through Kubernetes CronJobs, external scripts using talosctl, or a combination of both. The key is to automate the process, store backups off-cluster, and regularly verify that your snapshots are valid. With reliable etcd backups in place, you can recover from many control-plane state failures.
