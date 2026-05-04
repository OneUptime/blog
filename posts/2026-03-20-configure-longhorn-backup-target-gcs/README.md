# How to Configure Longhorn Backup Target to Google Cloud Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Kubernetes, Storage, Backup, GCS, Google Cloud

Description: Configure Longhorn to use Google Cloud Storage (GCS) as a backup target for storing Kubernetes persistent volume backups in Google Cloud.

## Introduction

Google Cloud Storage (GCS) is Google's object storage service, providing high durability, scalability, and integration with the Google Cloud ecosystem. GCS is the natural choice for Longhorn backups on GKE clusters or in environments already using Google Cloud Platform. Longhorn does not support a native `gs://` backup target scheme; instead, GCS is used through its S3 interoperability mode with HMAC keys, and Longhorn talks to it as an S3-compatible endpoint. This guide covers the complete configuration process.

## Prerequisites

- Longhorn installed on your cluster
- Google Cloud project with billing enabled
- `gcloud` CLI installed and authenticated
- Network access from cluster nodes to `storage.googleapis.com`

## Step 1: Create a GCS Bucket

```bash
# Set your project and bucket configuration

PROJECT_ID="your-gcp-project-id"
BUCKET_NAME="longhorn-backups-$(echo $PROJECT_ID | tr -d '-')"
REGION="us-central1"

# Create the GCS bucket
gsutil mb -p $PROJECT_ID \
  -c STANDARD \
  -l $REGION \
  gs://$BUCKET_NAME

# Enable uniform bucket-level access (recommended)
gsutil uniformbucketlevelaccess set on gs://$BUCKET_NAME

# Enforce public access prevention
gsutil pap set enforced gs://$BUCKET_NAME

echo "Bucket created: gs://$BUCKET_NAME"
```

## Step 2: Create a Service Account

```bash
# Create a dedicated service account for Longhorn backups
gcloud iam service-accounts create longhorn-backup-sa \
  --display-name="Longhorn Backup Service Account" \
  --project=$PROJECT_ID

# Get the service account email
SA_EMAIL="longhorn-backup-sa@${PROJECT_ID}.iam.gserviceaccount.com"
echo "Service account: $SA_EMAIL"

# Grant the service account access to the bucket
gsutil iam ch serviceAccount:${SA_EMAIL}:roles/storage.objectAdmin gs://$BUCKET_NAME
```

## Step 3: Create HMAC Keys for the Service Account

Longhorn talks to GCS through its S3-compatible interoperability API, which is authenticated with HMAC keys (an access key ID and a secret) rather than service account JSON keys.

```bash
# Create an HMAC key tied to the service account
gcloud storage hmac create $SA_EMAIL --project=$PROJECT_ID

# The output contains accessId and secret. Capture them, e.g.:
#   accessId: GOOG1E...
#   secret:   abc123...
# Export them for the next step:
export GCS_ACCESS_KEY="GOOG1E..."
export GCS_SECRET_KEY="abc123..."
```

> **Security Note:** Treat the HMAC secret like any long-lived credential. Store it only in the Kubernetes secret created below and rotate it periodically with `gcloud storage hmac update` / `gcloud storage hmac delete`.

## Step 4: Create Kubernetes Secret

Longhorn reads S3-style credentials from a Kubernetes secret. For GCS, point the `AWS_ENDPOINTS` field at `https://storage.googleapis.com` and use the HMAC access ID and secret as the AWS-style credentials:

```bash
# Create the secret directly from the HMAC values
kubectl create secret generic longhorn-backup-gcs \
  -n longhorn-system \
  --from-literal=AWS_ACCESS_KEY_ID="$GCS_ACCESS_KEY" \
  --from-literal=AWS_SECRET_ACCESS_KEY="$GCS_SECRET_KEY" \
  --from-literal=AWS_ENDPOINTS="https://storage.googleapis.com"
```

Or declaratively (values must be base64-encoded for `data`, or use `stringData` as below):

```yaml
# longhorn-gcs-secret.yaml - GCS credentials for Longhorn
apiVersion: v1
kind: Secret
metadata:
  name: longhorn-backup-gcs
  namespace: longhorn-system
type: Opaque
stringData:
  AWS_ACCESS_KEY_ID: "GOOG1E..."
  AWS_SECRET_ACCESS_KEY: "abc123..."
  AWS_ENDPOINTS: "https://storage.googleapis.com"
```

```bash
kubectl apply -f longhorn-gcs-secret.yaml
```

## Step 5: Configure Longhorn Backup Target

Longhorn uses the `s3://` scheme even for GCS, with the bucket name and the bucket's location encoded as `s3://BUCKET_NAME@REGION/`. The endpoint override in the secret is what redirects S3 calls to GCS.

### Via kubectl

```bash
# Set GCS (via S3 interop) as the backup target
# Format: s3://bucket-name@region/optional-prefix
kubectl patch settings.longhorn.io backup-target \
  -n longhorn-system \
  --type merge \
  -p "{\"value\": \"s3://${BUCKET_NAME}@${REGION}/\"}"

# Set the credentials secret
kubectl patch settings.longhorn.io backup-target-credential-secret \
  -n longhorn-system \
  --type merge \
  -p '{"value": "longhorn-backup-gcs"}'
```

### Via Longhorn UI

1. Navigate to **Setting** → **General**
2. Find **Backup Target**
3. Enter: `s3://your-bucket-name@us-central1/`
4. Find **Backup Target Credential Secret**
5. Enter: `longhorn-backup-gcs`
6. Click **Save**

> **Note on Workload Identity:** Longhorn's backup target reads static credentials from the referenced Kubernetes secret and does not exchange GKE Workload Identity tokens for backup access. HMAC keys stored in a secret remain the supported path; rotate them on a schedule and store the secret only in the `longhorn-system` namespace.

## Verify the Connection

```bash
# Check the backup target configuration
kubectl get settings.longhorn.io backup-target -n longhorn-system -o yaml

# Verify by checking backup volumes (should not show errors)
kubectl get backupvolumes.longhorn.io -n longhorn-system
```

## Create a Test Backup and Verify in GCS

```bash
# After triggering a backup from the Longhorn UI, verify it exists in GCS
gsutil ls gs://$BUCKET_NAME/backupstore/volumes/

# Check backup size
gsutil du -sh gs://$BUCKET_NAME/
```

## Set Up GCS Lifecycle Policies

Configure automatic object management for cost optimization:

```bash
# Create lifecycle configuration
cat > gcs-lifecycle.json << 'EOF'
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "SetStorageClass", "storageClass": "NEARLINE"},
        "condition": {"age": 30}
      },
      {
        "action": {"type": "SetStorageClass", "storageClass": "COLDLINE"},
        "condition": {"age": 90}
      },
      {
        "action": {"type": "Delete"},
        "condition": {"age": 365}
      }
    ]
  }
}
EOF

# Apply the lifecycle policy to the bucket
gsutil lifecycle set gcs-lifecycle.json gs://$BUCKET_NAME
```

## Configure Recurring Backups

```yaml
# recurring-gcs-backup.yaml - Daily backup to GCS
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: daily-gcs-backup
  namespace: longhorn-system
spec:
  cron: "0 3 * * *"
  task: "backup"
  retain: 30
  concurrency: 2
  labels:
    target: gcs
```

```bash
kubectl apply -f recurring-gcs-backup.yaml
```

## Conclusion

Google Cloud Storage provides an excellent backup target for Longhorn, especially in GCP-based Kubernetes environments. The combination of GCS S3 interoperability with rotated HMAC keys, GCS lifecycle policies for cost management, and Longhorn's recurring backup system creates a robust, automated backup solution. Always verify your backup restoration process periodically to ensure your backup data is valid and accessible.
