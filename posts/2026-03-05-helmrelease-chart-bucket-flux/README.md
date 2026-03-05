# How to Use HelmRelease with Chart from Bucket in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Helm, HelmRelease, Bucket, S3, GCS, MinIO, Chart Source

Description: Learn how to configure a HelmRelease to source Helm charts from an S3-compatible Bucket source in Flux CD.

---

Flux CD supports sourcing artifacts from S3-compatible storage through the Bucket source type. This lets you store Helm charts in services like AWS S3, Google Cloud Storage, Azure Blob Storage, or MinIO, and deploy them using HelmRelease. This is particularly useful for organizations that already use object storage for artifact distribution or need an alternative to Git and OCI registries.

## Why Use Buckets for Helm Charts?

There are several scenarios where bucket-based chart storage makes sense:

- **Air-gapped environments** -- Object storage may be the only available artifact distribution method
- **CI/CD pipelines** -- Build pipelines can push chart archives directly to S3 buckets
- **Existing infrastructure** -- Organizations already using S3 for artifact management
- **Performance** -- S3 can serve large numbers of charts with low latency and high availability

## Prerequisites

- Kubernetes cluster with Flux CD v2.x or later
- An S3-compatible bucket containing Helm chart packages (`.tgz` files) or chart directories
- `kubectl` and `flux` CLI tools
- Bucket access credentials

## Setting Up the Bucket Source

Create a Bucket source that points to your S3-compatible storage:

```yaml
# Bucket source pointing to an S3 bucket with Helm charts
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: Bucket
metadata:
  name: helm-charts-bucket
  namespace: flux-system
spec:
  interval: 5m
  # S3-compatible provider: aws, gcp, azure, or generic
  provider: aws
  bucketName: my-helm-charts
  endpoint: s3.amazonaws.com
  region: us-east-1
  secretRef:
    name: bucket-credentials
```

Create the credentials secret:

```yaml
# Secret with S3 access credentials
apiVersion: v1
kind: Secret
metadata:
  name: bucket-credentials
  namespace: flux-system
type: Opaque
stringData:
  accesskey: <your-access-key-id>
  secretkey: <your-secret-access-key>
```

## Bucket Structure

Your bucket should contain either packaged chart archives or chart directories. A typical structure looks like this:

```
my-helm-charts/
  my-app/
    Chart.yaml
    values.yaml
    templates/
      deployment.yaml
      service.yaml
  another-app/
    Chart.yaml
    values.yaml
    templates/
      ...
```

Alternatively, you can store packaged `.tgz` chart files.

## Using HelmRelease with a Bucket Source

Reference the Bucket source in your HelmRelease using `spec.chart.spec.sourceRef`:

```yaml
# HelmRelease sourcing a chart from a Bucket
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 10m
  chart:
    spec:
      # Path to the chart within the bucket
      chart: ./my-app
      sourceRef:
        kind: Bucket
        name: helm-charts-bucket
        namespace: flux-system
      reconcileStrategy: Revision
  values:
    replicaCount: 2
    image:
      repository: my-registry/my-app
      tag: "1.0.0"
```

## Using MinIO as the Bucket Backend

MinIO is a popular self-hosted S3-compatible storage solution. Here is how to configure a Bucket source for MinIO:

```yaml
# Bucket source for MinIO
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: Bucket
metadata:
  name: minio-charts
  namespace: flux-system
spec:
  interval: 5m
  provider: generic
  bucketName: helm-charts
  # MinIO endpoint -- use your MinIO service URL
  endpoint: minio.minio-system.svc.cluster.local:9000
  # Set to true if MinIO uses HTTP instead of HTTPS
  insecure: true
  secretRef:
    name: minio-credentials
---
# MinIO credentials
apiVersion: v1
kind: Secret
metadata:
  name: minio-credentials
  namespace: flux-system
type: Opaque
stringData:
  accesskey: minioadmin
  secretkey: minioadmin
```

## Using Google Cloud Storage

For GCS buckets, use the `gcp` provider:

```yaml
# Bucket source for Google Cloud Storage
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: Bucket
metadata:
  name: gcs-charts
  namespace: flux-system
spec:
  interval: 5m
  provider: gcp
  bucketName: my-helm-charts
  endpoint: storage.googleapis.com
  secretRef:
    name: gcs-credentials
---
# GCS credentials (service account key JSON)
apiVersion: v1
kind: Secret
metadata:
  name: gcs-credentials
  namespace: flux-system
type: Opaque
stringData:
  serviceaccount: |
    {
      "type": "service_account",
      "project_id": "my-project",
      ...
    }
```

## Using Azure Blob Storage

For Azure Blob Storage:

```yaml
# Bucket source for Azure Blob Storage
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: Bucket
metadata:
  name: azure-charts
  namespace: flux-system
spec:
  interval: 5m
  provider: azure
  bucketName: helm-charts
  endpoint: https://myaccount.blob.core.windows.net
  secretRef:
    name: azure-credentials
```

## Complete End-to-End Example

Here is a full working example with a Bucket source and HelmRelease:

```yaml
# Bucket source
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: Bucket
metadata:
  name: charts-bucket
  namespace: flux-system
spec:
  interval: 5m
  provider: aws
  bucketName: production-charts
  endpoint: s3.us-west-2.amazonaws.com
  region: us-west-2
  secretRef:
    name: s3-credentials
---
# HelmRelease using the Bucket source
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: web-app
  namespace: production
spec:
  interval: 10m
  chart:
    spec:
      chart: ./web-app
      sourceRef:
        kind: Bucket
        name: charts-bucket
        namespace: flux-system
      reconcileStrategy: Revision
  install:
    createNamespace: true
    timeout: 5m
  upgrade:
    timeout: 5m
  values:
    replicaCount: 3
    ingress:
      enabled: true
      host: app.example.com
```

## Verifying the Setup

After applying the resources:

```bash
# Check the Bucket source status
flux get source bucket charts-bucket -n flux-system

# Check the HelmRelease status
flux get helmrelease web-app -n production

# View detailed Bucket status including last fetched revision
kubectl describe bucket charts-bucket -n flux-system

# Check for errors
kubectl events -n flux-system --for bucket/charts-bucket
```

## Uploading Charts to S3

Here is how to push a chart to your S3 bucket using the AWS CLI:

```bash
# Package your Helm chart
helm package ./my-chart

# Upload the chart directory to S3
aws s3 sync ./my-chart s3://my-helm-charts/my-chart/

# Or upload a packaged chart
aws s3 cp my-chart-1.0.0.tgz s3://my-helm-charts/
```

## Troubleshooting

Common issues when using Bucket sources:

```bash
# Check for authentication errors
kubectl describe bucket charts-bucket -n flux-system | grep -A 5 "Message"

# Common error: "access denied" -- verify IAM permissions and credentials
# Common error: "bucket not found" -- verify bucket name and region
# Common error: "chart not found at path" -- verify the chart path in the bucket

# Force a reconciliation
flux reconcile source bucket charts-bucket -n flux-system
```

## Best Practices

1. **Use IAM roles where possible.** For AWS, use IRSA (IAM Roles for Service Accounts) instead of static credentials.
2. **Enable versioning on the bucket.** This provides rollback capability and audit trail for chart changes.
3. **Use separate buckets per environment.** Keep production and development charts in different buckets for isolation.
4. **Set reconcileStrategy to Revision.** This ensures the HelmRelease updates when the bucket content changes.
5. **Encrypt bucket contents.** Enable server-side encryption on your buckets for security.

## Conclusion

Bucket sources in Flux provide a flexible way to distribute Helm charts through S3-compatible object storage. By configuring a Bucket source and referencing it in your HelmRelease via `spec.chart.spec.sourceRef`, you can deploy charts from AWS S3, GCS, Azure Blob Storage, MinIO, or any S3-compatible service. This approach is especially valuable in air-gapped environments and CI/CD pipelines where object storage is the primary artifact distribution mechanism.
