# How to Provision S3 Buckets with Crossplane and Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Crossplane, AWS, S3, GitOps, Kubernetes, Storage, Infrastructure as Code

Description: Provision AWS S3 buckets using Crossplane managed resources reconciled by Flux CD for GitOps-driven object storage management.

---

## Introduction

AWS S3 buckets are among the most commonly provisioned cloud resources. Whether storing application assets, backup archives, or data pipeline outputs, S3 is ubiquitous in AWS architectures. Provisioning and configuring buckets through Crossplane and Flux means bucket policies, versioning settings, lifecycle rules, and encryption configurations are all version-controlled in Git.

A key advantage of this approach is consistency. Every bucket your platform provisions inherits the same security baseline: encryption at rest, versioning enabled, public access blocked, and lifecycle rules applied. This baseline is defined once in a Composition and applied to every bucket that platform users request.

This guide covers provisioning S3 buckets with security best practices baked in, including server-side encryption, public access blocking, versioning, and lifecycle rules.

## Prerequisites

- Crossplane with `provider-aws-s3` installed
- The AWS ProviderConfig named `default` configured
- Flux CD bootstrapped on the cluster

## Step 1: Create a Basic S3 Bucket

```yaml
# infrastructure/storage/s3/application-assets-bucket.yaml
apiVersion: s3.aws.upbound.io/v1beta1
kind: Bucket
metadata:
  name: my-app-assets-prod
spec:
  forProvider:
    region: us-east-1
    # Force destroy allows deleting non-empty buckets via Crossplane
    # Set to false for production buckets to prevent accidental data loss
    forceDestroy: false
    tags:
      Environment: production
      ManagedBy: crossplane
      Application: my-app
  providerConfigRef:
    name: default
```

## Step 2: Block All Public Access

```yaml
# infrastructure/storage/s3/public-access-block.yaml
apiVersion: s3.aws.upbound.io/v1beta1
kind: BucketPublicAccessBlock
metadata:
  name: my-app-assets-prod-public-access-block
spec:
  forProvider:
    region: us-east-1
    bucketRef:
      name: my-app-assets-prod
    # Block all forms of public access
    blockPublicAcls: true
    blockPublicPolicy: true
    ignorePublicAcls: true
    restrictPublicBuckets: true
  providerConfigRef:
    name: default
```

## Step 3: Enable Server-Side Encryption

```yaml
# infrastructure/storage/s3/bucket-encryption.yaml
apiVersion: s3.aws.upbound.io/v1beta1
kind: BucketServerSideEncryptionConfiguration
metadata:
  name: my-app-assets-prod-encryption
spec:
  forProvider:
    region: us-east-1
    bucketRef:
      name: my-app-assets-prod
    rule:
      - applyServerSideEncryptionByDefault:
          - # Use SSE-S3 (AES-256) for encryption at rest
            # Switch to aws:kms if you need customer-managed keys
            sseAlgorithm: AES256
        # Bucket keys reduce KMS API calls and costs when using SSE-KMS
        bucketKeyEnabled: true
  providerConfigRef:
    name: default
```

## Step 4: Enable Versioning

```yaml
# infrastructure/storage/s3/bucket-versioning.yaml
apiVersion: s3.aws.upbound.io/v1beta1
kind: BucketVersioning
metadata:
  name: my-app-assets-prod-versioning
spec:
  forProvider:
    region: us-east-1
    bucketRef:
      name: my-app-assets-prod
    versioningConfiguration:
      - status: Enabled
  providerConfigRef:
    name: default
```

## Step 5: Configure Lifecycle Rules

```yaml
# infrastructure/storage/s3/bucket-lifecycle.yaml
apiVersion: s3.aws.upbound.io/v1beta1
kind: BucketLifecycleConfiguration
metadata:
  name: my-app-assets-prod-lifecycle
spec:
  forProvider:
    region: us-east-1
    bucketRef:
      name: my-app-assets-prod
    rule:
      # Transition infrequently accessed objects to cheaper storage
      - id: transition-to-ia
        status: Enabled
        filter:
          - prefix: "logs/"
        transition:
          - days: 30
            storageClass: STANDARD_IA
          - days: 90
            storageClass: GLACIER
        # Clean up old versions after 365 days
        noncurrentVersionExpiration:
          - noncurrentDays: 365
        # Remove incomplete multipart uploads
        abortIncompleteMultipartUpload:
          - daysAfterInitiation: 7
  providerConfigRef:
    name: default
```

## Step 6: Create a Bucket Policy

```yaml
# infrastructure/storage/s3/bucket-policy.yaml
apiVersion: s3.aws.upbound.io/v1beta1
kind: BucketPolicy
metadata:
  name: my-app-assets-prod-policy
spec:
  forProvider:
    region: us-east-1
    bucketRef:
      name: my-app-assets-prod
    # Enforce HTTPS-only access and deny unencrypted uploads
    policy: |
      {
        "Version": "2012-10-17",
        "Statement": [
          {
            "Sid": "DenyHTTP",
            "Effect": "Deny",
            "Principal": "*",
            "Action": "s3:*",
            "Resource": [
              "arn:aws:s3:::my-app-assets-prod",
              "arn:aws:s3:::my-app-assets-prod/*"
            ],
            "Condition": {
              "Bool": {
                "aws:SecureTransport": "false"
              }
            }
          }
        ]
      }
  providerConfigRef:
    name: default
```

## Step 7: Create the Flux Kustomization

```yaml
# clusters/my-cluster/infrastructure/s3-buckets.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: s3-buckets
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/storage/s3
  prune: false  # Never auto-delete S3 buckets
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: crossplane-providers-aws
```

## Best Practices

- Always create a `BucketPublicAccessBlock` resource alongside every bucket. The default S3 bucket configuration does not block public access, which can lead to accidental data exposure.
- Set `forceDestroy: false` for production buckets. This prevents the bucket from being deleted while it contains objects, providing a safety net against accidental manifest removal.
- Use `BucketServerSideEncryptionConfiguration` with SSE-KMS and a customer-managed KMS key for buckets containing sensitive data, giving you full control over key rotation and access.
- Apply `BucketLifecycleConfiguration` rules to all buckets to prevent unbounded storage growth and automatically transition data to cost-appropriate storage classes.
- Use S3 Object Lock for compliance workloads that require WORM (write once, read many) storage.

## Conclusion

AWS S3 buckets with security best practices baked in are now provisioned and managed through Crossplane and Flux CD. Every bucket configuration element, from encryption to lifecycle rules to bucket policies, is defined in Git and continuously reconciled. Adding a new bucket is as simple as committing a new Bucket manifest and letting Flux apply it.
