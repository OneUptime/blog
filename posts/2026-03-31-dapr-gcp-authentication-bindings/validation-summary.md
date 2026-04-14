# Validation Summary: How to Configure GCP Authentication for Dapr Bindings

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (bindings, component spec, secret references)
- Google Cloud Platform (IAM, service accounts, GKE, Cloud Storage, Pub/Sub)
- GKE Workload Identity
- Application Default Credentials (ADC)
- Kubernetes (secrets, service accounts, annotations)
- gcloud CLI

## Sources Consulted
- Dapr GCP Storage Bucket binding spec: https://docs.dapr.io/reference/components-reference/supported-bindings/gcpbucket/
- Dapr component secrets reference: https://docs.dapr.io/operations/components/component-secrets/
- Google Cloud Workload Identity for GKE: https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Google Cloud Application Default Credentials: https://cloud.google.com/docs/authentication/application-default-credentials
- gcloud CLI reference for `iam service-accounts create`, `projects add-iam-policy-binding`, `container clusters update`, `storage buckets add-iam-policy-binding`, `pubsub topics add-iam-policy-binding`

## Issues Found
1. **Secret name and structure mismatch (kubectl vs component spec)**: The `kubectl create secret` command created a secret named `gcp-sa-key` containing the entire JSON key file as a single key (`key.json`), but the Dapr component spec referenced a secret named `gcp-sa-key-fields` with individual field keys (`privateKeyId`, `privateKey`). Fixed by changing the kubectl command to use `--from-literal` to extract individual fields from the JSON key file with `jq`, and renamed the secret to `gcp-sa-key-fields` to match the component spec references.

## Review Notes
- The "Least Privilege Role Assignments" section uses `roles/storage.objectAdmin`, which grants full object control (including delete and IAM policy management), not just read and write. For true least privilege, `roles/storage.objectUser` or a combination of `roles/storage.objectViewer` and `roles/storage.objectCreator` would be more restrictive. The current role works but is broader than the "read and write only" comment suggests.
- Google is migrating toward a newer `principal://` format for Workload Identity Federation for GKE, but the `serviceAccount:` member format used in the blog remains valid and is still documented.
- The `auth_provider_x509_cert_url` and `client_x509_cert_url` metadata fields are omitted from the service account key component spec, which is fine since they are optional with standard defaults.
