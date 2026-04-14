# Validation Summary: How to Set Up Dapr Pub/Sub with Google Cloud Pub/Sub

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pub/sub building block)
- Google Cloud Pub/Sub
- GKE Workload Identity
- Python / Flask (subscriber app)
- Kubernetes (secrets, service accounts)
- gcloud CLI

## Sources Consulted
- Dapr GCP Pub/Sub component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-gcp-pubsub/
- Dapr Pub/Sub API reference: https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-publish-subscribe/
- Dapr Subscription methods: https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/
- Google Cloud IAM service account documentation
- Google Cloud Pub/Sub gcloud CLI reference

## Issues Found

1. **Incorrect metadata field name `maxConcurrentHandlers`**: The Advanced Component Options section used `maxConcurrentHandlers`, which is not a valid Dapr GCP Pub/Sub metadata field. The correct field name is `maxConcurrentConnections`. Fixed to `maxConcurrentConnections`.

2. **Kubernetes secret creation mismatch**: The `kubectl create secret` command used `--from-file=gcp-key.json=./gcp-key.json`, which creates a secret with a single key `gcp-key.json` containing the entire file. However, the component YAML references individual keys (`privateKeyId`, `privateKey`, `clientId`) via `secretKeyRef`. These keys would not exist in the secret as created. Fixed the command to extract individual fields from the JSON file using `jq` and `--from-literal` flags.

3. **Mermaid diagram inconsistency**: The flow diagram showed `POST /handle-event` for the subscriber callback, but the actual subscriber code and subscription configuration both use `/handle-order`. Fixed to `POST /handle-order` for consistency.

## Review Notes
- The `type` metadata field is marked as deprecated in the Dapr docs (only `service_account` is supported). It still works but may be removed in a future Dapr version. The blog uses it in both the service account key and Workload Identity configurations.
- The declarative Subscription YAML uses `apiVersion: dapr.io/v1alpha1`, which is the older format. The current recommended version is `dapr.io/v2alpha1` with `routes` (plural) instead of `route` (singular). The v1alpha1 format is still functional.
- The Workload Identity component configuration includes `type` and `clientEmail` fields. For pure Workload Identity / Application Default Credentials, typically only `projectId` is required. The extra fields are not harmful but may be unnecessary.
