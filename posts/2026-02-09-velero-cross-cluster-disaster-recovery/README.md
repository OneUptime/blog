# How to Implement Cross-Cluster Velero Restore for Disaster Recovery Scenarios

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Velero, Kubernetes, Disaster Recovery, Multi-Cluster, Backup

Description: Master cross-cluster disaster recovery with Velero for Kubernetes. Learn how to configure multi-cluster backup strategies, automate failover, and test recovery procedures.

---

Disaster recovery requires the ability to restore your applications to a completely different cluster when your primary environment fails. Velero's cross-cluster restore capability enables this by storing backups in shared object storage accessible from multiple Kubernetes clusters. When disaster strikes, you can restore your entire application stack to a standby cluster in minutes, maintaining business continuity even during catastrophic infrastructure failures.

## Understanding Cross-Cluster Architecture

Cross-cluster disaster recovery with Velero works by storing backup data in centralized object storage like Amazon S3, Azure Blob Storage, or Google Cloud Storage. Multiple Kubernetes clusters configure Velero to use the same backup storage location, allowing any cluster to restore backups created by another cluster.

This architecture separates your backup data from your cluster infrastructure, ensuring backups survive even if an entire cluster becomes unavailable. The recovery cluster can be in a different region, cloud provider, or data center, providing geographic redundancy.

## Prerequisites for Cross-Cluster DR

Before implementing cross-cluster recovery, ensure you have:

1. Two or more Kubernetes clusters (primary and DR)
2. Shared object storage accessible from all clusters
3. Network connectivity between clusters and storage
4. Matching Kubernetes versions (or within supported skew)
5. Compatible storage classes in both clusters

## Configuring Primary Cluster Backup

Install Velero on your primary production cluster:

```bash
# Install Velero on primary cluster
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.9.0 \
  --bucket disaster-recovery-backups \
  --backup-location-config region=us-east-1 \
  --snapshot-location-config region=us-east-1 \
  --secret-file ./credentials-velero \
  --use-node-agent
```

Create a comprehensive backup schedule:

```yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: dr-backup
  namespace: velero
spec:
  # Backup every 6 hours
  schedule: "0 */6 * * *"
  template:
    ttl: 720h  # 30 days retention
    includedNamespaces:
    - '*'
    excludedNamespaces:
    - kube-system
    - kube-public
    - velero
    snapshotVolumes: true
    defaultVolumesToFsBackup: true
    labels:
      purpose: disaster-recovery
      cluster: primary
```

This schedule creates regular backups with both volume snapshots and file-level backups for maximum compatibility.

## Configuring DR Cluster for Restore

Install Velero on your disaster recovery cluster using the same backup storage location:

```bash
# Install Velero on DR cluster
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.9.0 \
  --bucket disaster-recovery-backups \
  --backup-location-config region=us-east-1 \
  --no-default-backup-location \
  --secret-file ./credentials-velero \
  --use-node-agent
```

Configure the backup storage location to read from the primary cluster's backups:

```yaml
apiVersion: velero.io/v1
kind: BackupStorageLocation
metadata:
  name: primary-cluster-backups
  namespace: velero
spec:
  provider: aws
  objectStorage:
    bucket: disaster-recovery-backups
    prefix: primary-cluster
  config:
    region: us-east-1
  # Set to read-only on DR cluster
  accessMode: ReadOnly
```

Apply the configuration:

```bash
kubectl apply -f backup-storage-location.yaml

# Verify DR cluster can see primary backups
velero backup get
```

You should see backups created by the primary cluster.

## Performing Cross-Cluster Restore

When disaster strikes, restore to the DR cluster:

```bash
# List available backups from primary cluster
velero backup get

# Restore the most recent backup
velero restore create dr-restore-$(date +%s) \
  --from-backup dr-backup-20240209020000 \
  --wait

# Monitor restore progress
velero restore describe dr-restore-1707447600
```

For faster recovery, restore only critical namespaces first:

```bash
# Restore critical services immediately
velero restore create critical-restore \
  --from-backup dr-backup-20240209020000 \
  --include-namespaces production,database \
  --wait

# Restore remaining namespaces afterward
velero restore create full-restore \
  --from-backup dr-backup-20240209020000 \
  --exclude-namespaces production,database,kube-system,velero \
  --wait
```

## Handling Storage Class Differences

DR clusters often have different storage infrastructure. Map storage classes during restore:

```bash
# Restore with storage class mapping
velero restore create storage-mapped-restore \
  --from-backup dr-backup-20240209020000 \
  --storage-class-mappings gp3:standard,io2:premium \
  --wait
```

Create a ConfigMap for persistent storage mappings:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: change-storage-class-config
  namespace: velero
  labels:
    velero.io/plugin-config: ""
    velero.io/change-storage-class: RestoreItemAction
data:
  gp3: standard
  io2: premium
  ebs-sc: azure-disk
```

This ConfigMap automatically maps storage classes during any restore operation.

## Implementing Automated Failover

Create an automated failover procedure:

```bash
#!/bin/bash
# automated-dr-failover.sh

PRIMARY_CLUSTER="primary-context"
DR_CLUSTER="dr-context"
BACKUP_NAME=$1

if [ -z "$BACKUP_NAME" ]; then
  echo "Usage: $0 <backup-name>"
  exit 1
fi

echo "Starting DR failover to cluster: $DR_CLUSTER"

# Switch to DR cluster
kubectl config use-context $DR_CLUSTER

# Verify backup is available
if ! velero backup get $BACKUP_NAME &>/dev/null; then
  echo "Error: Backup $BACKUP_NAME not found in DR cluster"
  exit 1
fi

# Restore critical namespaces first
echo "Restoring critical services..."
velero restore create critical-restore-$(date +%s) \
  --from-backup $BACKUP_NAME \
  --include-namespaces production,database,cache \
  --storage-class-mappings gp3:standard \
  --wait

# Verify critical pods are running
echo "Waiting for critical pods to start..."
kubectl wait --for=condition=ready pod -n production -l tier=critical --timeout=5m

# Restore remaining namespaces
echo "Restoring remaining services..."
velero restore create full-restore-$(date +%s) \
  --from-backup $BACKUP_NAME \
  --exclude-namespaces production,database,cache,kube-system,velero \
  --storage-class-mappings gp3:standard \
  --wait

echo "DR failover complete. Verifying services..."
kubectl get pods --all-namespaces | grep -v "Running\|Completed"
```

Make the script executable and test it regularly:

```bash
chmod +x automated-dr-failover.sh
./automated-dr-failover.sh dr-backup-20240209020000
```

## Testing DR Procedures

Regular DR testing validates your recovery strategy:

```bash
#!/bin/bash
# dr-test.sh

DR_CLUSTER="dr-test-context"
BACKUP_NAME=$1

echo "Starting DR test on cluster: $DR_CLUSTER"

# Switch to DR test cluster
kubectl config use-context $DR_CLUSTER

# Create test namespace mapping
velero restore create dr-test-$(date +%s) \
  --from-backup $BACKUP_NAME \
  --namespace-mappings production:production-dr-test \
  --storage-class-mappings gp3:standard \
  --wait

# Run validation tests
echo "Running validation tests..."

# Check if services are accessible
kubectl run test-connectivity -n production-dr-test \
  --image=curlimages/curl --rm -it -- \
  curl http://myapp.production-dr-test.svc.cluster.local/health

# Verify database connectivity
kubectl exec -n production-dr-test deployment/app -- \
  pg_isready -h postgres.production-dr-test.svc.cluster.local

# Cleanup test resources
echo "Cleaning up test resources..."
kubectl delete namespace production-dr-test

echo "DR test complete"
```

Schedule DR tests monthly:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: monthly-dr-test
  namespace: velero
spec:
  schedule: "0 0 1 * *"  # First day of each month
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: velero
          containers:
          - name: dr-test
            image: velero/velero:v1.12.0
            command:
            - /bin/bash
            - /scripts/dr-test.sh
            volumeMounts:
            - name: test-script
              mountPath: /scripts
          volumes:
          - name: test-script
            configMap:
              name: dr-test-script
          restartPolicy: OnFailure
```

## Handling Network and DNS Changes

After cross-cluster restore, update network configurations:

```bash
# Update LoadBalancer IPs
kubectl get services --all-namespaces -o wide | grep LoadBalancer

# Update DNS records to point to DR cluster
# This step is typically automated through external DNS or manual updates

# Update ingress configurations if needed
kubectl get ingress --all-namespaces
```

Create restore hooks to automate network updates:

```yaml
apiVersion: velero.io/v1
kind: Restore
metadata:
  name: dr-restore-with-hooks
  namespace: velero
spec:
  backupName: dr-backup-20240209020000
  hooks:
    resources:
    - name: update-external-dns
      includedNamespaces:
      - production
      labelSelector:
        matchLabels:
          app: frontend
      post:
      - exec:
          container: app
          command:
          - /bin/bash
          - -c
          - |
            # Update external DNS to point to new cluster
            echo "Updating DNS records for DR cluster..."
            # Your DNS update logic here
          onError: Continue
          timeout: 5m
```

## Monitoring Cross-Cluster DR Readiness

Track backup availability and DR readiness:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: dr-readiness-alerts
  namespace: velero
spec:
  groups:
  - name: disaster-recovery
    interval: 60s
    rules:
    - alert: DRBackupTooOld
      expr: |
        time() - velero_backup_last_successful_timestamp{schedule="dr-backup"} > 43200
      labels:
        severity: critical
      annotations:
        summary: "DR backup is over 12 hours old"
        description: "Last successful DR backup was {{ $value | humanizeDuration }} ago"

    - alert: DRClusterBackupNotVisible
      expr: |
        velero_backup_total{location="primary-cluster-backups"} == 0
      for: 30m
      labels:
        severity: critical
      annotations:
        summary: "DR cluster cannot see primary backups"
        description: "Backup storage location may be misconfigured"

    - alert: DRRestoreTestOverdue
      expr: |
        time() - velero_restore_last_successful_timestamp{restore=~"dr-test.*"} > 2592000
      labels:
        severity: warning
      annotations:
        summary: "DR restore test is overdue"
        description: "Last DR test was over 30 days ago"
```

## Implementing Multi-Region DR

For geographic redundancy, replicate backups across regions:

```yaml
---
apiVersion: velero.io/v1
kind: BackupStorageLocation
metadata:
  name: us-east-backup
  namespace: velero
spec:
  provider: aws
  objectStorage:
    bucket: dr-backups-us-east
  config:
    region: us-east-1

---
apiVersion: velero.io/v1
kind: BackupStorageLocation
metadata:
  name: us-west-backup
  namespace: velero
spec:
  provider: aws
  objectStorage:
    bucket: dr-backups-us-west
  config:
    region: us-west-2

---
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: multi-region-dr
  namespace: velero
spec:
  schedule: "0 */6 * * *"
  template:
    ttl: 720h
    includedNamespaces:
    - '*'
    excludedNamespaces:
    - kube-system
    - velero
    # Backup to both regions
    storageLocation: us-east-backup
    snapshotVolumes: true
    defaultVolumesToFsBackup: true
```

Configure S3 replication to sync backups between regions automatically.

## Documenting DR Procedures

Maintain clear DR runbooks:

```markdown
# Disaster Recovery Runbook

## Pre-Disaster Checklist
- [ ] Verify latest backup completed successfully
- [ ] Confirm DR cluster is healthy
- [ ] Validate network connectivity
- [ ] Check storage class mappings

## Disaster Declaration
1. Assess primary cluster status
2. Determine if DR activation is necessary
3. Notify stakeholders
4. Begin DR procedure

## DR Activation Steps
1. Switch context to DR cluster:
   ```bash
   kubectl config use-context dr-cluster
   ```

2. Identify latest backup:
   ```bash
   velero backup get --sort-by=.status.completionTimestamp
   ```

3. Execute DR failover script:
   ```bash
   ./automated-dr-failover.sh <backup-name>
   ```

4. Verify services:
   ```bash
   kubectl get pods --all-namespaces
   ```

5. Update DNS to point to DR cluster

6. Test application functionality

## Post-Recovery
- Document lessons learned
- Update DR procedures
- Plan primary cluster rebuild
```

## Conclusion

Cross-cluster disaster recovery with Velero provides robust protection against catastrophic failures. Configure shared backup storage locations accessible from multiple clusters, implement automated failover procedures, and test recovery operations regularly to ensure your DR strategy works when needed. Combine volume snapshots with file-level backups for maximum portability, map storage classes to handle infrastructure differences, and monitor backup freshness to maintain continuous DR readiness. Regular testing validates your procedures and builds team confidence in executing disaster recovery when every minute counts.
