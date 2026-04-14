# Validation Summary: How to Use Dapr with Google Cloud Run

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar runtime)
- Google Cloud Run (multi-container / sidecars)
- Google Cloud Pub/Sub (via Dapr pubsub component)
- Google Cloud Firestore / Datastore (via Dapr state store component)
- Python / Flask
- gcloud CLI
- Knative Serving YAML

## Sources Consulted
- Cloud Run YAML Reference: https://docs.cloud.google.com/run/docs/reference/yaml/v1
- Cloud Run multi-container (sidecar) docs: https://docs.cloud.google.com/run/docs/configuring/services/containers
- Cloud Run volume types (REST API reference): https://docs.cloud.google.com/run/docs/reference/rest/v1/Volume
- Cloud Run migration from Kubernetes: https://docs.cloud.google.com/run/docs/migrate/from-kubernetes
- Dapr GCP Pub/Sub component: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-gcp-pubsub/
- Dapr GCP Firestore state store: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-firestore/
- Dapr State Management API: https://docs.dapr.io/reference/api/state_api/
- Dapr Pub/Sub API: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr CLI reference (daprd args): https://docs.dapr.io/reference/arguments-annotations-overview/
- gcloud run deploy reference: https://cloud.google.com/sdk/gcloud/reference/run/deploy
- gcloud run services replace reference: https://cloud.google.com/sdk/gcloud/reference/run/services/replace

## Issues Found

1. **ConfigMap volume not supported in Cloud Run**: The YAML used `configMap` as a volume source, but Cloud Run does not support Kubernetes ConfigMaps. Changed to `secret` (Secret Manager) volume, which is a supported volume type in Cloud Run.

2. **Incorrect `gcloud run deploy` command for multi-container**: The original command mixed a top-level `--image` flag with `--container` flags, which is invalid syntax. Also included the obsolete `--platform managed` flag. Replaced with the `gcloud run services replace` YAML-based approach, which is the recommended method for multi-container deployments.

3. **`credentialsJson` is not a valid Dapr metadata field**: Both the GCP Pub/Sub and Firestore components listed `credentialsJson` with a `secretKeyRef`, but this field does not exist in Dapr's GCP component specs. Removed credential fields entirely — on Cloud Run, Application Default Credentials (ADC) are used automatically via the attached service account, making explicit credentials unnecessary.

4. **Firestore state store used wrong metadata field names**: `projectId` (camelCase) was changed to `project_id` (snake_case), and `collection` was changed to `entity_kind` to match the actual Dapr Firestore component specification.

5. **Outdated Dapr sidecar image**: `daprio/daprd:1.13.0` is outside the Dapr support window. Updated to `daprio/daprd:1.15.0` (earliest currently supported version).

6. **Deprecated `--components-path` flag**: Changed to `--resources-path`, which is the current non-deprecated equivalent.

## Review Notes
- The Dapr Firestore state store component (`state.gcp.firestore`) operates in Datastore mode, not Firestore Native mode. The post doesn't clarify this distinction, which could cause confusion for users expecting Native mode behavior.
- The `run.googleapis.com/execution-environment: gen2` annotation is optional and not required for multi-container support, though it is valid. When using gen2, at least 512 MiB of memory should be specified (not shown in the YAML).
- The summary mentions Workload Identity for keyless auth, which is the correct approach. The fixes align the component configs with this recommendation by removing explicit credentials.
- Setting `--concurrency 80` in the min/max instance configuration is redundant since 80 is the default Cloud Run concurrency value.
