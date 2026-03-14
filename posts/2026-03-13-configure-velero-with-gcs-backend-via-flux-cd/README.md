# How to Configure Velero with GCS Backend via Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Velero, GCP, Google Cloud Storage, GitOps, Kubernetes, Backup

Description: Configure Velero to use Google Cloud Storage for backups with Flux CD, including Workload Identity authentication for GKE clusters.

---

## Introduction

Google Cloud Storage (GCS) combined with Velero provides durable, globally distributed backup storage for Kubernetes clusters running on GCP. GCS offers eleven 9s of durability, automatic versioning, object lifecycle management, and tight integration with GKE through Workload Identity. When Velero authenticates to GCS using Workload Identity, no long-lived service account key files are needed-the credential is bound to the pod's Kubernetes service account.

This guide covers setting up GCS as the Velero backup backend with Workload Identity for GKE, including multi-region storage configuration and lifecycle policies for cost management.

## Prerequisites

- Velero installed on a GKE cluster with Workload Identity enabled
- Flux CD bootstrapped on the cluster
- A GCP project with Cloud Storage API enabled
- `gcloud`, `kubectl`, and `gsutil` CLIs installed

## Step 1: Create the GCS Bucket

```bash
export PROJECT_ID="my-gcp-project"
export BUCKET_NAME="my-cluster-velero-backups"
export REGION="us-central1"

# Create a multi-regional bucket for maximum durability
gsutil mb \
  -p "${PROJECT_ID}" \
  -l "US" \
  -c STANDARD \
  "gs://${BUCKET_NAME}"

# Enable versioning
gsutil versioning set on "gs://${BUCKET_NAME}"

# Enable uniform bucket-level access (recommended for security)
gsutil uniformbucketlevelaccess set on "gs://${BUCKET_NAME}"

# Block public access
gsutil pap set enforced "gs://${BUCKET_NAME}"
```

## Step 2: Create a Service Account for Velero

```bash
# Create a dedicated service account for Velero
gcloud iam service-accounts create velero-backup \
  --display-name="Velero Backup" \
  --project="${PROJECT_ID}"

VELERO_SA_EMAIL="velero-backup@${PROJECT_ID}.iam.gserviceaccount.com"

# Grant the service account Storage Admin on the backup bucket
gsutil iam ch \
  "serviceAccount:${VELERO_SA_EMAIL}:roles/storage.admin" \
  "gs://${BUCKET_NAME}"

# Grant Compute Storage Admin for disk snapshots
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${VELERO_SA_EMAIL}" \
  --role="roles/compute.storageAdmin"

# Allow the Kubernetes service account to impersonate the GCP service account
# This is the Workload Identity binding
gcloud iam service-accounts add-iam-policy-binding \
  "${VELERO_SA_EMAIL}" \
  --role="roles/iam.workloadIdentityUser" \
  --member="serviceAccount:${PROJECT_ID}.svc.id.goog[velero/velero-server]"
```

## Step 3: Configure Velero HelmRelease for GCS

```yaml
# infrastructure/velero/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: velero
  namespace: velero
spec:
  interval: 10m
  chart:
    spec:
      chart: velero
      version: "6.x"
      sourceRef:
        kind: HelmRepository
        name: vmware-tanzu
        namespace: flux-system
  values:
    initContainers:
      - name: velero-plugin-for-gcp
        image: velero/velero-plugin-for-gcp:v1.9.0
        volumeMounts:
          - mountPath: /target
            name: plugins

    # Use Workload Identity - no key file needed
    credentials:
      useSecret: false

    configuration:
      backupStorageLocation:
        - name: primary
          provider: gcp
          bucket: my-cluster-velero-backups
          config:
            project: my-gcp-project
          default: true
      volumeSnapshotLocation:
        - name: primary
          provider: gcp
          config:
            project: my-gcp-project
            # Optional: specify snapshot location
            snapshotLocation: us-central1

    serviceAccount:
      server:
        create: true
        name: velero-server
        annotations:
          # Workload Identity annotation
          iam.gke.io/gcp-service-account: "velero-backup@my-gcp-project.iam.gserviceaccount.com"

    deployNodeAgent: true
```

## Step 4: Configure GCS Lifecycle Rules for Cost Management

```bash
# Create lifecycle configuration file
cat > /tmp/gcs-lifecycle.json << 'EOF'
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "SetStorageClass", "storageClass": "NEARLINE"},
        "condition": {
          "age": 30,
          "matchesStorageClass": ["STANDARD"]
        }
      },
      {
        "action": {"type": "SetStorageClass", "storageClass": "COLDLINE"},
        "condition": {
          "age": 90,
          "matchesStorageClass": ["NEARLINE"]
        }
      },
      {
        "action": {"type": "Delete"},
        "condition": {
          "numNewerVersions": 3,
          "isLive": false
        }
      },
      {
        "action": {"type": "Delete"},
        "condition": {
          "age": 365,
          "isLive": false
        }
      }
    ]
  }
}
EOF

# Apply lifecycle configuration to the bucket
gsutil lifecycle set /tmp/gcs-lifecycle.json "gs://my-cluster-velero-backups"
rm /tmp/gcs-lifecycle.json
```

## Step 5: Create the Flux Kustomization

```yaml
# clusters/my-cluster/infrastructure/velero-gcs.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: velero
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/velero
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: velero
      namespace: velero
    - apiVersion: velero.io/v1
      kind: BackupStorageLocation
      name: primary
      namespace: velero
```

## Step 6: Verify GCS Integration

```bash
# Check backup storage location status
kubectl get backupstoragelocation -n velero

# Create a test backup
velero backup create gcs-connectivity-test \
  --storage-location primary \
  --include-namespaces default \
  --ttl 1h \
  --wait

# Verify backup objects in GCS
gsutil ls gs://my-cluster-velero-backups/backups/gcs-connectivity-test/

# Check backup status
velero backup describe gcs-connectivity-test

# Verify disk snapshot locations
kubectl get volumesnapshotlocation -n velero
```

## Best Practices

- Use a multi-regional GCS bucket (`-l US`, `-l EU`, or `-l ASIA`) for maximum availability. Multi-regional storage replicates data across multiple regions automatically.
- Enable uniform bucket-level access and disable ACLs. Uniform access is simpler, more secure, and required for Workload Identity authentication.
- Use Workload Identity for GKE deployments to eliminate service account key files. The credential is managed by GKE and rotated automatically.
- Apply GCS lifecycle rules to transition old backups through storage classes: Standard (0-30 days) → Nearline (30-90 days) → Coldline (90+ days). This can reduce storage costs by 80% for long-term retention.
- Enable GCS object retention policies or bucket locks for compliance requirements that mandate immutable backup storage.

## Conclusion

Velero is now configured with Google Cloud Storage as the backup backend, using Workload Identity for credential-free authentication on GKE. Backups are stored in a multi-regional GCS bucket for maximum durability, and lifecycle rules automatically tier data to cheaper storage classes over time. All configuration is managed through Flux CD for consistent, reproducible backup infrastructure.
