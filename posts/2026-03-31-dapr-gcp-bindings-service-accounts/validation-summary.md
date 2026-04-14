# Validation Summary: How to Use Dapr GCP Bindings with Service Accounts

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud Platform (GCP) IAM and Service Accounts
- Dapr (Distributed Application Runtime) bindings
- GCP Cloud Storage bucket IAM policies
- GCP Pub/Sub topic and subscription IAM policies
- Kubernetes secrets management
- GCP Cloud Audit Logs
- gcloud CLI (iam, storage, pubsub, logging subcommands)
- kubectl CLI
- jq (JSON processor)

## Sources Consulted
- GCP `gcloud iam service-accounts create` documentation: https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts/create
- GCP `gcloud iam service-accounts keys` documentation: https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts/keys
- GCP `gcloud storage buckets add-iam-policy-binding` documentation: https://cloud.google.com/sdk/gcloud/reference/storage/buckets/add-iam-policy-binding
- GCP `gcloud pubsub topics add-iam-policy-binding` documentation: https://cloud.google.com/sdk/gcloud/reference/pubsub/topics/add-iam-policy-binding
- GCP `gcloud pubsub subscriptions add-iam-policy-binding` documentation: https://cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/add-iam-policy-binding
- GCP predefined IAM roles for Cloud Storage: https://cloud.google.com/storage/docs/access-control/iam-roles
- GCP predefined IAM roles for Pub/Sub: https://cloud.google.com/pubsub/docs/access-control
- GCP service account key rotation best practices: https://cloud.google.com/iam/docs/best-practices-for-managing-service-account-keys
- GCP Cloud Audit Logs documentation: https://cloud.google.com/logging/docs/audit
- Dapr GCP Storage Bucket binding component spec: https://docs.dapr.io/reference/components-reference/supported-bindings/gcpbucket/
- Dapr component secrets reference: https://docs.dapr.io/operations/components/component-secrets/
- Kubernetes secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Existing blog posts in the repository for pattern consistency (dapr-gcp-storage-bucket-output-binding, dapr-gcp-authentication-bindings)

## Issues Found
No technical issues found.

## Review Notes
- All `gcloud` commands use correct syntax and valid flags for current CLI versions.
- The `gcloud storage buckets add-iam-policy-binding` command correctly uses the modern `gcloud storage` command group rather than the deprecated `gsutil` tool.
- IAM roles used (`roles/storage.objectViewer`, `roles/storage.objectCreator`, `roles/pubsub.publisher`, `roles/pubsub.subscriber`) are all valid predefined GCP IAM roles appropriate for least-privilege access.
- The Dapr component type `bindings.gcp.bucket` with version `v1` is correct and matches established patterns in other blog posts in this repository.
- The `secretKeyRef` format in the Dapr component YAML is the correct syntax for referencing Kubernetes secrets in Dapr component metadata.
- The `--dry-run=client -o yaml | kubectl apply -f -` pattern for updating existing Kubernetes secrets is a well-known and correct approach.
- The 90-day key rotation recommendation aligns with GCP's official best practices documentation.
- The summary's mention of GKE Workload Identity as a preferred alternative to key-based authentication is a valuable best practice callout, though it is not elaborated in the post itself. This could be expanded in a future post.
- The `auth_uri` and `token_uri` values in the Dapr component configuration are the correct Google OAuth2 endpoints.
- The post does not include `auth_provider_x509_cert_url` or `client_x509_cert_url` metadata fields from the service account key JSON; these are typically optional for Dapr GCP authentication and their omission is acceptable.
