# How to Implement Backup Best Practices in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Backup, Velero, Disaster Recovery, Kubernetes, etcd

Description: Implement backup best practices in Rancher covering etcd backups, Rancher management plane backups, application data with Velero, and disaster recovery testing to ensure business continuity.

## Introduction

Backup strategy in Rancher covers three distinct layers: the Rancher management plane (including cluster configurations), Kubernetes etcd (cluster state), and application data (PVCs, databases). Each layer requires different backup tools and frequencies. Without all three layers covered, disaster recovery will be incomplete.

## Backup Layers

| Layer | What to back up | Tool | Frequency |
|---|---|---|---|
| Rancher management plane | Cluster configs, RBAC, Projects | Rancher Backup Operator | Daily |
| Kubernetes etcd | Cluster state, deployments | RKE2 built-in snapshots | Every 6 hours |
| Application data | PVCs, databases | Velero + DB-specific tools | Daily / hourly |

## Step 1: Rancher Management Plane Backup

```bash
# Install Rancher Backup Operator
helm repo add rancher-charts https://charts.rancher.io
helm repo update

# Choose a rancher-backup chart version compatible with your Rancher version
CHART_VERSION=<chart-version>

helm install rancher-backup-crd rancher-charts/rancher-backup-crd \
  --namespace cattle-resources-system \
  --create-namespace \
  --version $CHART_VERSION
helm install rancher-backup rancher-charts/rancher-backup \
  --namespace cattle-resources-system \
  --version $CHART_VERSION

# Create the S3 credential secret
kubectl create secret generic s3-creds \
  --from-literal=accessKey=<access-key> \
  --from-literal=secretKey=<secret-key> \
  -n cattle-resources-system

# Create the backup encryption secret
kubectl create secret generic backup-encryption-secret \
  --from-file=./encryption-provider-config.yaml \
  -n cattle-resources-system

# Create scheduled backup
kubectl apply -f - <<EOF
apiVersion: resources.cattle.io/v1
kind: Backup
metadata:
  name: rancher-daily
spec:
  resourceSetName: rancher-resource-set-full
  storageLocation:
    s3:
      credentialSecretName: s3-creds
      credentialSecretNamespace: cattle-resources-system
      bucketName: rancher-management-backups
      folder: rancher-local
      region: us-east-1
      endpoint: s3.us-east-1.amazonaws.com
  schedule: "0 2 * * *"      # Daily at 2 AM UTC
  retentionCount: 14          # Keep 14 days
  encryptionConfigSecretName: backup-encryption-secret
EOF
```

## Step 2: etcd Backup

RKE2 automatically backs up etcd. For restores to new hosts, keep a copy of `/var/lib/rancher/rke2/server/token` with your snapshot.

```yaml
# /etc/rancher/rke2/config.yaml
etcd-snapshot-schedule-cron: "0 */6 * * *"    # Every 6 hours
etcd-snapshot-retention: 10                    # Keep 10 snapshots
etcd-snapshot-dir: /var/lib/rancher/rke2/server/db/snapshots
# Optionally upload to S3
etcd-s3: true
etcd-s3-bucket: my-etcd-backups
etcd-s3-region: us-east-1
etcd-s3-retention: 10
etcd-s3-access-key: <access-key>
etcd-s3-secret-key: <secret-key>
```

```bash
# Manually trigger an etcd snapshot
rke2 etcd-snapshot save --name pre-upgrade-backup

# List available snapshots
rke2 etcd-snapshot list

# Restore from snapshot on a server node
systemctl stop rke2-server
rke2 server --cluster-reset --cluster-reset-restore-path=/path/to/snapshot
systemctl start rke2-server

# In an HA cluster, remove /var/lib/rancher/rke2/server/db on the other
# server nodes, then start rke2-server on those nodes so they rejoin.
```

## Step 3: Application Data Backup with Velero

```bash
# Install Velero
# Use an AWS plugin version compatible with your Velero CLI release.
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.13.1 \
  --bucket my-velero-backups \
  --secret-file ./credentials-velero \
  --backup-location-config region=us-east-1 \
  --use-node-agent \
  --default-volumes-to-fs-backup

# Create daily backup schedule
velero schedule create daily-production \
  --schedule="0 3 * * *" \
  --include-namespaces production \
  --ttl 720h0m0s             # Retain for 30 days

# Backup before upgrades
velero backup create pre-upgrade-$(date +%Y%m%d) \
  --include-namespaces production,staging \
  --wait
```

## Step 4: Database-Specific Backups

For databases, use application-consistent backups in addition to Velero:

```yaml
# CronJob for PostgreSQL backup
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: production
spec:
  schedule: "0 1 * * *"    # Daily at 1 AM
  jobTemplate:
    spec:
      template:
        spec:
          initContainers:
            - name: pg-dump
              image: postgres:15
              command:
                - /bin/sh
                - -c
                - |
                  pg_dump -h postgres-svc -U "$PGUSER" "$PGDATABASE" | \
                  gzip > /backup/postgres.sql.gz
              env:
                - name: PGUSER
                  valueFrom:
                    secretKeyRef:
                      name: postgres-secret
                      key: username
                - name: PGPASSWORD
                  valueFrom:
                    secretKeyRef:
                      name: postgres-secret
                      key: password
                - name: PGDATABASE
                  valueFrom:
                    secretKeyRef:
                      name: postgres-secret
                      key: database
              volumeMounts:
                - name: backup
                  mountPath: /backup
          containers:
            - name: upload-backup
              image: amazon/aws-cli:2
              command:
                - /bin/sh
                - -c
                - |
                  aws s3 cp /backup/postgres.sql.gz \
                  s3://db-backups/postgres-$(date +%Y%m%d).sql.gz
              env:
                - name: AWS_REGION
                  value: us-east-1
                - name: AWS_ACCESS_KEY_ID
                  valueFrom:
                    secretKeyRef:
                      name: aws-credentials
                      key: access-key-id
                - name: AWS_SECRET_ACCESS_KEY
                  valueFrom:
                    secretKeyRef:
                      name: aws-credentials
                      key: secret-access-key
              volumeMounts:
                - name: backup
                  mountPath: /backup
          volumes:
            - name: backup
              emptyDir: {}
          restartPolicy: OnFailure
```

## Step 5: Test Your Backups

```bash
# Monthly DR drill: restore Rancher in a same-version test environment
# 1. Create a test cluster and install the rancher-backup operator
# 2. Restore from backup
kubectl apply -f - <<EOF
apiVersion: resources.cattle.io/v1
kind: Restore
metadata:
  name: rancher-restore-test
spec:
  backupFilename: rancher-daily-752ecd87-d958-4d20-8350-072f8d090045-2026-03-01T02-00-00Z.tar.gz.enc
  prune: false
  encryptionConfigSecretName: backup-encryption-secret
  storageLocation:
    s3:
      credentialSecretName: s3-creds
      credentialSecretNamespace: cattle-resources-system
      bucketName: rancher-management-backups
      folder: rancher-local
      region: us-east-1
      endpoint: s3.us-east-1.amazonaws.com
EOF

# 3. Verify cluster configurations are present
# 4. Verify managed cluster definitions are present; agents only reconnect
#    automatically if the restored Rancher uses the same server URL and certificates.

# Test Velero restore
velero restore create --from-backup daily-production-20260301000000 \
  --include-namespaces production \
  --namespace-mappings production:production-restore \
  --wait
```

## Backup Checklist

- Rancher management plane: daily backup to S3, 14-day retention
- etcd: every 6 hours, uploaded to S3, server token stored securely
- Application data: Velero daily backup, 30-day retention
- Databases: application-consistent backups hourly or daily
- Backups encrypted at rest
- Restore procedures documented and tested quarterly
- Backup success/failure alerts configured

## Conclusion

A complete Rancher backup strategy requires all three layers: management plane, etcd, and application data. The Rancher Backup Operator handles the management plane, RKE2's built-in snapshots handle etcd, and Velero handles application workloads. Test restores quarterly-untested backups are not backups. Store backups in a separate AWS account or geographic region to protect against account compromise or regional failures.
