# Validation Summary: How to Use Dapr with GCP Firestore

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (state management API)
- Google Cloud Firestore (Datastore mode)
- GCP gcloud CLI
- Dapr Python SDK
- curl / HTTP API

## Sources Consulted
- Dapr GCP Firestore (Datastore mode) state store docs: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-firestore/
- Dapr supported state stores feature table: https://docs.dapr.io/reference/components-reference/supported-state-stores/
- Dapr state management API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr Python SDK source (grpc client and state options): https://github.com/dapr/python-sdk
- Google Cloud Firestore database management docs: https://cloud.google.com/firestore/docs/manage-databases
- gcloud firestore databases create reference: https://cloud.google.com/sdk/gcloud/reference/firestore/databases/create

## Issues Found

### 1. Firestore mode confusion (critical)
**What was wrong:** The post created a Firestore database in Native mode (`--type=firestore-native`) but the Dapr component `state.gcp.firestore` is specifically for Firestore in **Datastore mode**. These are incompatible modes — the component uses Datastore concepts like entity kinds, not Firestore Native concepts like collections/documents.
**What was changed:** Changed the gcloud command to `--type=datastore-mode`, updated the overview and prerequisites to reference Datastore mode instead of Native mode.

### 2. Wrong metadata field names (critical)
**What was wrong:** The component YAML used `projectId` (camelCase) instead of the correct `project_id` (snake_case), and `entityKind` instead of `entity_kind`. Also included a `collection` field that does not exist in this component's spec.
**What was changed:** Fixed `projectId` to `project_id`, fixed `entityKind` to `entity_kind`, removed the invalid `collection` field entirely.

### 3. Wrong bulk save endpoint (moderate)
**What was wrong:** The post used `POST /v1.0/state/statestore/bulk` for bulk save. There is no `/bulk` endpoint for saving state — the regular `POST /v1.0/state/{storeName}` endpoint already accepts a JSON array of key-value pairs, making it inherently a bulk operation.
**What was changed:** Changed the bulk save URL to `POST /v1.0/state/statestore` (without `/bulk`) and added a clarifying comment.

### 4. Transactions not supported (critical)
**What was wrong:** The post included an entire section on state transactions with Firestore, but according to the official Dapr state store feature table, the GCP Firestore component does **not** support transactions.
**What was changed:** Removed the transactions section entirely and updated the summary to not claim transaction support.

### 5. ETags/optimistic concurrency not supported (critical)
**What was wrong:** The post included a section on optimistic concurrency with ETags, but the GCP Firestore state store component does not support ETags. Additionally, the Python SDK code used an incorrect API: `options={"concurrency": "first-write"}` should have been `options=StateOptions(concurrency=Concurrency.first_write)` if the feature were supported.
**What was changed:** Removed the entire optimistic concurrency section since the feature is not supported by this component.

### 6. Summary inaccuracies (moderate)
**What was wrong:** The summary claimed "Transactions, bulk operations, and ETag-based concurrency control are all supported" — two of those three features are not supported.
**What was changed:** Updated the summary to accurately state that CRUD and bulk operations are supported.

## Review Notes
- The Dapr GCP Firestore component supports only CRUD operations. It does not support transactions, ETags, actors, or TTL. If these features are needed, consider a different state store backend (e.g., Redis, PostgreSQL, or CosmosDB).
- The `entity_kind` metadata field defaults to `"DaprState"` so it is optional in the component configuration.
- The component also accepts authentication metadata fields (`private_key_id`, `private_key`, `client_email`, etc.) for service account authentication as an alternative to Workload Identity/ADC, which the post does not cover but may be worth mentioning in a future update.
