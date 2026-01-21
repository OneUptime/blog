# How to Back Up and Restore Loki Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Loki, Backup, Restore, Disaster Recovery, Data Protection, Operations

Description: A comprehensive guide to backing up and restoring Grafana Loki data, covering chunk and index backup strategies, object storage snapshots, configuration backup, and disaster recovery procedures.

---

Backing up Loki data ensures you can recover from data loss, migrate between clusters, or maintain compliance requirements. This guide covers comprehensive backup and restore strategies for Loki deployments.

## Prerequisites

Before starting, ensure you have:

- Loki deployment with object storage backend
- Access to storage backend (S3, GCS, Azure Blob)
- Understanding of Loki's storage architecture
- Backup storage location configured

## Understanding Loki Data

### Data Components

| Component | Location | Backup Method |
|-----------|----------|---------------|
| Chunks | Object storage | Storage snapshot/copy |
| Index | Object storage | Storage snapshot/copy |
| WAL | Local disk | Volume snapshot |
| Rules | Ruler storage | Export/copy |
| Configuration | ConfigMaps/files | Version control |

### Storage Layout

```
object-storage-bucket/
  - chunks/
      - tenant-id/
          - chunk-files...
  - index/
      - tenant-id/
          - index-files...
  - rules/
      - tenant-id/
          - rule-files...
```

## Configuration Backup

### Export Configuration

```bash
# Backup Kubernetes ConfigMaps
kubectl get configmap loki-config -n loki -o yaml > loki-config-backup.yaml

# Backup Helm values
helm get values loki -n loki > loki-values-backup.yaml

# Backup all Loki resources
kubectl get all -n loki -o yaml > loki-resources-backup.yaml
```

### Version Control

```yaml
# Store configuration in Git
# loki-config/config.yaml
auth_enabled: true

common:
  path_prefix: /loki
  replication_factor: 3
  ring:
    kvstore:
      store: memberlist

storage_config:
  aws:
    s3: s3://us-east-1/loki-bucket
```

## Object Storage Backup

### AWS S3 Backup

```bash
# Using AWS CLI
aws s3 sync s3://loki-bucket s3://loki-backup-bucket \
  --storage-class STANDARD_IA

# Using S3 Cross-Region Replication
# Configure in S3 console or terraform
```

### S3 Replication Policy

```json
{
  "Role": "arn:aws:iam::ACCOUNT:role/replication-role",
  "Rules": [
    {
      "ID": "LokiBackup",
      "Status": "Enabled",
      "Priority": 1,
      "Filter": {},
      "Destination": {
        "Bucket": "arn:aws:s3:::loki-backup-bucket",
        "StorageClass": "STANDARD_IA"
      },
      "DeleteMarkerReplication": {
        "Status": "Enabled"
      }
    }
  ]
}
```

### GCS Backup

```bash
# Using gsutil
gsutil -m rsync -r gs://loki-bucket gs://loki-backup-bucket

# Using Transfer Service for large datasets
# Configure in GCP Console
```

### Azure Blob Backup

```bash
# Using azcopy
azcopy sync 'https://storage.blob.core.windows.net/loki' \
  'https://backup.blob.core.windows.net/loki-backup' \
  --recursive

# Using Azure Blob Replication
# Configure in Azure Portal
```

## Backup Scripts

### Automated S3 Backup

```bash
#!/bin/bash
# backup-loki.sh

BACKUP_DATE=$(date +%Y-%m-%d)
SOURCE_BUCKET="s3://loki-production"
BACKUP_BUCKET="s3://loki-backups/${BACKUP_DATE}"

# Sync chunks
aws s3 sync ${SOURCE_BUCKET}/chunks ${BACKUP_BUCKET}/chunks \
  --storage-class GLACIER_IR

# Sync index
aws s3 sync ${SOURCE_BUCKET}/index ${BACKUP_BUCKET}/index \
  --storage-class STANDARD_IA

# Backup rules
aws s3 sync ${SOURCE_BUCKET}/rules ${BACKUP_BUCKET}/rules

# Export Kubernetes resources
kubectl get all -n loki -o yaml > /tmp/loki-k8s-${BACKUP_DATE}.yaml
aws s3 cp /tmp/loki-k8s-${BACKUP_DATE}.yaml ${BACKUP_BUCKET}/kubernetes/

# Cleanup old backups (keep 30 days)
aws s3 ls s3://loki-backups/ | while read -r line; do
  BACKUP_DIR=$(echo $line | awk '{print $2}')
  BACKUP_DIR_DATE=$(echo $BACKUP_DIR | tr -d '/')
  if [[ $(date -d "$BACKUP_DIR_DATE" +%s) -lt $(date -d "-30 days" +%s) ]]; then
    aws s3 rm s3://loki-backups/${BACKUP_DIR} --recursive
  fi
done

echo "Backup completed: ${BACKUP_BUCKET}"
```

### Kubernetes CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: loki-backup
  namespace: loki
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: loki-backup
          containers:
            - name: backup
              image: amazon/aws-cli:latest
              command:
                - /bin/sh
                - -c
                - |
                  aws s3 sync s3://loki-production s3://loki-backups/$(date +%Y-%m-%d)
              env:
                - name: AWS_REGION
                  value: us-east-1
              envFrom:
                - secretRef:
                    name: aws-credentials
          restartPolicy: OnFailure
```

## WAL Backup

### Volume Snapshots

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: loki-ingester-wal-snapshot
  namespace: loki
spec:
  volumeSnapshotClassName: csi-aws-vsc
  source:
    persistentVolumeClaimName: data-loki-ingester-0
```

### WAL Backup Script

```bash
#!/bin/bash
# backup-wal.sh

# For each ingester pod
for i in 0 1 2; do
  kubectl exec -n loki loki-ingester-$i -- \
    tar czf - /loki/wal | \
    aws s3 cp - s3://loki-backups/wal/ingester-$i-$(date +%Y%m%d).tar.gz
done
```

## Rules Backup

### Export Rules via API

```bash
# Export all rules
curl http://loki:3100/loki/api/v1/rules \
  -H "X-Scope-OrgID: tenant-1" \
  > rules-backup-tenant-1.yaml

# For each tenant
for tenant in tenant-1 tenant-2 tenant-3; do
  curl http://loki:3100/loki/api/v1/rules \
    -H "X-Scope-OrgID: ${tenant}" \
    > rules-backup-${tenant}.yaml
done
```

### Rules Backup Script

```bash
#!/bin/bash
# backup-rules.sh

LOKI_URL="http://loki-gateway:3100"
BACKUP_DIR="/backups/rules/$(date +%Y-%m-%d)"
TENANTS=$(curl -s ${LOKI_URL}/loki/api/v1/labels | jq -r '.data[]' | grep tenant)

mkdir -p ${BACKUP_DIR}

for tenant in ${TENANTS}; do
  curl -s "${LOKI_URL}/loki/api/v1/rules" \
    -H "X-Scope-OrgID: ${tenant}" \
    > "${BACKUP_DIR}/${tenant}-rules.yaml"
done

tar czf /backups/rules-$(date +%Y-%m-%d).tar.gz ${BACKUP_DIR}
```

## Restore Procedures

### Full Restore from Object Storage

```bash
#!/bin/bash
# restore-loki.sh

RESTORE_DATE=$1
BACKUP_BUCKET="s3://loki-backups/${RESTORE_DATE}"
TARGET_BUCKET="s3://loki-production"

# Stop Loki components
kubectl scale deployment -n loki --replicas=0 \
  loki-distributor loki-querier loki-query-frontend

kubectl scale statefulset -n loki --replicas=0 loki-ingester

# Restore chunks
aws s3 sync ${BACKUP_BUCKET}/chunks ${TARGET_BUCKET}/chunks

# Restore index
aws s3 sync ${BACKUP_BUCKET}/index ${TARGET_BUCKET}/index

# Restore rules
aws s3 sync ${BACKUP_BUCKET}/rules ${TARGET_BUCKET}/rules

# Restart Loki components
kubectl scale statefulset -n loki --replicas=3 loki-ingester
kubectl scale deployment -n loki --replicas=3 \
  loki-distributor loki-querier loki-query-frontend

# Wait for ring to stabilize
sleep 60
curl http://loki:3100/ring
```

### Rules Restore

```bash
# Restore rules via API
for file in rules-backup-*.yaml; do
  tenant=$(echo $file | sed 's/rules-backup-\(.*\)\.yaml/\1/')
  curl -X POST "http://loki:3100/loki/api/v1/rules/${tenant}" \
    -H "X-Scope-OrgID: ${tenant}" \
    -H "Content-Type: application/yaml" \
    -d @${file}
done
```

### WAL Restore

```bash
#!/bin/bash
# restore-wal.sh

RESTORE_DATE=$1

# Scale down ingesters
kubectl scale statefulset -n loki --replicas=0 loki-ingester

# Restore WAL for each ingester
for i in 0 1 2; do
  # Clear existing WAL
  kubectl exec -n loki loki-ingester-$i -- rm -rf /loki/wal/*

  # Restore from backup
  aws s3 cp s3://loki-backups/wal/ingester-$i-${RESTORE_DATE}.tar.gz - | \
    kubectl exec -i -n loki loki-ingester-$i -- tar xzf - -C /
done

# Scale up ingesters
kubectl scale statefulset -n loki --replicas=3 loki-ingester
```

## Disaster Recovery

### DR Setup

```yaml
# Primary cluster configuration
storage_config:
  aws:
    s3: s3://us-east-1/loki-primary
    s3forcepathstyle: false

# DR cluster configuration (different region)
storage_config:
  aws:
    s3: s3://us-west-2/loki-dr
    s3forcepathstyle: false
```

### Cross-Region Replication

```hcl
# Terraform S3 replication
resource "aws_s3_bucket_replication_configuration" "loki" {
  bucket = aws_s3_bucket.loki_primary.id
  role   = aws_iam_role.replication.arn

  rule {
    id     = "loki-dr"
    status = "Enabled"

    destination {
      bucket        = aws_s3_bucket.loki_dr.arn
      storage_class = "STANDARD_IA"
    }
  }
}
```

### Failover Procedure

```bash
#!/bin/bash
# failover-to-dr.sh

# 1. Update DNS to point to DR cluster
# 2. Update Promtail/agents to send to DR

# Scale up DR cluster
kubectl --context=dr-cluster scale deployment -n loki \
  --replicas=3 loki-distributor loki-querier

# Verify DR cluster health
curl http://loki-dr:3100/ready

# Update Grafana data source
# (via API or manually)
```

## Backup Verification

### Verify Backup Integrity

```bash
#!/bin/bash
# verify-backup.sh

BACKUP_DATE=$1
BACKUP_BUCKET="s3://loki-backups/${BACKUP_DATE}"

# Check chunk count
CHUNK_COUNT=$(aws s3 ls ${BACKUP_BUCKET}/chunks/ --recursive | wc -l)
echo "Chunks backed up: ${CHUNK_COUNT}"

# Check index count
INDEX_COUNT=$(aws s3 ls ${BACKUP_BUCKET}/index/ --recursive | wc -l)
echo "Index files backed up: ${INDEX_COUNT}"

# Verify file sizes
aws s3 ls ${BACKUP_BUCKET}/ --recursive --human-readable | tail -20

# Check for zero-byte files
ZERO_BYTE=$(aws s3 ls ${BACKUP_BUCKET}/ --recursive | awk '$3 == 0 {print}' | wc -l)
if [ $ZERO_BYTE -gt 0 ]; then
  echo "WARNING: Found ${ZERO_BYTE} zero-byte files"
fi
```

### Test Restore

```bash
#!/bin/bash
# test-restore.sh

# Deploy test Loki instance
kubectl apply -f loki-test-deployment.yaml

# Restore to test instance
./restore-loki.sh 2024-01-15

# Run verification queries
curl -G "http://loki-test:3100/loki/api/v1/query_range" \
  --data-urlencode 'query={job="test"}' \
  --data-urlencode 'start=2024-01-14T00:00:00Z' \
  --data-urlencode 'end=2024-01-15T00:00:00Z'

# Cleanup test instance
kubectl delete -f loki-test-deployment.yaml
```

## Best Practices

### Backup Strategy

1. **Daily backups** of all data
2. **Continuous replication** for DR
3. **Weekly verification** of backup integrity
4. **Monthly restore tests**
5. **Retention policy** aligned with compliance

### What to Back Up

| Component | Frequency | Retention |
|-----------|-----------|-----------|
| Chunks | Daily | 90 days |
| Index | Daily | 90 days |
| Rules | Daily | 30 days |
| Configuration | On change | Indefinite |
| WAL | Hourly (HA) | 24 hours |

### Security

1. Encrypt backups at rest
2. Use separate backup credentials
3. Restrict backup access
4. Audit backup access logs

## Conclusion

Comprehensive backup and restore procedures protect against data loss. Key takeaways:

- Back up all components: chunks, index, rules, configuration
- Use object storage replication for automatic backup
- Test restore procedures regularly
- Implement cross-region DR for critical deployments
- Document and automate backup processes

With proper backup strategies, you can recover from any disaster scenario and maintain data integrity.
