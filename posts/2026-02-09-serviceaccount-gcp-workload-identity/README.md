# How to Implement ServiceAccount for GCP Workload Identity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, GCP, Security

Description: Configure GCP Workload Identity for Kubernetes ServiceAccounts to grant pods secure access to Google Cloud services without service account keys.

---

GCP Workload Identity allows Kubernetes pods to authenticate with Google Cloud services using their ServiceAccount tokens instead of service account key files. This eliminates the security risks of managing and distributing service account keys while providing seamless cloud integration.

## Understanding GCP Workload Identity

Workload Identity creates a bridge between Kubernetes ServiceAccounts and GCP service accounts. When enabled, pods can impersonate GCP service accounts using their Kubernetes identity, exchanging ServiceAccount tokens for GCP access tokens through a metadata server.

The authentication flow works through several steps. A pod makes a request to the GKE metadata server. The metadata server validates the pod's ServiceAccount token. The server exchanges the token for a GCP access token. The pod uses this access token to call Google Cloud APIs.

This provides significant advantages. No service account keys to manage or rotate. Tokens are short-lived and automatically refreshed. Fine-grained IAM permissions through GCP IAM policies. Comprehensive audit logging through Cloud Logging.

## Enabling Workload Identity on GKE

Enable Workload Identity when creating a cluster:

```bash
# Create a new GKE cluster with Workload Identity
gcloud container clusters create my-cluster \
    --region=us-central1 \
    --workload-pool=PROJECT_ID.svc.id.goog \
    --enable-autorepair \
    --enable-autoupgrade

# For existing clusters, enable Workload Identity
gcloud container clusters update my-cluster \
    --region=us-central1 \
    --workload-pool=PROJECT_ID.svc.id.goog
```

Update node pools to use Workload Identity:

```bash
# For new node pools
gcloud container node-pools create workload-pool \
    --cluster=my-cluster \
    --region=us-central1 \
    --workload-metadata=GKE_METADATA

# For existing node pools
gcloud container node-pools update default-pool \
    --cluster=my-cluster \
    --region=us-central1 \
    --workload-metadata=GKE_METADATA
```

Get cluster credentials:

```bash
gcloud container clusters get-credentials my-cluster --region=us-central1
```

## Creating GCP Service Accounts

Create a GCP service account for your workload:

```bash
# Create GCP service account
gcloud iam service-accounts create gcs-app \
    --display-name="GCS Application Service Account" \
    --project=PROJECT_ID

# Verify creation
gcloud iam service-accounts list --project=PROJECT_ID
```

Grant necessary IAM permissions:

```bash
# Grant Storage Object Viewer role
gcloud projects add-iam-policy-binding PROJECT_ID \
    --member="serviceAccount:gcs-app@PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.objectViewer"

# Grant specific bucket access
gsutil iam ch \
    serviceAccount:gcs-app@PROJECT_ID.iam.gserviceaccount.com:roles/storage.objectViewer \
    gs://my-bucket
```

## Binding Kubernetes and GCP Service Accounts

Create a Kubernetes ServiceAccount:

```yaml
# gcs-app-serviceaccount.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: gcs-app
  namespace: production
  annotations:
    iam.gke.io/gcp-service-account: gcs-app@PROJECT_ID.iam.gserviceaccount.com
```

Apply the ServiceAccount:

```bash
kubectl apply -f gcs-app-serviceaccount.yaml
```

Bind the accounts using IAM policy:

```bash
# Allow Kubernetes SA to impersonate GCP SA
gcloud iam service-accounts add-iam-policy-binding \
    gcs-app@PROJECT_ID.iam.gserviceaccount.com \
    --role roles/iam.workloadIdentityUser \
    --member "serviceAccount:PROJECT_ID.svc.id.goog[production/gcs-app]"

# Verify the binding
gcloud iam service-accounts get-iam-policy \
    gcs-app@PROJECT_ID.iam.gserviceaccount.com
```

The member format is `serviceAccount:PROJECT_ID.svc.id.goog[NAMESPACE/K8S_SA_NAME]`.

## Deploying Pods with Workload Identity

Create a pod using the configured ServiceAccount:

```yaml
# gcs-reader-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: gcs-reader
  namespace: production
spec:
  serviceAccountName: gcs-app
  containers:
  - name: app
    image: google/cloud-sdk:slim
    command:
    - /bin/bash
    - -c
    - |
      echo "Testing GCS access with Workload Identity..."
      gcloud auth list
      gsutil ls gs://my-bucket
      sleep 3600
```

Deploy and verify:

```bash
kubectl apply -f gcs-reader-pod.yaml

# Check logs
kubectl logs gcs-reader -n production

# Verify the service account being used
kubectl exec gcs-reader -n production -- gcloud auth list
```

You should see the GCP service account listed as the active account.

## Using GCP Client Libraries

The GCP client libraries automatically detect Workload Identity:

```go
// gcs-access.go
package main

import (
    "context"
    "fmt"
    "log"

    "cloud.google.com/go/storage"
    "google.golang.org/api/iterator"
)

func main() {
    ctx := context.Background()

    // Create storage client - automatically uses Workload Identity
    client, err := storage.NewClient(ctx)
    if err != nil {
        log.Fatalf("Failed to create client: %v", err)
    }
    defer client.Close()

    // List buckets
    fmt.Println("Buckets:")
    it := client.Buckets(ctx, "PROJECT_ID")
    for {
        bucketAttrs, err := it.Next()
        if err == iterator.Done {
            break
        }
        if err != nil {
            log.Fatalf("Failed to list buckets: %v", err)
        }
        fmt.Printf("  - %s\n", bucketAttrs.Name)
    }

    // List objects in a bucket
    fmt.Println("\nObjects in my-bucket:")
    objectIt := client.Bucket("my-bucket").Objects(ctx, nil)
    for {
        attrs, err := objectIt.Next()
        if err == iterator.Done {
            break
        }
        if err != nil {
            log.Fatalf("Failed to list objects: %v", err)
        }
        fmt.Printf("  - %s\n", attrs.Name)
    }
}
```

No explicit credential configuration needed - the library uses Workload Identity automatically.

## Python Implementation

For Python applications:

```python
# gcs_access.py
from google.cloud import storage
from google.cloud import secretmanager
import os

def main():
    # GCP libraries automatically use Workload Identity
    project_id = os.environ.get('GCP_PROJECT', 'PROJECT_ID')

    # Access Cloud Storage
    storage_client = storage.Client(project=project_id)

    print("Buckets:")
    buckets = storage_client.list_buckets()
    for bucket in buckets:
        print(f"  - {bucket.name}")

    # List objects in a bucket
    print("\nObjects in my-bucket:")
    bucket = storage_client.bucket('my-bucket')
    blobs = bucket.list_blobs()
    for blob in blobs:
        print(f"  - {blob.name}")

    # Access Secret Manager
    secret_client = secretmanager.SecretManagerServiceClient()
    secret_name = f"projects/{project_id}/secrets/my-secret/versions/latest"

    response = secret_client.access_secret_version(request={"name": secret_name})
    secret_value = response.payload.data.decode('UTF-8')
    print(f"\nSecret value length: {len(secret_value)}")

if __name__ == "__main__":
    main()
```

## Accessing Multiple GCP Services

Grant permissions for multiple services:

```bash
# Cloud Storage
gcloud projects add-iam-policy-binding PROJECT_ID \
    --member="serviceAccount:gcs-app@PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.objectViewer"

# Secret Manager
gcloud projects add-iam-policy-binding PROJECT_ID \
    --member="serviceAccount:gcs-app@PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

# Pub/Sub
gcloud projects add-iam-policy-binding PROJECT_ID \
    --member="serviceAccount:gcs-app@PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/pubsub.publisher"

# BigQuery
gcloud projects add-iam-policy-binding PROJECT_ID \
    --member="serviceAccount:gcs-app@PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/bigquery.dataViewer"
```

## Production Deployment Configuration

Configure Workload Identity for a Deployment:

```yaml
# production-deployment.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: production-app
  namespace: production
  annotations:
    iam.gke.io/gcp-service-account: production-app@PROJECT_ID.iam.gserviceaccount.com
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: production-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: production-app
  template:
    metadata:
      labels:
        app: production-app
    spec:
      serviceAccountName: production-app
      containers:
      - name: app
        image: gcr.io/PROJECT_ID/myapp:latest
        ports:
        - containerPort: 8080
        env:
        - name: GCP_PROJECT
          value: PROJECT_ID
        - name: GCS_BUCKET
          value: my-bucket
```

All replicas automatically use Workload Identity.

## Cross-Project Access

Access resources in different GCP projects:

```bash
# Create service account in source project
gcloud iam service-accounts create cross-project-app \
    --project=SOURCE_PROJECT_ID

# Grant permissions in target project
gcloud projects add-iam-policy-binding TARGET_PROJECT_ID \
    --member="serviceAccount:cross-project-app@SOURCE_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.objectViewer"

# Bind Kubernetes SA to GCP SA
gcloud iam service-accounts add-iam-policy-binding \
    cross-project-app@SOURCE_PROJECT_ID.iam.gserviceaccount.com \
    --role roles/iam.workloadIdentityUser \
    --member "serviceAccount:SOURCE_PROJECT_ID.svc.id.goog[production/cross-project-app]" \
    --project=SOURCE_PROJECT_ID
```

## Using Service Account Impersonation

Impersonate service accounts for additional flexibility:

```go
// impersonation.go
package main

import (
    "context"
    "fmt"

    "cloud.google.com/go/storage"
    "golang.org/x/oauth2/google"
    "google.golang.org/api/impersonate"
    "google.golang.org/api/option"
)

func main() {
    ctx := context.Background()

    // Create impersonated credentials
    targetServiceAccount := "target-sa@PROJECT_ID.iam.gserviceaccount.com"
    ts, err := impersonate.CredentialsTokenSource(ctx, impersonate.CredentialsConfig{
        TargetPrincipal: targetServiceAccount,
        Scopes:          []string{storage.ScopeReadOnly},
    })
    if err != nil {
        panic(err)
    }

    // Use impersonated credentials
    client, err := storage.NewClient(ctx, option.WithTokenSource(ts))
    if err != nil {
        panic(err)
    }
    defer client.Close()

    fmt.Printf("Successfully impersonated %s\n", targetServiceAccount)
}
```

This requires the workload identity service account to have `roles/iam.serviceAccountTokenCreator` on the target account.

## Troubleshooting Workload Identity

Common debugging steps:

```bash
# Verify cluster has Workload Identity enabled
gcloud container clusters describe my-cluster \
    --region=us-central1 \
    --format="value(workloadIdentityConfig.workloadPool)"

# Check node pool metadata configuration
gcloud container node-pools describe default-pool \
    --cluster=my-cluster \
    --region=us-central1 \
    --format="value(config.workloadMetadataConfig.mode)"

# Verify ServiceAccount annotation
kubectl get serviceaccount gcs-app -n production -o yaml

# Check IAM binding
gcloud iam service-accounts get-iam-policy \
    gcs-app@PROJECT_ID.iam.gserviceaccount.com

# Test from within pod
kubectl exec gcs-reader -n production -- curl -H "Metadata-Flavor: Google" \
    http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/email

# Check application default credentials
kubectl exec gcs-reader -n production -- gcloud auth application-default print-access-token
```

## Monitoring and Auditing

Enable Cloud Audit Logs:

```bash
# Enable Data Access audit logs for specific services
gcloud projects get-iam-policy PROJECT_ID \
    --format=json > policy.json

# Add audit config (edit policy.json)
cat >> policy.json <<EOF
{
  "auditConfigs": [
    {
      "service": "storage.googleapis.com",
      "auditLogConfigs": [
        { "logType": "DATA_READ" },
        { "logType": "DATA_WRITE" }
      ]
    }
  ]
}
EOF

gcloud projects set-iam-policy PROJECT_ID policy.json
```

Query audit logs:

```bash
# Find Workload Identity authentication events
gcloud logging read \
    'protoPayload.methodName="google.iam.credentials.v1.IAMCredentials.GenerateAccessToken"
     AND protoPayload.authenticationInfo.principalEmail:".gserviceaccount.com"' \
    --limit=50 \
    --format=json

# Monitor failed authentication attempts
gcloud logging read \
    'protoPayload.status.code!=0
     AND resource.type="k8s_cluster"' \
    --limit=50
```

## Security Best Practices

Use separate service accounts per application:

```bash
# Don't reuse service accounts
gcloud iam service-accounts create app1-sa --project=PROJECT_ID
gcloud iam service-accounts create app2-sa --project=PROJECT_ID

# Grant minimal permissions
gcloud projects add-iam-policy-binding PROJECT_ID \
    --member="serviceAccount:app1-sa@PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.objectViewer" \
    --condition='resource.name.startsWith("projects/_/buckets/app1-bucket")'
```

Use custom roles for fine-grained permissions:

```bash
# Create custom role
gcloud iam roles create customStorageRole \
    --project=PROJECT_ID \
    --title="Custom Storage Role" \
    --permissions=storage.buckets.get,storage.objects.get,storage.objects.list

# Assign custom role
gcloud projects add-iam-policy-binding PROJECT_ID \
    --member="serviceAccount:app-sa@PROJECT_ID.iam.gserviceaccount.com" \
    --role="projects/PROJECT_ID/roles/customStorageRole"
```

## Conclusion

GCP Workload Identity provides secure, keyless authentication for GKE workloads accessing Google Cloud services. By binding Kubernetes ServiceAccounts to GCP service accounts through IAM policies and using the `iam.gke.io/gcp-service-account` annotation, you enable pods to impersonate GCP service accounts using their Kubernetes identity. This eliminates service account keys, provides automatic credential management, and integrates seamlessly with GCP IAM. Implement Workload Identity for all GKE workloads that need Google Cloud access - it's the most secure authentication method available for GKE.
