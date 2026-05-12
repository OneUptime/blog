# Validation Summary: How to Provision S3 Buckets with Crossplane and Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Crossplane (Upbound `provider-aws-s3` family provider)
- AWS S3 (Bucket, BucketPublicAccessBlock, BucketServerSideEncryptionConfiguration, BucketVersioning, BucketLifecycleConfiguration, BucketPolicy)
- Flux CD (Kustomization controller, `kustomize.toolkit.fluxcd.io/v1`)
- GitOps / Infrastructure as Code
- AWS IAM policy language (S3 resource policy)

## Sources Consulted
- Upbound provider-aws-s3 API reference: https://marketplace.upbound.io/providers/upbound/provider-aws-s3/latest/resources/s3.aws.upbound.io/Bucket/v1beta1
- Upbound provider-aws-s3 BucketPublicAccessBlock: https://marketplace.upbound.io/providers/upbound/provider-aws-s3/latest/resources/s3.aws.upbound.io/BucketPublicAccessBlock/v1beta1
- Upbound provider-aws-s3 BucketServerSideEncryptionConfiguration: https://marketplace.upbound.io/providers/upbound/provider-aws-s3/latest/resources/s3.aws.upbound.io/BucketServerSideEncryptionConfiguration/v1beta1
- Upbound provider-aws-s3 BucketVersioning, BucketLifecycleConfiguration, BucketPolicy resources
- AWS S3 documentation on `BucketKeyEnabled` and SSE-KMS: https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-key.html
- AWS S3 public access block settings: https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html
- AWS S3 lifecycle configuration reference: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html
- AWS IAM policy condition `aws:SecureTransport`: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html#condition-keys-securetransport
- Flux CD Kustomization API v1 (GA): https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- **BucketPolicy comment was misleading.** The inline comment claimed the policy "enforces HTTPS-only access and deny unencrypted uploads," but the policy only contains a single statement denying requests where `aws:SecureTransport` is `false`. There is no statement that denies unencrypted uploads (which would require a condition on `s3:x-amz-server-side-encryption`). I updated the comment to accurately describe the policy as enforcing HTTPS-only access by denying any request not using TLS.

## Review Notes
- The Upbound managed-resource field names and structure (single-item list wrappers for blocks like `applyServerSideEncryptionByDefault`, `versioningConfiguration`, `filter`, `transition`, `noncurrentVersionExpiration`, `abortIncompleteMultipartUpload`) are correct for the `s3.aws.upbound.io/v1beta1` API group provided by the Upbound family provider.
- The use of `bucketRef.name` for cross-resource references is the standard Crossplane reference convention and is supported by all of the dependent S3 resources used here.
- `bucketKeyEnabled: true` is set on the encryption configuration even though `sseAlgorithm: AES256` (SSE-S3) is used. The bucket key feature only takes effect for SSE-KMS — it is effectively a no-op with SSE-S3. The comment already notes this is a KMS-cost optimization, so the value is harmless and forward-compatible if the user later switches to `aws:kms`. Left as-is.
- The introduction mentions defining a baseline "once in a Composition" but the post itself uses individual managed resources rather than a Crossplane Composition. This is a slight framing mismatch but not technically incorrect — the resources shown could be wrapped in a Composition later. Not a fix-worthy issue.
- The Flux Kustomization apiVersion `kustomize.toolkit.fluxcd.io/v1` is the GA version (Flux v2.0+) and is correct.
- `prune: false` on the Flux Kustomization is a sensible default for managed stateful resources like S3 buckets, and the post correctly explains why.
- `forceDestroy: false` is correctly described as a safety mechanism — Crossplane will fail bucket deletion attempts while the bucket contains objects.
