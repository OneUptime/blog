# How to Implement Workload Identity Federation for GCP from Kubernetes Pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, GCP, Security

Description: Learn how to configure Workload Identity for Kubernetes pods to securely access Google Cloud services without storing service account keys.

---

Kubernetes pods running on GCP often need to interact with Google Cloud services like Cloud Storage, BigQuery, or Pub/Sub. The traditional approach of downloading service account JSON keys and mounting them in pods creates significant security risks. Workload Identity provides a secure alternative by allowing pods to impersonate Google Cloud service accounts using short-lived tokens, eliminating the need for stored credentials.

This guide will show you how to set up Workload Identity in GKE and configure pods to access GCP services securely using federated identities.

## Understanding Workload Identity

Workload Identity creates a mapping between Kubernetes service accounts and Google Cloud service accounts. When a pod needs to access GCP services, it uses its Kubernetes service account token to request Google Cloud credentials through the GKE metadata server. This exchange happens automatically through the GCP client libraries.

The mechanism relies on IAM bindings that allow specific Kubernetes service accounts to impersonate specific Google Cloud service accounts. This provides fine-grained access control without managing or rotating keys.

## Enabling Workload Identity on GKE Cluster

First, enable Workload Identity when creating a new cluster or update an existing one:

```bash
# Create new GKE cluster with Workload Identity
gcloud container clusters create my-cluster \
  --region us-central1 \
  --workload-pool=my-project.svc.id.goog \
  --enable-stackdriver-kubernetes

# Or enable on existing cluster
gcloud container clusters update my-cluster \
  --region us-central1 \
  --workload-pool=my-project.svc.id.goog
```

The workload pool should be in the format `PROJECT_ID.svc.id.goog`. This creates the identity namespace for your cluster.

Update node pools to use Workload Identity:

```bash
# Enable Workload Identity on default node pool
gcloud container node-pools update default-pool \
  --cluster=my-cluster \
  --region=us-central1 \
  --workload-metadata=GKE_METADATA

# Or create new node pool with Workload Identity
gcloud container node-pools create wi-pool \
  --cluster=my-cluster \
  --region=us-central1 \
  --workload-metadata=GKE_METADATA \
  --machine-type=n1-standard-2 \
  --num-nodes=3
```

The `GKE_METADATA` setting configures nodes to intercept metadata server requests and provide Workload Identity credentials.

## Creating Google Cloud Service Account

Create a GCP service account that your pods will impersonate:

```bash
# Create service account
gcloud iam service-accounts create gcs-bucket-access \
  --display-name="GCS Bucket Access for K8s Pods" \
  --project=my-project

# Grant necessary permissions
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:gcs-bucket-access@my-project.iam.gserviceaccount.com" \
  --role="roles/storage.objectViewer"

# For more specific permissions, create custom role
gcloud iam roles create customGCSRole \
  --project=my-project \
  --title="Custom GCS Role" \
  --description="Limited GCS access" \
  --permissions=storage.objects.get,storage.objects.list
```

This service account has the permissions your pods need to access GCP resources.

## Creating Kubernetes Service Account

Create a Kubernetes service account that will be bound to the GCP service account:

```yaml
# service-account.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: gcs-access
  namespace: production
  annotations:
    iam.gke.io/gcp-service-account: gcs-bucket-access@my-project.iam.gserviceaccount.com
```

Apply the service account:

```bash
kubectl apply -f service-account.yaml

# Verify creation
kubectl get sa gcs-access -n production -o yaml
```

The annotation links this Kubernetes service account to the Google Cloud service account.

## Binding Kubernetes SA to Google Cloud SA

Create an IAM policy binding that allows the Kubernetes service account to impersonate the Google Cloud service account:

```bash
# Allow Kubernetes SA to impersonate GCP SA
gcloud iam service-accounts add-iam-policy-binding \
  gcs-bucket-access@my-project.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:my-project.svc.id.goog[production/gcs-access]"
```

The member format is critical: `serviceAccount:PROJECT_ID.svc.id.goog[NAMESPACE/KSA_NAME]`. This grants the Kubernetes service account in the specific namespace permission to act as the Google Cloud service account.

Verify the binding:

```bash
# Check IAM policy
gcloud iam service-accounts get-iam-policy \
  gcs-bucket-access@my-project.iam.gserviceaccount.com
```

## Configuring Pods to Use Workload Identity

Update your deployments to use the Kubernetes service account:

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gcs-app
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: gcs-app
  template:
    metadata:
      labels:
        app: gcs-app
    spec:
      serviceAccountName: gcs-access  # Use the configured service account
      containers:
      - name: app
        image: gcr.io/my-project/gcs-app:latest
        env:
        # Optional: explicitly set GCP project
        - name: GOOGLE_CLOUD_PROJECT
          value: my-project
```

Deploy the application:

```bash
kubectl apply -f deployment.yaml

# Verify pods are running
kubectl get pods -n production -l app=gcs-app
```

The GCP client libraries automatically detect and use Workload Identity credentials.

## Testing Workload Identity Access

Verify that pods can access GCP services:

```bash
# Create test pod with gcloud CLI
kubectl run gcloud-test -n production \
  --image=google/cloud-sdk:alpine \
  --serviceaccount=gcs-access \
  --command -- sleep infinity

# Exec into the pod
kubectl exec -it gcloud-test -n production -- sh

# Inside the pod, verify identity
gcloud auth list

# Should show the GCP service account:
# Credentialed Accounts
# ACTIVE  ACCOUNT
# *       gcs-bucket-access@my-project.iam.gserviceaccount.com

# Test GCS access
gsutil ls gs://my-bucket/

# Test programmatic access
gcloud storage ls

# Clean up
exit
kubectl delete pod gcloud-test -n production
```

## Using Workload Identity with Python

Google Cloud client libraries automatically use Workload Identity:

```python
# app.py
from google.cloud import storage
import os

def list_buckets():
    """List GCS buckets using Workload Identity"""
    # Client libraries automatically use Workload Identity
    # No explicit credentials needed!
    storage_client = storage.Client()

    buckets = storage_client.list_buckets()
    for bucket in buckets:
        print(f"Bucket: {bucket.name}")

def upload_file(bucket_name, source_file, destination_blob):
    """Upload file to GCS using Workload Identity"""
    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(destination_blob)

    blob.upload_from_filename(source_file)
    print(f"File {source_file} uploaded to {destination_blob}")

def download_file(bucket_name, source_blob, destination_file):
    """Download file from GCS"""
    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(source_blob)

    blob.download_to_filename(destination_file)
    print(f"File {source_blob} downloaded to {destination_file}")

if __name__ == "__main__":
    print("Testing Workload Identity...")
    list_buckets()
```

No credential configuration needed in the code - Workload Identity handles authentication automatically.

## Accessing Multiple GCP Services

Grant additional permissions to the Google Cloud service account:

```bash
# Add BigQuery access
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:gcs-bucket-access@my-project.iam.gserviceaccount.com" \
  --role="roles/bigquery.dataViewer"

# Add Pub/Sub access
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:gcs-bucket-access@my-project.iam.gserviceaccount.com" \
  --role="roles/pubsub.publisher"

# Add Cloud SQL access
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:gcs-bucket-access@my-project.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"
```

Now pods using this service account can access multiple GCP services.

## Creating Service Accounts for Different Workloads

Follow the principle of least privilege by creating separate service accounts for different applications:

```bash
# Create service account for database backup job
gcloud iam service-accounts create db-backup \
  --display-name="Database Backup Service" \
  --project=my-project

# Grant specific permissions
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:db-backup@my-project.iam.gserviceaccount.com" \
  --role="roles/storage.objectCreator"

# Create Kubernetes service account
kubectl create serviceaccount db-backup -n jobs

# Annotate with GCP service account
kubectl annotate serviceaccount db-backup -n jobs \
  iam.gke.io/gcp-service-account=db-backup@my-project.iam.gserviceaccount.com

# Bind the accounts
gcloud iam service-accounts add-iam-policy-binding \
  db-backup@my-project.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:my-project.svc.id.goog[jobs/db-backup]"
```

Use this service account only for backup jobs, separate from application service accounts.

## Troubleshooting Workload Identity

Common issues and solutions:

```bash
# Check if Workload Identity is enabled on cluster
gcloud container clusters describe my-cluster \
  --region us-central1 \
  --format="value(workloadIdentityConfig.workloadPool)"

# Verify node pool has Workload Identity enabled
gcloud container node-pools describe default-pool \
  --cluster=my-cluster \
  --region=us-central1 \
  --format="value(config.workloadMetadataConfig.mode)"
# Should return GKE_METADATA

# Check service account binding
gcloud iam service-accounts get-iam-policy \
  gcs-bucket-access@my-project.iam.gserviceaccount.com \
  --format=json | jq '.bindings[] | select(.role=="roles/iam.workloadIdentityUser")'

# Test from pod
kubectl run -it --rm debug \
  --image=google/cloud-sdk:alpine \
  --serviceaccount=gcs-access \
  -n production -- gcloud auth list
```

If authentication fails, verify the annotation on the Kubernetes service account matches the GCP service account exactly.

## Monitoring Workload Identity Usage

Enable audit logging to track service account usage:

```bash
# View audit logs for service account usage
gcloud logging read \
  'protoPayload.authenticationInfo.principalEmail="gcs-bucket-access@my-project.iam.gserviceaccount.com"' \
  --limit 50 \
  --format json

# Create monitoring alert for unexpected usage
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="Unusual GCS Access" \
  --condition-display-name="High API Calls" \
  --condition-threshold-value=100 \
  --condition-threshold-duration=60s
```

Monitor which pods are using which service accounts to detect anomalies.

## Migrating from Service Account Keys

If you have existing deployments using service account keys, migrate gradually:

```bash
# List pods using mounted keys
kubectl get pods --all-namespaces -o json | \
  jq -r '.items[] | select(.spec.volumes[]?.secret.secretName | contains("gcp-key")) | .metadata.name'

# For each pod:
# 1. Set up Workload Identity service account
# 2. Update deployment to use new service account
# 3. Remove secret volume mount
# 4. Verify functionality
# 5. Delete the service account key secret

# Delete old keys
kubectl delete secret gcp-key-secret -n production
gcloud iam service-accounts keys delete KEY_ID \
  --iam-account=old-sa@my-project.iam.gserviceaccount.com
```

## Best Practices

Create separate Google Cloud service accounts for different workloads and environments. Never use the default compute service account which has overly broad permissions. Use custom IAM roles with minimum required permissions rather than predefined roles when possible.

Regularly audit service account permissions and remove unused accounts:

```bash
# List all service accounts
gcloud iam service-accounts list

# Check when each was last used
gcloud iam service-accounts get-iam-policy SA_EMAIL \
  --format=json | jq '.bindings'
```

Enable organization policy constraints to require Workload Identity and prevent service account key creation.

## Conclusion

Workload Identity provides secure, keyless authentication for Kubernetes pods accessing Google Cloud services. By eliminating service account keys, you reduce the risk of credential leakage and simplify credential management.

Start by enabling Workload Identity on your GKE cluster and migrating high-privilege workloads first. Create separate service accounts for different applications following least privilege principles. Use audit logging to monitor access patterns and detect anomalies.

The automatic credential management and tight integration with GCP client libraries makes Workload Identity straightforward to implement while significantly improving security posture. Combined with proper IAM policies and network controls, it forms a critical component of secure GKE deployments.
