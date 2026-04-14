# Validation Summary: How to Configure Dapr with GCP Firestore State Store

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (runtime and CLI)
- Google Cloud Firestore (Native mode)
- Google Cloud Platform (GCP) IAM
- Kubernetes (secrets, component deployment)
- GKE Workload Identity
- gcloud CLI
- Dapr JavaScript SDK (`@dapr/dapr`)

## Sources Consulted
- Dapr GCP Firestore state store component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-firestore/
- Dapr supported state stores list: https://docs.dapr.io/reference/components-reference/supported-state-stores/
- Dapr JavaScript SDK state management API documentation
- GCP Firestore IAM roles documentation

## Issues Found
1. **Incorrect metadata field name `collection` changed to `entity_kind`**: The Dapr GCP Firestore state store component uses the metadata field `entity_kind` (not `collection`) to specify the Firestore entity name. The value `"DaprState"` was correct and is in fact the default. Changed `collection` to `entity_kind` in the YAML component configuration.

## Review Notes
- The `entity_kind` field defaults to `"DaprState"` if omitted, so specifying it explicitly is optional but good for clarity.
- The IAM role `roles/datastore.user` is appropriate since Firestore uses the Cloud Datastore API under the hood.
- The component type `state.gcp.firestore`, version `v1`, and all authentication metadata fields (`type`, `project_id`, `private_key_id`, `private_key`, `client_email`, `client_id`) are correct per official Dapr documentation.
- The JavaScript SDK usage (`client.state.save` and `client.state.get`) is syntactically correct and follows current API patterns.
- The Workload Identity binding command is correct for GKE deployments.
- The `gcloud firestore databases create` command with `--type=firestore-native` is valid.
