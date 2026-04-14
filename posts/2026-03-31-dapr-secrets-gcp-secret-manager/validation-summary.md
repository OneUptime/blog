# Validation Summary: How to Configure Dapr with GCP Secret Manager

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (secret store component)
- Google Cloud Secret Manager
- Google Kubernetes Engine (GKE)
- GKE Workload Identity
- gcloud CLI
- kubectl

## Sources Consulted
- Dapr GCP Secret Manager component reference: https://docs.dapr.io/reference/components-reference/supported-secret-stores/gcp-secret-manager/
- Dapr Secrets API reference: https://docs.dapr.io/reference/api/secrets_api/
- Dapr component secrets reference: https://docs.dapr.io/operations/components/component-secrets/
- Google Cloud Secret Manager documentation: https://cloud.google.com/secret-manager/docs
- Google Cloud Workload Identity documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity

## Issues Found

1. **Missing `gcloud secrets create` for stripe-api-key**: The post ran `gcloud secrets versions add stripe-api-key` without first creating the secret with `gcloud secrets create`. Added the missing create command.

2. **Incorrect metadata field name `project`**: The Dapr GCP Secret Manager component uses `project_id`, not `project`. Changed in both the Workload Identity component YAML and the service account key YAML. (Dapr docs: https://docs.dapr.io/reference/components-reference/supported-secret-stores/gcp-secret-manager/)

3. **Incorrect metadata field names using camelCase instead of snake_case**: The service account key metadata fields were written in camelCase (`privateKeyID`, `privateKey`, `clientEmail`) but the Dapr GCP Secret Manager component uses snake_case (`private_key_id`, `private_key`, `client_email`). Fixed all three fields.

4. **Incorrect version query parameter**: The post used `?metadata.version=2` but the correct Dapr query parameter for GCP Secret Manager is `?metadata.version_id=2`. Fixed the curl example.

## Review Notes
- The gcloud commands use `--replication-policy=automatic` which is correct and current.
- The Workload Identity setup steps (creating a GCP SA, granting roles, binding to K8s SA, annotating) are accurate and follow Google's recommended approach.
- The Dapr secrets API endpoint format `/v1.0/secrets/{store}/{key}` is correct.
- The `secretKeyRef` pattern used for the private key in the non-GKE config is a valid Dapr pattern for referencing secrets in component metadata.
