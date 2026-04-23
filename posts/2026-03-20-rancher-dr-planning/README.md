# How to Plan Disaster Recovery for Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Disaster-recovery, Kubernetes, Backup, Planning

Description: A comprehensive guide to planning disaster recovery strategies for Rancher environments to minimize downtime and data loss.

## Introduction

Disaster recovery (DR) planning is essential for any production Rancher deployment. A well-designed DR plan ensures that your Kubernetes infrastructure can recover quickly from failures ranging from individual node outages to complete data center disasters. This guide walks through the key components of a comprehensive DR plan for Rancher.

## Understanding Recovery Objectives

Before building your DR plan, define your recovery objectives:

- **Recovery Time Objective (RTO)**: The maximum acceptable time to restore Rancher services after a disaster. For most production environments, this should be under 4 hours.
- **Recovery Point Objective (RPO)**: The maximum acceptable data loss measured in time. For Rancher, this typically means how frequently you back up the Rancher application and take etcd snapshots for Rancher-launched clusters.

## Key Components to Protect

### Rancher Management Server
- etcd database (contains all cluster state)
- Rancher configuration and settings
- TLS certificates and keys
- kubeconfig files

### Downstream Clusters
- Cluster configurations
- Persistent volumes and their data
- Namespace-level resources
- Secrets and ConfigMaps

## DR Planning Steps

### Step 1: Inventory Your Infrastructure

```bash
# List all managed clusters

rancher clusters ls

# Export cluster kubeconfig files
for cluster in $(rancher clusters ls --format "{{.Cluster.ID}}"); do
  rancher clusters kubeconfig $cluster > kubeconfig-${cluster}.yaml
done
```

### Step 2: Define Backup Schedules

```yaml
# recurring-rancher-backup.yaml
apiVersion: resources.cattle.io/v1
kind: Backup
metadata:
  name: rancher-recurring-backup
spec:
  resourceSetName: rancher-resource-set-full
  encryptionConfigSecretName: backup-encryption-key
  schedule: "0 */6 * * *"  # Every 6 hours
  retentionCount: 28
```

### Step 3: Choose Your DR Architecture

| Architecture | RTO | RPO | Cost | Complexity |
|---|---|---|---|---|
| Cold Standby | 4-8 hours | 1-6 hours | Low | Low |
| Warm Standby | 1-4 hours | 15-60 min | Medium | Medium |
| Hot Standby | < 1 hour | < 15 min | High | High |

### Step 4: Document Recovery Procedures

Create runbooks for each failure scenario:

```markdown
## Runbook: Rancher Server Total Failure

### Prerequisites
- Access to backup storage (S3/NFS)
- Replacement management cluster or host
- Valid backup files and, if used, the encryption configuration

### Steps
1. Provision a replacement management cluster or host
2. Recreate DNS and load balancer prerequisites
3. Prepare the restore tooling required for your original installation method
4. Restore the Rancher backup or snapshot for that installation
5. Bring Rancher up with the same hostname and compatible version
6. Verify cluster connectivity
7. Validate all downstream clusters
```

### Step 5: Establish Communication Plans

- Define incident commander role
- Create escalation matrix
- Set up out-of-band communication channels
- Document external dependencies (DNS, load balancers, storage)

## Backup Configuration with Rancher Backup Operator

Use the Rancher Backup operator to protect the Rancher application running on the local cluster; plan separate etcd snapshots and workload backups for downstream clusters.

```yaml
# backup-resource.yaml
apiVersion: resources.cattle.io/v1
kind: Backup
metadata:
  name: rancher-daily-backup
spec:
  storageLocation:
    s3:
      credentialSecretName: s3-creds
      credentialSecretNamespace: default
      bucketName: rancher-dr-backups
      folder: daily
      region: us-east-1
      endpoint: s3.us-east-1.amazonaws.com
  resourceSetName: rancher-resource-set-full
  schedule: "0 2 * * *"   # Daily at 2 AM
  retentionCount: 14       # Keep 14 backups
  encryptionConfigSecretName: backup-encryption-key
```

## Testing Your DR Plan

A DR plan that hasn't been tested is just a document. Schedule regular DR drills:

```bash
# Quarterly DR drill checklist
echo "=== DR Drill Checklist ==="
echo "[ ] Backup files accessible from secondary location"
echo "[ ] Restoration procedure documented and up-to-date"
echo "[ ] Team familiar with recovery steps"
echo "[ ] RTO/RPO targets validated"
echo "[ ] Communication plan tested"
echo "[ ] DNS failover configured"
```

## Monitoring and Alerting for DR Readiness

If you enable metrics for the `rancher-backup` Helm chart, you can alert on failed backups with a PrometheusRule:

```yaml
# PrometheusRule for backup monitoring
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: rancher-backup-alerts
  namespace: cattle-resources-system
spec:
  groups:
  - name: rancher-backup
    rules:
    - alert: BackupFailed
      expr: increase(rancher_backups_failed_total[5m]) > 0
      for: 1m
      labels:
        severity: critical
      annotations:
        summary: "Rancher backup failed"
        description: "The rancher-backup operator has failed to process at least one backup in the last 5 minutes"
```

## Conclusion

A solid DR plan for Rancher involves clear objectives, regular backups, tested recovery procedures, and well-defined communication channels. Start with defining your RTO and RPO, then work backwards to implement the backup and recovery mechanisms that meet those targets. Regularly test your plan to ensure it works when you need it most.
