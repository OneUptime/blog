# Using Medusa for Apache Cassandra Backups on Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cassandra, Medusa, Backup, Kubernetes, Database

Description: A comprehensive guide to setting up and managing Apache Cassandra backups using Medusa on Kubernetes clusters with object storage backends

---

Backing up Apache Cassandra in a Kubernetes environment presents unique challenges. Unlike traditional virtual machine deployments where you might rely on filesystem snapshots or cron-based scripts, Kubernetes demands a more cloud-native approach. Medusa for Apache Cassandra is an open-source backup and restore tool specifically designed for this purpose, and it integrates seamlessly with K8ssandra to provide robust backup capabilities for Cassandra clusters running on Kubernetes.

## What Is Medusa?

Medusa is a backup and restore tool for Apache Cassandra that supports multiple storage backends including Amazon S3, Google Cloud Storage, Azure Blob Storage, and any S3-compatible object store like MinIO. It performs node-level backups by taking snapshots of SSTables and uploading them to your configured storage backend. Medusa also handles differential backups, meaning it only uploads SSTables that have changed since the last backup, significantly reducing storage costs and backup duration.

## Prerequisites

Before setting up Medusa, ensure you have the following in place:

- A running Kubernetes cluster (1.21+)
- Helm 3 installed
- kubectl configured to communicate with your cluster
- An object storage bucket (S3, GCS, or Azure Blob)
- K8ssandra operator installed (recommended) or a standalone Cassandra deployment

## Installing Medusa with K8ssandra

The simplest way to deploy Medusa alongside Cassandra on Kubernetes is through the K8ssandra operator. Here is a K8ssandraCluster custom resource that includes Medusa configuration:

```yaml
apiVersion: k8ssandra.io/v1alpha1
kind: K8ssandraCluster
metadata:
  name: production-cluster
  namespace: cassandra
spec:
  cassandra:
    serverVersion: "4.1.3"
    datacenters:
      - metadata:
          name: dc1
        size: 3
        storageConfig:
          cassandraDataVolumeClaimSpec:
            storageClassName: gp3
            accessModes:
              - ReadWriteOnce
            resources:
              requests:
                storage: 100Gi
  medusa:
    storageProperties:
      storageProvider: s3
      storageSecretRef:
        name: medusa-bucket-secret
      bucketName: cassandra-backups-prod
      prefix: k8ssandra
      maxBackupAge: 7
      maxBackupCount: 10
    containerImage:
      registry: docker.io
      repository: k8ssandra
      name: medusa
      tag: "0.17.1"
```

## Configuring Storage Credentials

Medusa needs credentials to access your object storage backend. Create a Kubernetes secret with the appropriate credentials for your storage provider.

For Amazon S3:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: medusa-bucket-secret
  namespace: cassandra
type: Opaque
stringData:
  credentials: |-
    [default]
    aws_access_key_id = YOUR_ACCESS_KEY_ID
    aws_secret_access_key = YOUR_SECRET_ACCESS_KEY
```

For Google Cloud Storage:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: medusa-bucket-secret
  namespace: cassandra
type: Opaque
stringData:
  credentials: |-
    {
      "type": "service_account",
      "project_id": "your-project-id",
      "private_key_id": "key-id",
      "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
      "client_email": "medusa-backup@your-project-id.iam.gserviceaccount.com"
    }
```

Apply the secret before deploying the K8ssandraCluster resource:

```bash
kubectl apply -f medusa-bucket-secret.yaml
```

## Triggering Backups

Once Medusa is deployed alongside your Cassandra cluster, you can trigger backups using the MedusaBackup custom resource:

```yaml
apiVersion: medusa.k8ssandra.io/v1alpha1
kind: MedusaBackup
metadata:
  name: backup-2026-02-09
  namespace: cassandra
spec:
  cassandraDatacenter: dc1
  type: full
```

Apply this resource to initiate a backup:

```bash
kubectl apply -f backup.yaml
```

You can monitor the backup status:

```bash
kubectl get medusabackup -n cassandra backup-2026-02-09 -o yaml
```

The output will include status fields showing the progress of the backup across all nodes:

```yaml
status:
  startTime: "2026-02-09T10:00:00Z"
  finishTime: "2026-02-09T10:05:32Z"
  status: SUCCESS
  totalNodes: 3
  finishedNodes: 3
```

## Scheduling Automated Backups

For production environments, you will want to schedule backups automatically. The MedusaBackupSchedule resource handles this:

```yaml
apiVersion: medusa.k8ssandra.io/v1alpha1
kind: MedusaBackupSchedule
metadata:
  name: daily-backup
  namespace: cassandra
spec:
  backupSpec:
    cassandraDatacenter: dc1
    type: differential
  cronSchedule: "0 2 * * *"
  disabled: false
```

This creates a differential backup every day at 2:00 AM. Differential backups are significantly faster than full backups because Medusa only uploads SSTables that have changed since the last backup.

## Restoring from a Backup

Restoring a Cassandra cluster from a Medusa backup is straightforward. Create a MedusaRestoreJob resource:

```yaml
apiVersion: medusa.k8ssandra.io/v1alpha1
kind: MedusaRestoreJob
metadata:
  name: restore-from-backup
  namespace: cassandra
spec:
  cassandraDatacenter: dc1
  backup: backup-2026-02-09
```

The restore process will shut down the Cassandra nodes, download the backup data from object storage, replace the existing SSTables, and restart the nodes. Monitor the restore:

```bash
kubectl get medusarestorejob -n cassandra restore-from-backup -w
```

## Verifying Backup Integrity

It is critical to periodically verify that your backups are actually restorable. You can do this by restoring to a separate namespace or cluster:

```bash
# List available backups
kubectl get medusabackup -n cassandra

# Check backup details
kubectl get medusabackup -n cassandra backup-2026-02-09 -o jsonpath='{.status}'
```

You can also use the Medusa CLI directly within the Cassandra pod to verify backup contents:

```bash
kubectl exec -it production-cluster-dc1-default-sts-0 -n cassandra -c medusa -- \
  medusa verify backup --backup-name=backup-2026-02-09
```

## Performance Tuning

Medusa offers several configuration options to tune backup performance:

```yaml
medusa:
  storageProperties:
    concurrentTransfers: 2
    multiPartUploadThreshold: 8388608
    transferMaxBandwidth: 50MB/s
```

The `concurrentTransfers` parameter controls how many SSTables are uploaded in parallel. Increase this value on nodes with high-bandwidth network connections. The `transferMaxBandwidth` setting prevents backups from consuming all available network bandwidth, which could impact query latency.

## Backup Retention Policies

Managing backup retention is essential to control storage costs. Medusa supports two retention parameters:

- `maxBackupAge`: Maximum age in days before a backup is purged
- `maxBackupCount`: Maximum number of backups to retain

When both are set, Medusa applies the more restrictive policy. For example, with `maxBackupAge: 7` and `maxBackupCount: 10`, a backup older than 7 days will be purged even if there are fewer than 10 backups.

## Monitoring Backups

Integrate Medusa backup monitoring with your existing observability stack. Medusa exposes metrics that can be scraped by Prometheus:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: medusa-metrics
  namespace: cassandra
spec:
  selector:
    matchLabels:
      app: cassandra
  endpoints:
    - port: metrics
      interval: 30s
      path: /metrics
```

Key metrics to monitor include backup duration, backup size, number of failed backups, and time since last successful backup. Set up alerts for backup failures:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: medusa-alerts
spec:
  groups:
    - name: medusa
      rules:
        - alert: CassandraBackupFailed
          expr: medusa_backup_status == 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Cassandra backup failed"
```

## Disaster Recovery Strategy

Medusa backups should be part of a broader disaster recovery strategy. Consider the following practices:

1. Store backups in a different region than your primary cluster to protect against regional outages.
2. Enable versioning on your object storage bucket to protect against accidental deletion.
3. Regularly test restores to a separate cluster to validate backup integrity.
4. Document your Recovery Time Objective (RTO) and Recovery Point Objective (RPO) and ensure your backup schedule meets those requirements.
5. Use cross-region replication on your storage bucket for additional redundancy.

## Conclusion

Medusa provides a reliable, cloud-native solution for backing up and restoring Apache Cassandra on Kubernetes. By leveraging the K8ssandra operator, you can declaratively manage your backup strategy using Kubernetes custom resources. The combination of full and differential backups, automated scheduling, configurable retention policies, and multiple storage backend support makes Medusa a production-ready choice for protecting your Cassandra data. Start by configuring daily differential backups with weekly full backups, monitor backup health through Prometheus, and regularly test your restore procedures to ensure your data is always recoverable.
