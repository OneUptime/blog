# How to Configure FluxInstance Sync Settings for Bucket

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Flux-Operator, FluxInstance, Bucket, S3, GCS, Sync, Kubernetes, GitOps

Description: Learn how to configure FluxInstance sync settings with a Bucket source to pull cluster manifests from S3-compatible or GCS object storage.

---

## Introduction

Flux supports object storage buckets as a source type, allowing you to pull cluster manifests from Amazon S3, Google Cloud Storage, Azure Blob Storage, or any S3-compatible service like MinIO. This is useful when your deployment artifacts are produced by CI/CD systems that upload to object storage, or when you prefer object storage over Git for artifact distribution.

The Flux Operator lets you configure Bucket-based sync directly in the FluxInstance spec. This guide covers how to set up FluxInstance sync settings for a Bucket source across different cloud providers and S3-compatible storage.

## Prerequisites

- A Kubernetes cluster (v1.28 or later)
- kubectl configured to access your cluster
- The Flux Operator installed in your cluster
- An S3-compatible bucket, GCS bucket, or Azure Blob container with your manifests
- Appropriate cloud credentials

## Basic Bucket Sync Configuration

Here is a minimal FluxInstance configuration that syncs from an S3 bucket:

```yaml
apiVersion: fluxcd.controlplane.io/v1
kind: FluxInstance
metadata:
  name: flux
  namespace: flux-system
spec:
  distribution:
    version: "2.x"
    registry: "ghcr.io/fluxcd"
  components:
    - source-controller
    - kustomize-controller
    - helm-controller
    - notification-controller
  sync:
    kind: Bucket
    url: s3://my-fleet-bucket
    ref: us-east-1
    path: clusters/production
    interval: 5m
    pullSecret: bucket-credentials
```

For Bucket sync, the fields have specific meanings:

- `kind`: Set to `Bucket`
- `url`: The bucket URL with scheme (`s3://` for S3-compatible or `gcs://` for GCS)
- `ref`: The bucket region or endpoint, depending on the provider
- `path`: The directory within the bucket to sync
- `pullSecret`: The Secret containing access credentials

## Understanding the Bucket Sync Flow

```mermaid
graph TD
    A[CI/CD Pipeline] -->|Upload manifests| B[Object Storage Bucket]
    C[FluxInstance] --> D[Flux Operator]
    D --> E[Creates Bucket Source]
    D --> F[Creates Kustomization]
    E -->|Downloads objects| B
    E --> F
    F --> G[Applies Manifests to Cluster]
```

## Configuring AWS S3

Create a Secret with your AWS credentials:

```bash
kubectl create secret generic bucket-credentials \
  --namespace=flux-system \
  --from-literal=accesskey=AKIAIOSFODNN7EXAMPLE \
  --from-literal=secretkey=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

Configure the FluxInstance:

```yaml
apiVersion: fluxcd.controlplane.io/v1
kind: FluxInstance
metadata:
  name: flux
  namespace: flux-system
spec:
  distribution:
    version: "2.x"
    registry: "ghcr.io/fluxcd"
  components:
    - source-controller
    - kustomize-controller
    - helm-controller
    - notification-controller
  sync:
    kind: Bucket
    url: s3://fleet-manifests-prod
    ref: us-west-2
    path: clusters/production
    interval: 5m
    pullSecret: bucket-credentials
```

For IRSA-based authentication on EKS, you can skip the Secret and instead annotate the Flux service account. Use a Kustomize patch to add the annotation:

```yaml
apiVersion: fluxcd.controlplane.io/v1
kind: FluxInstance
metadata:
  name: flux
  namespace: flux-system
spec:
  distribution:
    version: "2.x"
    registry: "ghcr.io/fluxcd"
  components:
    - source-controller
    - kustomize-controller
    - helm-controller
    - notification-controller
  sync:
    kind: Bucket
    url: s3://fleet-manifests-prod
    ref: us-west-2
    path: clusters/production
    interval: 5m
  kustomize:
    patches:
      - target:
          kind: ServiceAccount
          name: source-controller
        patch: |
          - op: add
            path: /metadata/annotations
            value:
              eks.amazonaws.com/role-arn: "arn:aws:iam::123456789012:role/flux-source-controller"
```

## Configuring Google Cloud Storage

For GCS, create a Secret with a service account key:

```bash
kubectl create secret generic bucket-credentials \
  --namespace=flux-system \
  --from-file=serviceaccount=./gcp-sa-key.json
```

Configure the FluxInstance with a GCS bucket:

```yaml
apiVersion: fluxcd.controlplane.io/v1
kind: FluxInstance
metadata:
  name: flux
  namespace: flux-system
spec:
  distribution:
    version: "2.x"
    registry: "ghcr.io/fluxcd"
  components:
    - source-controller
    - kustomize-controller
    - helm-controller
    - notification-controller
  sync:
    kind: Bucket
    url: gcs://fleet-manifests-prod
    path: clusters/production
    interval: 5m
    pullSecret: bucket-credentials
```

## Configuring MinIO or S3-Compatible Storage

For self-hosted S3-compatible storage like MinIO, create the credentials Secret:

```bash
kubectl create secret generic bucket-credentials \
  --namespace=flux-system \
  --from-literal=accesskey=minioadmin \
  --from-literal=secretkey=minioadmin
```

Configure the FluxInstance with the MinIO endpoint:

```yaml
apiVersion: fluxcd.controlplane.io/v1
kind: FluxInstance
metadata:
  name: flux
  namespace: flux-system
spec:
  distribution:
    version: "2.x"
    registry: "ghcr.io/fluxcd"
  components:
    - source-controller
    - kustomize-controller
    - helm-controller
    - notification-controller
  sync:
    kind: Bucket
    url: s3://fleet-manifests
    ref: minio.storage.svc.cluster.local
    path: clusters/production
    interval: 5m
    pullSecret: bucket-credentials
```

## Uploading Manifests to the Bucket

Use the AWS CLI or cloud-specific tools to upload your manifests:

```bash
# AWS S3
aws s3 sync ./clusters/production s3://fleet-manifests-prod/clusters/production

# GCS
gsutil -m rsync -r ./clusters/production gs://fleet-manifests-prod/clusters/production

# MinIO
mc cp --recursive ./clusters/production myminio/fleet-manifests/clusters/production
```

## Verifying the Bucket Sync

After applying the FluxInstance, check the Bucket source status:

```bash
kubectl get buckets -n flux-system
kubectl describe bucket flux-system -n flux-system
```

Verify the Kustomization is reconciling:

```bash
kubectl get kustomizations -n flux-system
```

## Choosing an Appropriate Interval

Since buckets do not support webhooks for push-based notifications, Flux relies on polling. The source-controller downloads the bucket contents and computes a checksum to detect changes. Set the interval based on your update frequency:

- **1m-2m**: For rapid iteration in development
- **5m**: Good default for most environments
- **15m-30m**: For stable production environments with infrequent updates

## Conclusion

Bucket-based sync with FluxInstance provides a straightforward way to deliver cluster manifests through object storage. Whether you use AWS S3, GCS, Azure Blob Storage, or a self-hosted MinIO instance, the configuration follows the same pattern: create a credentials Secret, configure the bucket URL and path in the FluxInstance sync settings, and let the Flux Operator handle the rest. This approach is particularly effective when your CI/CD pipeline already produces artifacts in object storage.
