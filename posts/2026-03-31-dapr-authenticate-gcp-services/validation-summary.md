# Validation Summary: How to Authenticate Dapr with GCP Services

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Dapr (sidecar-based microservices runtime)
- Google Cloud Platform (GCP)
- Google Kubernetes Engine (GKE)
- GKE Workload Identity
- GCP IAM Service Accounts
- GCP Pub/Sub
- GCP Secret Manager
- Kubernetes Secrets
- Application Default Credentials (ADC)
- gcloud CLI
- kubectl

## Sources Consulted
- Dapr GCP Pub/Sub component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-gcp-pubsub/
- Dapr GCP Secret Manager component reference: https://docs.dapr.io/reference/components-reference/supported-secret-stores/gcp-secret-manager/
- Dapr Secrets API reference: https://docs.dapr.io/reference/api/secrets_api/
- Dapr Pub/Sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr component secrets (secretKeyRef) documentation: https://docs.dapr.io/operations/components/component-secrets/
- Dapr builtin authentication profiles (source): https://github.com/dapr/components-contrib/blob/main/.build-tools/builtin-authentication-profiles.yaml
- GKE Workload Identity documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- GCP IAM service account keys documentation: https://docs.cloud.google.com/iam/docs/keys-create-delete
- gcloud iam service-accounts keys create reference: https://docs.cloud.google.com/sdk/gcloud/reference/iam/service-accounts/keys/create

## Issues Found

### Issue 1: Invalid `credentialsJson` metadata field in Method 2 Dapr component YAML
- **What was wrong:** The Dapr component YAML for Method 2 (Service Account Key File) used a metadata field named `credentialsJson` to pass GCP credentials via `secretKeyRef`. This field does not exist in any Dapr GCP component. Dapr GCP components require credentials to be provided as individual metadata fields (`privateKeyId`, `clientEmail`, `privateKey`, etc.), not as a single consolidated JSON blob.
- **What was changed:** Replaced the single `credentialsJson` secretKeyRef with individual metadata fields (`type`, `privateKeyId`, `clientEmail`, `privateKey`), each referencing a separate key in the Kubernetes secret. Also updated the Kubernetes secret creation command to store individual credential fields extracted from the service account JSON using `jq`, and renamed the secret from `gcp-key` to `gcp-credentials` for clarity.
- **Why:** The Dapr GCP authentication mechanism collects individual metadata fields and reassembles them into a JSON structure internally (confirmed via source code in `state/gcp/firestore/firestore.go`). There is no single field that accepts the full service account JSON string.

## Review Notes
- All `gcloud` CLI commands (Workload Identity setup, IAM bindings, service account key creation) were verified as correct against official Google Cloud documentation.
- The `kubectl annotate` command for Workload Identity uses the correct annotation key `iam.gke.io/gcp-service-account`. The command omits the `--namespace` flag (defaults to current context namespace), which is acceptable but less explicit than the official GCP docs which include it.
- The blog uses `--region` instead of `--location` for the cluster update command. Both are valid; `--location` is the more general form in current GCP documentation.
- Dapr API endpoints (`/v1.0/secrets/...` and `/v1.0/publish/...`) are correct.
- Component type names (`pubsub.gcp.pubsub` and `secretstores.gcp.secretmanager`) are correct.
- The `secretKeyRef` YAML structure for referencing Kubernetes secrets in Dapr component metadata is correct.
- The Method 3 (ADC) approach correctly shows that only `projectId` is needed when using Application Default Credentials.
- The fix introduces `jq` as a dependency for extracting individual fields from the service account JSON. This is a commonly available tool but was not in the original prerequisites.
