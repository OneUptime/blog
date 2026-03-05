# How to Set Up HelmChart Source from Bucket in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Helm, HelmChart, Bucket, S3, GCS, MinIO

Description: Learn how to configure a HelmChart source that pulls Helm charts from an S3-compatible or GCS Bucket source in Flux CD.

---

## Introduction

Flux CD supports pulling Helm charts from cloud storage buckets using the Bucket source type. This is useful when your CI/CD pipeline packages Helm charts and uploads them to an S3-compatible bucket (AWS S3, MinIO, DigitalOcean Spaces) or Google Cloud Storage (GCS). Instead of publishing charts to a Helm repository server, you can store packaged charts or chart directories directly in a bucket and let Flux pull them.

This guide covers setting up a Bucket source and creating HelmChart resources that reference it.

## Prerequisites

- A running Kubernetes cluster with Flux CD v2.x installed
- kubectl and the Flux CLI configured
- An S3-compatible bucket or GCS bucket containing Helm chart directories or packaged charts
- Credentials for accessing the bucket

## When to Use Bucket Sources for Helm Charts

Bucket sources are a good fit when:

- Your CI pipeline builds and pushes chart artifacts to object storage
- You use MinIO or another S3-compatible storage for internal distribution
- You want to avoid running a dedicated Helm repository server
- Your organization already uses cloud storage for artifact management

## Bucket Content Structure

When using a Bucket as a source for HelmChart resources, the bucket should contain chart directories at the expected paths.

```
my-bucket/
  charts/
    my-app/
      Chart.yaml
      values.yaml
      templates/
        deployment.yaml
        service.yaml
    my-api/
      Chart.yaml
      values.yaml
      templates/
        deployment.yaml
        service.yaml
```

## Step 1: Create a Bucket Source with AWS S3

First, create a secret with your S3 credentials, then define the Bucket resource.

```bash
# Create a secret with AWS S3 access credentials
kubectl create secret generic s3-bucket-creds \
  --namespace flux-system \
  --from-literal=accesskey=AKIAIOSFODNN7EXAMPLE \
  --from-literal=secretkey=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

```yaml
# bucket-s3.yaml
# Bucket source pointing to an AWS S3 bucket containing Helm charts
apiVersion: source.toolkit.fluxcd.io/v1
kind: Bucket
metadata:
  name: helm-charts-bucket
  namespace: flux-system
spec:
  # The S3-compatible provider (generic, aws, gcp, azure)
  provider: aws
  # Name of the S3 bucket
  bucketName: my-helm-charts
  # S3 endpoint (for AWS S3, use the regional endpoint)
  endpoint: s3.us-east-1.amazonaws.com
  # AWS region
  region: us-east-1
  # How often to check for new objects in the bucket
  interval: 10m
  # Reference the secret with S3 credentials
  secretRef:
    name: s3-bucket-creds
```

## Step 1 (Alternative): Create a Bucket Source with MinIO

For MinIO or other S3-compatible storage, use the generic provider.

```bash
# Create a secret with MinIO credentials
kubectl create secret generic minio-creds \
  --namespace flux-system \
  --from-literal=accesskey=minio-admin \
  --from-literal=secretkey=minio-secret-key
```

```yaml
# bucket-minio.yaml
# Bucket source pointing to a MinIO instance
apiVersion: source.toolkit.fluxcd.io/v1
kind: Bucket
metadata:
  name: minio-charts
  namespace: flux-system
spec:
  # Use generic provider for S3-compatible storage like MinIO
  provider: generic
  bucketName: helm-charts
  # MinIO endpoint (without the protocol prefix)
  endpoint: minio.internal.example.com:9000
  # Set to true if your MinIO uses HTTP instead of HTTPS
  insecure: false
  interval: 5m
  secretRef:
    name: minio-creds
```

## Step 1 (Alternative): Create a Bucket Source with GCS

For Google Cloud Storage, use the gcp provider.

```yaml
# bucket-gcs.yaml
# Bucket source pointing to a Google Cloud Storage bucket
apiVersion: source.toolkit.fluxcd.io/v1
kind: Bucket
metadata:
  name: gcs-charts
  namespace: flux-system
spec:
  # Use gcp provider for Google Cloud Storage
  provider: gcp
  bucketName: my-org-helm-charts
  # GCS endpoint
  endpoint: storage.googleapis.com
  interval: 10m
  # For GCP workload identity, the provider handles authentication
  # For service account keys, create a secret with the JSON key
  secretRef:
    name: gcs-creds
```

Create the GCS credentials secret.

```bash
# Create a secret with a GCP service account key
kubectl create secret generic gcs-creds \
  --namespace flux-system \
  --from-file=serviceaccount=path/to/service-account-key.json
```

## Step 2: Create a HelmChart from the Bucket

Once the Bucket source is created, define a HelmChart that references it. The `spec.chart` field is the path to the chart directory within the bucket.

```yaml
# helmchart-from-bucket.yaml
# HelmChart that pulls a chart from a Bucket source
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmChart
metadata:
  name: my-app
  namespace: flux-system
spec:
  # Path to the chart directory within the bucket
  chart: ./charts/my-app
  # Reference the Bucket source
  sourceRef:
    kind: Bucket
    name: helm-charts-bucket
  # How often to check for changes
  interval: 10m
  # Use Revision strategy to detect any changes in the bucket
  reconcileStrategy: Revision
```

Apply the resources.

```bash
# Apply the Bucket source and HelmChart
kubectl apply -f bucket-s3.yaml
kubectl apply -f helmchart-from-bucket.yaml
```

## Multiple Charts from One Bucket

If your bucket contains multiple charts, create separate HelmChart resources for each.

```yaml
# helmcharts-from-bucket.yaml
# Multiple HelmCharts from a single Bucket source
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmChart
metadata:
  name: frontend
  namespace: flux-system
spec:
  chart: ./charts/frontend
  sourceRef:
    kind: Bucket
    name: helm-charts-bucket
  interval: 10m
  reconcileStrategy: Revision
---
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmChart
metadata:
  name: backend-api
  namespace: flux-system
spec:
  chart: ./charts/backend-api
  sourceRef:
    kind: Bucket
    name: helm-charts-bucket
  interval: 10m
  reconcileStrategy: Revision
```

## Including Values Files from the Bucket

Just like Git-based charts, you can specify values files to include from the chart directory in the bucket.

```yaml
# helmchart-bucket-values.yaml
# HelmChart from Bucket with custom values files
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmChart
metadata:
  name: my-app-production
  namespace: flux-system
spec:
  chart: ./charts/my-app
  sourceRef:
    kind: Bucket
    name: helm-charts-bucket
  interval: 10m
  reconcileStrategy: Revision
  # Values files relative to the chart directory
  valuesFiles:
    - values.yaml
    - values-production.yaml
```

## Connecting to a HelmRelease

Use the Bucket-sourced HelmChart in a HelmRelease to deploy the chart.

```yaml
# helmrelease-from-bucket.yaml
# HelmRelease using a chart from a Bucket source
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 15m
  chart:
    spec:
      chart: ./charts/my-app
      sourceRef:
        kind: Bucket
        name: helm-charts-bucket
        namespace: flux-system
      interval: 10m
      reconcileStrategy: Revision
  values:
    replicaCount: 2
    image:
      repository: my-registry.example.com/my-app
      tag: "1.0.0"
```

## CI/CD Integration Example

A typical workflow uploads chart artifacts to the bucket after CI builds. Here is an example using the AWS CLI in a CI pipeline.

```bash
# Example CI step: Upload the chart directory to the S3 bucket
# This runs in your CI pipeline (GitHub Actions, GitLab CI, etc.)

# Package or sync the chart directory to S3
aws s3 sync ./charts/my-app s3://my-helm-charts/charts/my-app \
  --delete \
  --region us-east-1

# Flux will detect the new revision in the bucket on the next reconciliation
```

## Verifying the Setup

Check that the Bucket source and HelmChart are working.

```bash
# Verify the Bucket source is fetched
flux get sources bucket

# Verify the HelmChart is pulled from the bucket
flux get sources chart

# Get detailed status
kubectl describe bucket -n flux-system helm-charts-bucket
kubectl describe helmchart -n flux-system my-app
```

## Troubleshooting

**Bucket access denied** -- Verify the credentials in the secret are correct and that the IAM policy or bucket policy grants read access.

```bash
# Check bucket source conditions for error details
kubectl get bucket -n flux-system helm-charts-bucket -o jsonpath='{.status.conditions[*].message}'
```

**Chart not found at path** -- Ensure the path in `spec.chart` matches the actual directory structure in the bucket. The path should point to a directory containing a valid `Chart.yaml`.

**Stale data** -- If the bucket content updates but Flux does not detect changes, force a reconciliation.

```bash
# Force reconciliation of the Bucket source
flux reconcile source bucket helm-charts-bucket

# Then reconcile the HelmChart
flux reconcile source chart my-app
```

## Summary

Using a Bucket source for HelmChart resources in Flux CD is a practical alternative when you want to distribute Helm charts through cloud storage. Define a Bucket resource pointing to your S3-compatible or GCS bucket, create HelmChart resources with directory paths, and connect them to HelmRelease resources for deployment. This pattern integrates well with CI/CD pipelines that already use object storage for artifact distribution and avoids the need for a dedicated Helm repository server.
