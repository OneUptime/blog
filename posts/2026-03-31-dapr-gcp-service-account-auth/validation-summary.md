# Validation Summary: How to Configure GCP Service Account Authentication for Dapr

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (component configuration, secret references, auth metadata)
- Google Cloud Platform (IAM, service accounts, Workload Identity)
- Google Kubernetes Engine (GKE Workload Identity Federation)
- Kubernetes (secrets, service accounts, annotations)
- gcloud CLI
- kubectl CLI

## Sources Consulted
- Dapr GCP Pub/Sub component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-gcp-pubsub/
- Dapr component secrets documentation: https://docs.dapr.io/operations/components/component-secrets/
- Dapr GCP Firestore state store reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-firestore/
- Dapr GCP Secret Manager reference: https://docs.dapr.io/reference/components-reference/supported-secret-stores/gcp-secret-manager/
- GCP Workload Identity Federation for GKE: https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- gcloud iam service-accounts CLI reference: https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts
- GCP IAM roles reference: https://cloud.google.com/iam/docs/understanding-roles

## Issues Found
1. **Method 2 - Incorrect metadata field name**: The Dapr component YAML in Method 2 used `privateKeyId` as the metadata field name with a `secretKeyRef` pointing to the entire JSON credentials file. The `privateKeyId` field expects only the private key ID string (a short hex identifier from the service account JSON), not the full credentials JSON. Changed `privateKeyId` to `credentialsJson`, which is the correct Dapr metadata field for passing the entire service account JSON credentials. This is consistent with how Method 3 in the same post correctly uses `credentialsJson`.

## Review Notes
- Method 2's component YAML omits the `auth.secretStore` field, which defaults to the Kubernetes secret store when running on Kubernetes. While technically correct due to the default behavior, adding `auth: secretStore: kubernetes` (as shown in Method 3) would improve clarity and consistency across examples.
- Google recommends Workload Identity Federation for GKE over service account keys. The post correctly highlights this in the summary but could note that Google has begun recommending against creating user-managed service account keys entirely.
- The `roles/storage.objectAdmin` role in the permissions matrix grants broad object-level access; `roles/storage.objectCreator` may suffice for write-only binding use cases, but objectAdmin is a reasonable default for a general guide.
