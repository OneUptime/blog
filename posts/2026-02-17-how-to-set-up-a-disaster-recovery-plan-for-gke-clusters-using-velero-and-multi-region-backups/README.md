# How to Set Up a Disaster Recovery Plan for GKE Clusters Using Velero

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, GKE, Velero, Disaster Recovery, Kubernetes, Backup

Description: Implement a comprehensive disaster recovery plan for Google Kubernetes Engine clusters using Velero for backup and restore with multi-region Cloud Storage for resilient data protection.

---

GKE manages your Kubernetes control plane, but your workloads, configurations, persistent volumes, and custom resources are your responsibility. If a cluster gets corrupted, accidentally deleted, or the region goes down, you need a way to restore everything. Velero is the standard tool for Kubernetes backup and disaster recovery. It captures the state of your cluster - all resources, configurations, and persistent volume data - and stores it in Cloud Storage where it survives any cluster-level failure.

In this post, I will show you how to set up Velero on GKE with multi-region backups, scheduled backup policies, and tested restore procedures.

## Installing Velero on GKE

First, set up the prerequisites: a Cloud Storage bucket for backups and a service account with the right permissions.

```bash
# Create a multi-region bucket for backup storage

gcloud storage buckets create gs://my-project-velero-backups \
  --location=us \
  --uniform-bucket-level-access

# Create a service account for Velero
gcloud iam service-accounts create velero-sa \
  --display-name="Velero Backup Service Account"

# Grant the necessary permissions
PROJECT_ID=$(gcloud config get-value project)
SERVICE_ACCOUNT_EMAIL=velero-sa@${PROJECT_ID}.iam.gserviceaccount.com
BUCKET=my-project-velero-backups

# Storage permissions for the backup bucket
gsutil iam ch serviceAccount:${SERVICE_ACCOUNT_EMAIL}:objectAdmin \
  gs://${BUCKET}

# Project permissions for snapshots, backup metadata, and signed URLs
ROLE_PERMISSIONS=(
  compute.disks.get
  compute.disks.create
  compute.disks.createSnapshot
  compute.projects.get
  compute.snapshots.get
  compute.snapshots.create
  compute.snapshots.useReadOnly
  compute.snapshots.delete
  compute.snapshots.setLabels
  compute.zones.get
  storage.objects.create
  storage.objects.delete
  storage.objects.get
  storage.objects.list
  iam.serviceAccounts.signBlob
)

gcloud iam roles create velero.server \
  --project ${PROJECT_ID} \
  --title "Velero Server" \
  --permissions "$(IFS=","; echo "${ROLE_PERMISSIONS[*]}")"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="projects/${PROJECT_ID}/roles/velero.server"

# Create a key file for Velero
gcloud iam service-accounts keys create velero-credentials.json \
  --iam-account=${SERVICE_ACCOUNT_EMAIL}
```

Install Velero using the CLI.

```bash
# Install the Velero CLI
brew install velero  # or download from GitHub releases

# Install Velero on the GKE cluster with the GCP plugin
velero install \
  --provider gcp \
  --plugins velero/velero-plugin-for-gcp:v1.13.0 \
  --bucket ${BUCKET} \
  --secret-file ./velero-credentials.json \
  --snapshot-location-config project=${PROJECT_ID} \
  --use-node-agent

# Verify the installation
kubectl get pods -n velero
velero backup-location get
```

## Configuring Scheduled Backups

Set up automatic backup schedules for different types of resources.

```bash
# Full cluster backup every 6 hours, retain for 30 days
velero schedule create full-cluster-backup \
  --schedule="0 */6 * * *" \
  --ttl 720h0m0s \
  --include-namespaces='*' \
  --snapshot-volumes=true

# Critical namespaces backed up every hour, retain for 7 days
velero schedule create critical-services-backup \
  --schedule="0 * * * *" \
  --ttl 168h0m0s \
  --include-namespaces=production,payments,orders \
  --snapshot-volumes=true

# Configuration-only backup (no PVs) every 30 minutes
velero schedule create config-backup \
  --schedule="*/30 * * * *" \
  --ttl 72h0m0s \
  --include-namespaces='*' \
  --snapshot-volumes=false \
  --include-resources=deployments,services,configmaps,secrets,ingresses
```

## Creating On-Demand Backups

Before major changes, create a manual backup.

```bash
# Backup before a major deployment
velero backup create pre-deploy-$(date +%Y%m%d-%H%M) \
  --include-namespaces=production \
  --snapshot-volumes=true \
  --wait

# Backup a specific namespace with labels
velero backup create payment-service-backup \
  --include-namespaces=payments \
  --selector app=payment-service \
  --snapshot-volumes=true

# Check backup status
velero backup describe pre-deploy-20260217-1430
velero backup logs pre-deploy-20260217-1430
```

## Multi-Region Backup Replication

Configure backup replication to a second region for true disaster recovery.

```bash
# Create a backup location in a second region
gcloud storage buckets create gs://my-project-velero-backups-dr \
  --location=europe-west1 \
  --uniform-bucket-level-access

# Set up Cloud Storage transfer to replicate backups
gcloud transfer jobs create \
  gs://my-project-velero-backups \
  gs://my-project-velero-backups-dr \
  --name=velero-backup-replication \
  --schedule-starts="2026-02-17T00:00:00Z" \
  --schedule-repeats-every=3600s

# Add a second backup storage location in Velero
velero backup-location create dr-location \
  --provider gcp \
  --bucket my-project-velero-backups-dr \
  --access-mode ReadOnly
```

## Backup Hooks for Application Consistency

Use Velero backup hooks to improve application consistency. For databases, use application-specific commands to quiesce writes or create a consistent dump before the backup.

```yaml
# deployment-with-backup-hooks.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres-app
  namespace: production
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres-app
  template:
    metadata:
      labels:
        app: postgres-app
      annotations:
        # Pre-backup hook: create a PostgreSQL logical dump before backup
        pre.hook.backup.velero.io/container: postgres
        pre.hook.backup.velero.io/command: '["/bin/bash", "-c", "pg_dump -U postgres mydb > /var/lib/postgresql/data/backup.sql && sync"]'
        pre.hook.backup.velero.io/timeout: 120s
        # Post-backup hook: clean up the dump file
        post.hook.backup.velero.io/container: postgres
        post.hook.backup.velero.io/command: '["/bin/bash", "-c", "rm -f /var/lib/postgresql/data/backup.sql"]'
    spec:
      containers:
        - name: postgres
          image: postgres:15
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: postgres-data
```

## Restoring from Backup

Practice restoring regularly. Here is how to restore to the same cluster or a different one.

```bash
# List available backups
velero backup get

# Restore an entire backup to the current cluster
velero restore create --from-backup full-cluster-backup-20260217-060000 \
  --wait

# Restore specific namespaces only
velero restore create --from-backup full-cluster-backup-20260217-060000 \
  --include-namespaces=production,payments \
  --wait

# Restore to a different namespace (useful for testing)
velero restore create --from-backup full-cluster-backup-20260217-060000 \
  --include-namespaces=production \
  --namespace-mappings production:production-restored \
  --wait

# Check restore status
velero restore describe restore-20260217-143000
velero restore logs restore-20260217-143000
```

## Cross-Region Restore

If the primary region is down, restore to a GKE cluster in a different region.

```bash
# Create a recovery cluster in the DR region
gcloud container clusters create recovery-cluster \
  --region=europe-west1 \
  --num-nodes=3 \
  --machine-type=n2-standard-4

# Install Velero on the recovery cluster, pointing to the DR bucket
velero install \
  --provider gcp \
  --plugins velero/velero-plugin-for-gcp:v1.13.0 \
  --bucket my-project-velero-backups-dr \
  --secret-file ./velero-credentials.json \
  --snapshot-location-config project=${PROJECT_ID}

# Wait for Velero to discover the backups
sleep 60
velero backup get

# Restore the cluster from the latest backup
velero restore create dr-restore \
  --from-backup full-cluster-backup-20260217-060000 \
  --wait

# Verify the restore
kubectl get pods --all-namespaces
kubectl get services --all-namespaces
```

## Automated DR Testing

Set up automated DR testing that runs monthly to verify backups are restorable.

```yaml
# dr-test-cronjob.yaml - Monthly DR test
apiVersion: batch/v1
kind: CronJob
metadata:
  name: dr-test
  namespace: velero
spec:
  schedule: "0 3 1 * *"  # First day of each month at 3 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: velero
          containers:
            - name: dr-test
              image: your-registry/dr-test-tools:latest # includes kubectl, velero, and jq
              command:
                - /bin/bash
                - -c
                - |
                  # Get the latest backup
                  LATEST_BACKUP=$(velero backup get -o json | jq -r '.items | sort_by(.metadata.creationTimestamp) | last | .metadata.name')
                  echo "Testing restore from backup: $LATEST_BACKUP"

                  # Restore to a test namespace
                  velero restore create dr-test-$(date +%Y%m%d) \
                    --from-backup $LATEST_BACKUP \
                    --include-namespaces=production \
                    --namespace-mappings production:dr-test \
                    --wait

                  # Verify critical deployments are running
                  READY=$(kubectl get deployments -n dr-test -o json | jq '[.items[] | select(.status.readyReplicas > 0)] | length')
                  TOTAL=$(kubectl get deployments -n dr-test -o json | jq '.items | length')

                  echo "DR Test Result: $READY/$TOTAL deployments ready"

                  # Clean up the test namespace
                  kubectl delete namespace dr-test

                  if [ "$READY" -eq "$TOTAL" ]; then
                    echo "DR TEST PASSED"
                  else
                    echo "DR TEST FAILED"
                    exit 1
                  fi
          restartPolicy: OnFailure
```

## Monitoring Backup Health

Track backup success and freshness to make sure your recovery point objectives are met.

```bash
# Check for failed backups in the last 24 hours
velero backup get --output json | \
  jq '[.items[] | select(.status.phase == "Failed" or .status.phase == "PartiallyFailed")] | length'

# Verify backup freshness - ensure the latest backup is within 6 hours
LATEST=$(velero backup get --output json | \
  jq -r '[.items[] | select(.status.phase == "Completed")] | sort_by(.metadata.creationTimestamp) | last | .metadata.creationTimestamp')
echo "Latest successful backup: $LATEST"
```

## Summary

A disaster recovery plan is only as good as your last successful test restore. Set up Velero with scheduled backups, replicate to a second region, and test your restore process regularly. Document the failover runbook so anyone on the team can execute it under pressure.

OneUptime can monitor your backup pipeline, alerting you when backups fail or when the time since the last successful backup exceeds your RPO threshold. Combine this with cluster health monitoring across regions to get a complete picture of your disaster recovery readiness.
