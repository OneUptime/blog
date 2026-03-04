# How to Set Up Velero for Cluster Backup on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Velero, Kubernetes, Backups, Disaster Recovery

Description: A complete guide to installing and configuring Velero on Talos Linux for Kubernetes cluster backup and disaster recovery.

---

Backing up your Kubernetes cluster is something you should set up on day one, not after your first data loss incident. Velero (formerly Heptio Ark) is the most widely used open-source tool for backing up and restoring Kubernetes resources and persistent volumes. It supports scheduled backups, resource filtering, and multiple storage providers.

On Talos Linux, where the OS is immutable and stateless, Velero is especially important. While Talos nodes can be rebuilt from their machine configuration, the Kubernetes resources, application data, and persistent volumes running on top need their own backup strategy. This guide walks through the complete Velero setup on a Talos Linux cluster.

## Prerequisites

- A running Talos Linux cluster
- kubectl and Helm installed locally
- Object storage (AWS S3, MinIO, GCS, or Azure Blob Storage)
- The Velero CLI installed

## Installing the Velero CLI

```bash
# macOS
brew install velero

# Linux
VELERO_VERSION=$(curl -s https://api.github.com/repos/vmware-tanzu/velero/releases/latest | grep tag_name | cut -d '"' -f4)
wget "https://github.com/vmware-tanzu/velero/releases/download/${VELERO_VERSION}/velero-${VELERO_VERSION}-linux-amd64.tar.gz"
tar -xzf velero-${VELERO_VERSION}-linux-amd64.tar.gz
sudo mv velero-${VELERO_VERSION}-linux-amd64/velero /usr/local/bin/

# Verify
velero version
```

## Installing Velero with AWS S3

For AWS S3 as the backup storage location:

```bash
# Create a credentials file for AWS
cat > credentials-velero <<EOF
[default]
aws_access_key_id=AKIAIOSFODNN7EXAMPLE
aws_secret_access_key=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
EOF

# Install Velero
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.9.0 \
  --bucket velero-backups-talos \
  --backup-location-config region=us-east-1 \
  --secret-file ./credentials-velero \
  --snapshot-location-config region=us-east-1 \
  --use-node-agent \
  --default-volumes-to-fs-backup

# Clean up the credentials file
rm credentials-velero
```

## Installing Velero with MinIO (On-Premises)

For on-premises Talos clusters, MinIO provides S3-compatible storage.

First, deploy MinIO.

```yaml
# minio-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: minio
  namespace: velero
spec:
  replicas: 1
  selector:
    matchLabels:
      app: minio
  template:
    metadata:
      labels:
        app: minio
    spec:
      containers:
        - name: minio
          image: minio/minio:latest
          args:
            - server
            - /data
            - --console-address
            - ":9001"
          env:
            - name: MINIO_ROOT_USER
              value: "minioadmin"
            - name: MINIO_ROOT_PASSWORD
              value: "minioadmin123"
          ports:
            - containerPort: 9000
            - containerPort: 9001
          volumeMounts:
            - name: data
              mountPath: /data
          resources:
            requests:
              cpu: 200m
              memory: 256Mi
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: minio-data
---
apiVersion: v1
kind: Service
metadata:
  name: minio
  namespace: velero
spec:
  selector:
    app: minio
  ports:
    - name: api
      port: 9000
    - name: console
      port: 9001
```

Create the MinIO bucket and install Velero.

```bash
# Create the credentials file for MinIO
cat > credentials-minio <<EOF
[default]
aws_access_key_id=minioadmin
aws_secret_access_key=minioadmin123
EOF

# Install Velero pointing to MinIO
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.9.0 \
  --bucket velero-backups \
  --backup-location-config region=minio,s3ForcePathStyle=true,s3Url=http://minio.velero.svc:9000 \
  --secret-file ./credentials-minio \
  --use-node-agent \
  --default-volumes-to-fs-backup

rm credentials-minio
```

## Verifying the Installation

```bash
# Check Velero pods
kubectl get pods -n velero

# Check the backup storage location status
velero backup-location get

# Check for any issues
velero get backup-locations
```

The backup location should show "Available" status.

## Creating Your First Backup

```bash
# Back up the entire cluster
velero backup create full-cluster-backup

# Back up a specific namespace
velero backup create app-backup --include-namespaces production

# Back up with label selector
velero backup create team-alpha-backup --selector team=alpha

# Back up specific resource types
velero backup create deployments-backup --include-resources deployments,services,configmaps

# Check backup status
velero backup describe full-cluster-backup
velero backup logs full-cluster-backup
```

## Configuring Scheduled Backups

Set up automated backups on a schedule.

```bash
# Daily backup of all namespaces, retain for 30 days
velero schedule create daily-full \
  --schedule "0 2 * * *" \
  --ttl 720h

# Hourly backup of critical namespaces, retain for 7 days
velero schedule create hourly-critical \
  --schedule "0 * * * *" \
  --include-namespaces production,staging \
  --ttl 168h

# Weekly full backup, retain for 90 days
velero schedule create weekly-full \
  --schedule "0 3 * * 0" \
  --ttl 2160h

# Verify schedules
velero schedule get
```

## Backing Up Persistent Volumes

Velero supports two methods for backing up persistent volumes:

### File System Backup (Restic/Kopia)

This uses the node agent to copy files from PVs. It works with any storage provider.

```yaml
# Annotate pods to include their volumes in backups
apiVersion: apps/v1
kind: Deployment
metadata:
  name: database
  namespace: production
spec:
  template:
    metadata:
      annotations:
        # Specify which volumes to back up
        backup.velero.io/backup-volumes: data,logs
    spec:
      containers:
        - name: postgres
          image: postgres:15
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
            - name: logs
              mountPath: /var/log/postgresql
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: postgres-data
        - name: logs
          persistentVolumeClaim:
            claimName: postgres-logs
```

### Volume Snapshots (CSI)

If your storage provider supports CSI snapshots, Velero can use those instead.

```bash
# Install the CSI snapshot plugin
velero plugin add velero/velero-plugin-for-csi:v0.7.0

# Enable CSI snapshots in the backup
velero backup create snapshot-backup \
  --include-namespaces production \
  --snapshot-volumes \
  --csi-snapshot-timeout 10m
```

## Restoring from Backup

```bash
# List available backups
velero backup get

# Restore everything from a backup
velero restore create --from-backup full-cluster-backup

# Restore a specific namespace
velero restore create --from-backup full-cluster-backup \
  --include-namespaces production

# Restore specific resources
velero restore create --from-backup full-cluster-backup \
  --include-resources deployments,services

# Restore to a different namespace
velero restore create --from-backup full-cluster-backup \
  --include-namespaces production \
  --namespace-mappings production:production-restored

# Check restore status
velero restore get
velero restore describe <restore-name>
velero restore logs <restore-name>
```

## Backup Hooks

Run commands before or after backups to ensure data consistency.

```yaml
# deployment-with-hooks.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: database
  namespace: production
spec:
  template:
    metadata:
      annotations:
        # Pre-backup hook: freeze the database
        pre.hook.backup.velero.io/container: postgres
        pre.hook.backup.velero.io/command: '["/bin/bash", "-c", "pg_dump -U postgres mydb > /var/lib/postgresql/backup/dump.sql"]'
        pre.hook.backup.velero.io/timeout: 120s
        # Post-backup hook: cleanup
        post.hook.backup.velero.io/container: postgres
        post.hook.backup.velero.io/command: '["/bin/bash", "-c", "rm -f /var/lib/postgresql/backup/dump.sql"]'
    spec:
      containers:
        - name: postgres
          image: postgres:15
```

## Monitoring Velero

```bash
# Check recent backup status
velero backup get --output wide

# Check for failed backups
velero backup get | grep -v Completed

# Describe a backup for detailed information
velero backup describe daily-full-20240115020000 --details
```

Set up Prometheus alerts for backup failures.

```yaml
# velero-alerts.yaml
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
          expr: |
            velero_backup_failure_total > velero_backup_success_total
          for: 1h
          labels:
            severity: critical
          annotations:
            summary: "Velero backups are failing"
        - alert: VeleroBackupNotRecent
          expr: |
            time() - velero_backup_last_successful_timestamp > 86400
          for: 1h
          labels:
            severity: warning
          annotations:
            summary: "No successful Velero backup in the last 24 hours"
```

## Talos-Specific Backup Considerations

On Talos Linux, remember these additional backup needs:

1. **Machine configuration**: Back up your Talos machine configs separately. Velero only backs up Kubernetes resources, not the Talos configuration.

```bash
# Back up Talos machine configs
talosctl get machineconfig -o yaml --nodes 10.0.0.10 > talos-config-backup.yaml
```

2. **etcd snapshots**: For the most thorough backup, also take etcd snapshots.

```bash
# Take an etcd snapshot via talosctl
talosctl etcd snapshot db.snapshot --nodes 10.0.0.10
```

3. **Encryption keys**: If you have secrets encryption enabled, back up the encryption keys outside the cluster.

## Wrapping Up

Velero on Talos Linux gives you a comprehensive backup solution for your Kubernetes resources and persistent data. Set up scheduled backups on day one, test your restores regularly, and monitor for failures. On Talos Linux, complement Velero with Talos machine config backups and etcd snapshots for a complete disaster recovery strategy. The immutable nature of Talos makes node recovery straightforward, but the data and configuration running on top of Kubernetes needs Velero to ensure you can recover from any scenario.
