# Validation Summary: How to Configure FluxInstance Sync Settings for Bucket

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux Operator
- FluxInstance
- Flux source-controller Bucket sources
- Kubernetes
- Amazon S3
- Google Cloud Storage
- MinIO / S3-compatible object storage
- kubectl

## Sources Consulted
- Flux Operator FluxInstance API reference: https://fluxoperator.dev/docs/crd/fluxinstance/
- Flux Operator cluster sync configuration: https://fluxoperator.dev/docs/instance/sync/
- Flux source-controller Bucket documentation: https://fluxcd.io/flux/components/source/buckets/
- Flux source API reference: https://fluxcd.io/flux/components/source/api/v1/
- Flux Operator source code for generated Bucket mapping: https://github.com/controlplaneio-fluxcd/flux-operator

## Issues Found
1. **Incorrect `FluxInstance.spec.sync` Bucket field semantics.** The original examples used `url: s3://bucket` or `gcs://bucket` and used `ref` as the region or endpoint. Flux Operator maps `sync.url` to the generated Bucket source `spec.endpoint` and `sync.ref` to `spec.bucketName`. Updated all examples and field descriptions accordingly.

2. **AWS examples omitted provider and region handling.** Flux source-controller Bucket resources use `provider: aws`, `endpoint: s3.amazonaws.com`, `bucketName`, and `region` for AWS S3. `FluxInstance.sync` has no first-class `region` field, so the examples now patch the generated Bucket source with `/spec/region`.

3. **GCS example omitted the bucket name and used an unsupported `gcs://` endpoint form for FluxInstance sync.** Updated the example to use `provider: gcp`, `url: storage.googleapis.com`, `ref` as the bucket name, and a patch for the generated Bucket `region`.

4. **MinIO example reversed endpoint and bucket fields.** Updated it so `url` contains the MinIO endpoint and `ref` contains the bucket name.

5. **Azure coverage was implied but not actually shown.** The article had no Azure configuration section and the generic pattern described was not sufficient for Azure-specific credentials. Narrowed the scope statements and conclusion to S3-compatible storage, AWS S3, and GCS.

## Review Notes
The generated Bucket and Kustomization names default to the FluxInstance namespace name when `spec.sync.name` is not set, so the verification command targeting `bucket flux-system` is consistent with the examples. The corrected YAML snippets were parsed successfully.
