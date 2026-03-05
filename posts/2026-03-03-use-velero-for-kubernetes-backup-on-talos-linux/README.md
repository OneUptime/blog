# How to Use Velero for Kubernetes Backup on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Velero, Kubernetes, Backup, Disaster Recovery

Description: Step-by-step guide to installing and configuring Velero for Kubernetes backups on Talos Linux clusters with practical examples and scheduling.

---

Backing up Kubernetes clusters is essential for any production environment. While Talos Linux handles the OS-level configuration through machine configs and etcd snapshots, your Kubernetes workloads - deployments, services, configmaps, persistent volumes - need their own backup strategy. Velero is the most widely adopted open-source tool for this job, and it works well with Talos Linux clusters.

This guide covers installing Velero, configuring backup storage, creating backup schedules, and restoring workloads on a Talos Linux cluster.

## What Velero Does

Velero backs up Kubernetes resources and persistent volume data. It can snapshot your entire cluster state or target specific namespaces and resource types. When you need to restore, Velero recreates those resources in the cluster. It supports multiple storage backends including AWS S3, Google Cloud Storage, Azure Blob Storage, and any S3-compatible object store like MinIO.

For Talos Linux users, Velero complements the etcd snapshots that Talos provides natively. While etcd snapshots capture the raw Kubernetes state, Velero gives you more granular control over what gets backed up and restored.

## Prerequisites

Before installing Velero, you need:

- A running Talos Linux cluster with `kubectl` access
- An S3-compatible object storage bucket
- The Velero CLI installed on your workstation

```bash
# Install Velero CLI on macOS
brew install velero

# Or download directly
wget https://github.com/vmware-tanzu/velero/releases/download/v1.14.0/velero-v1.14.0-linux-amd64.tar.gz
tar -xzf velero-v1.14.0-linux-amd64.tar.gz
sudo mv velero-v1.14.0-linux-amd64/velero /usr/local/bin/
```

## Setting Up Object Storage

You need a bucket for Velero to store backups. Here is how to set one up with AWS S3 and MinIO.

### AWS S3

```bash
# Create the S3 bucket
aws s3api create-bucket \
  --bucket talos-cluster-backups \
  --region us-east-1

# Create an IAM user for Velero
aws iam create-user --user-name velero-backup

# Create the credentials file
cat > velero-credentials <<EOF
[default]
aws_access_key_id=YOUR_ACCESS_KEY
aws_secret_access_key=YOUR_SECRET_KEY
EOF
```

### MinIO (Self-hosted)

If you prefer keeping backups on-premises, MinIO is a great option.

```bash
# Deploy MinIO in the cluster
kubectl create namespace minio

kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: minio
  namespace: minio
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
        args: ["server", "/data"]
        env:
        - name: MINIO_ROOT_USER
          value: "minioadmin"
        - name: MINIO_ROOT_PASSWORD
          value: "minioadmin123"
        ports:
        - containerPort: 9000
        volumeMounts:
        - name: data
          mountPath: /data
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: minio-data
---
apiVersion: v1
kind: Service
metadata:
  name: minio
  namespace: minio
spec:
  ports:
  - port: 9000
    targetPort: 9000
  selector:
    app: minio
EOF
```

## Installing Velero on Talos Linux

Install Velero using the CLI. The installation deploys the Velero server components into your cluster.

### With AWS S3

```bash
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.10.0 \
  --bucket talos-cluster-backups \
  --secret-file ./velero-credentials \
  --backup-location-config region=us-east-1 \
  --snapshot-location-config region=us-east-1 \
  --use-node-agent
```

### With MinIO

```bash
# Create credentials file for MinIO
cat > minio-credentials <<EOF
[default]
aws_access_key_id=minioadmin
aws_secret_access_key=minioadmin123
EOF

velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.10.0 \
  --bucket velero-backups \
  --secret-file ./minio-credentials \
  --backup-location-config \
    region=minio,s3ForcePathStyle=true,s3Url=http://minio.minio.svc:9000 \
  --use-node-agent
```

### Verify the Installation

```bash
# Check Velero pods are running
kubectl get pods -n velero

# Check backup storage location status
velero backup-location get

# Expected output should show the location as "Available"
```

## Creating Backups

### Full Cluster Backup

```bash
# Back up everything in the cluster
velero backup create full-backup-$(date +%Y%m%d)

# Check backup status
velero backup describe full-backup-20260303
```

### Namespace-Specific Backup

```bash
# Back up only the production namespace
velero backup create prod-backup \
  --include-namespaces production

# Back up multiple namespaces
velero backup create app-backup \
  --include-namespaces production,staging,monitoring
```

### Backup with Resource Filtering

```bash
# Back up only deployments and services
velero backup create workload-backup \
  --include-resources deployments,services,configmaps

# Exclude certain namespaces
velero backup create cluster-backup \
  --exclude-namespaces kube-system,velero
```

### Backup with Labels

```bash
# Back up resources with specific labels
velero backup create team-a-backup \
  --selector team=alpha
```

## Setting Up Scheduled Backups

Scheduled backups are critical for production clusters. Velero uses cron syntax for scheduling.

```bash
# Daily full backup at 2 AM, keep for 30 days
velero schedule create daily-full \
  --schedule="0 2 * * *" \
  --ttl 720h

# Hourly backup of production namespace, keep for 7 days
velero schedule create hourly-prod \
  --schedule="0 * * * *" \
  --include-namespaces production \
  --ttl 168h

# Weekly backup with persistent volumes, keep for 90 days
velero schedule create weekly-full \
  --schedule="0 3 * * 0" \
  --default-volumes-to-fs-backup \
  --ttl 2160h
```

```bash
# List all schedules
velero schedule get

# Check when the next backup will run
velero schedule describe daily-full
```

## Backing Up Persistent Volumes

By default, Velero backs up Kubernetes resources but not the data inside persistent volumes. You need to enable volume backups explicitly.

### Using File System Backup (Restic/Kopia)

```bash
# Create a backup that includes persistent volume data
velero backup create pv-backup \
  --default-volumes-to-fs-backup

# Or annotate specific pods to opt in to volume backup
kubectl annotate pod my-app-pod-xyz \
  backup.velero.io/backup-volumes=data-volume
```

### Using Volume Snapshots (CSI)

If your storage provider supports CSI snapshots:

```bash
# Install the CSI plugin
velero plugin add velero/velero-plugin-for-csi:v0.7.0

# Enable CSI snapshots in Velero
kubectl patch deployment velero -n velero \
  --type=json \
  -p='[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--features=EnableCSI"}]'
```

## Restoring from Backups

### Full Restore

```bash
# List available backups
velero backup get

# Restore from a specific backup
velero restore create --from-backup full-backup-20260303

# Check restore status
velero restore describe full-backup-20260303-restore
velero restore logs full-backup-20260303-restore
```

### Partial Restore

```bash
# Restore only a specific namespace
velero restore create --from-backup full-backup-20260303 \
  --include-namespaces production

# Restore specific resources
velero restore create --from-backup full-backup-20260303 \
  --include-resources deployments,services

# Restore to a different namespace
velero restore create --from-backup prod-backup \
  --namespace-mappings production:production-restored
```

## Monitoring Velero

Set up monitoring to make sure your backups are actually running and succeeding.

```bash
# Check backup status regularly
velero backup get

# Look for failed backups
velero backup get | grep -v Completed

# Get detailed info on failures
velero backup describe failed-backup-name --details
velero backup logs failed-backup-name
```

For Prometheus-based monitoring, Velero exposes metrics on port 8085:

```yaml
# ServiceMonitor for Prometheus
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: velero
  namespace: velero
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: velero
  endpoints:
  - port: http-monitoring
    interval: 30s
```

## Talos-Specific Considerations

When running Velero on Talos Linux, keep these points in mind:

- Talos nodes have no writable filesystem for Velero's node agent. Make sure you configure the node agent to use `/var` which Talos makes available for ephemeral storage.
- Since Talos is immutable, you cannot install the Velero CLI on the nodes themselves. All operations go through your workstation or CI/CD pipelines.
- Combine Velero backups with Talos etcd snapshots for complete coverage. Velero handles workloads; etcd snapshots handle cluster-level state.

## Conclusion

Velero provides a solid backup and restore solution for Kubernetes workloads running on Talos Linux. By setting up scheduled backups, including persistent volume data, and regularly testing restores, you can build confidence that your applications are recoverable. Combined with Talos's native etcd snapshots, you get full coverage of both the cluster infrastructure and the workloads running on top of it. Start with basic namespace backups, add volume protection, and build from there.
