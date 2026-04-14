# Validation Summary: How to Configure GCP Pub/Sub for Dapr Messaging

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Pub/Sub
- Dapr (Distributed Application Runtime)
- Dapr Go SDK (`github.com/dapr/go-sdk/client`)
- GKE Workload Identity
- Kubernetes secrets
- gcloud CLI

## Sources Consulted
- Dapr GCP Pub/Sub component specification: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-gcp-pubsub/
- Dapr Go SDK client package: https://pkg.go.dev/github.com/dapr/go-sdk/client
- Google Cloud Pub/Sub dead-letter topics documentation: https://cloud.google.com/pubsub/docs/dead-letter-topics
- Google Cloud gcloud pubsub CLI reference: https://cloud.google.com/sdk/gcloud/reference/pubsub
- Kubernetes secret creation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- GKE Workload Identity documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity

## Issues Found

### 1. Dead-letter topic referenced before creation
- **What was wrong:** The `gcloud pubsub subscriptions create` command used `--dead-letter-topic=orders-dlq` before the `orders-dlq` topic was created. GCP Pub/Sub requires the dead-letter topic to already exist when it is referenced in a subscription.
- **What was changed:** Moved the dead-letter topic and subscription creation commands (`gcloud pubsub topics create orders-dlq` and its subscription) before the `orders-processor` subscription that references it.
- **Why:** The `--dead-letter-topic` flag requires the target topic to exist; the command would fail otherwise.

### 2. Kubernetes secret keys did not match Dapr secretKeyRef
- **What was wrong:** The secret was created with `kubectl create secret generic gcp-sa-key --from-file=key.json=/tmp/sa-key.json`, which produces a secret with a single key `key.json` containing the entire JSON file. However, the Dapr component configuration referenced `secretKeyRef` with keys `private_key_id` and `private_key`, which do not exist as separate keys in the secret.
- **What was changed:** Updated the `kubectl create secret` command to use `--from-literal` with `jq` to extract `private_key_id` and `private_key` as individual keys, matching what the Dapr component's `secretKeyRef` expects.
- **Why:** `secretKeyRef` looks up specific keys within a Kubernetes secret. When a secret is created with `--from-file`, the key name is the filename (e.g., `key.json`), not the individual JSON fields within the file.

## Review Notes
- The Dapr GCP Pub/Sub component metadata fields for GCP credentials (`project_id`, `private_key_id`, `private_key`, `client_email`) use the snake_case format matching the GCP service account JSON key file. The Dapr documentation may show camelCase alternatives (`projectId`, `privateKeyId`, etc.) which are also accepted as aliases. Both formats should work.
- The Go code correctly uses `dapr.PublishEventWithMetadata` to pass the `orderingKey` metadata for GCP Pub/Sub message ordering, which requires `enableMessageOrdering` to be set to `"true"` on the component (which it is).
- The Workload Identity setup commands are correct and follow the standard GKE configuration pattern.
- The `roles/pubsub.editor` IAM role grants both publish and subscribe permissions, which is appropriate for a Dapr sidecar that needs to both publish and subscribe.
