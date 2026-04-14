# Validation Summary: How to Configure Dapr with GCP Pub/Sub

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (pub/sub building block, declarative subscriptions)
- Google Cloud Pub/Sub
- Google Cloud CLI (`gcloud`)
- GKE Workload Identity
- Kubernetes (secrets, service accounts)
- Python / Flask (subscriber example)

## Sources Consulted
- [Dapr GCP Pub/Sub component reference](https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-gcp-pubsub/)
- [Dapr GCP Pub/Sub component metadata.yaml (source)](https://github.com/dapr/components-contrib/blob/main/pubsub/gcp/pubsub/metadata.yaml)
- [Dapr components-contrib builtin-authentication-profiles.yaml (source)](https://github.com/dapr/components-contrib/blob/main/.build-tools/builtin-authentication-profiles.yaml)
- [Dapr Pub/Sub API reference](https://docs.dapr.io/reference/api/pubsub_api/)
- [Diagrid GCP Pub/Sub component docs](https://docs.diagrid.io/catalyst/references/components-reference/pubsub/gcp.pubsub/)

## Issues Found
1. **Invalid `credentialsJson` metadata field**: The component YAML used `credentialsJson` with a `secretKeyRef` to pass the entire service account key JSON as a single field. This field does not exist in the Dapr GCP Pub/Sub component. The GCP built-in authentication profile requires individual fields (`type`, `projectId`, `privateKeyId`, `clientEmail`, `clientId`, `authUri`, `tokenUri`, `authProviderX509CertUrl`, `clientX509CertUrl`, `privateKey`). **Fix**: Replaced `credentialsJson` with the individual credential fields per the official Dapr documentation, using `secretKeyRef` for `privateKey` (the sensitive value) and direct values for the other fields.

2. **Secret creation command mismatch**: The `kubectl create secret` command stored the entire SA key JSON file (`--from-file=sa-key.json`), which was designed to work with the invalid `credentialsJson` approach. **Fix**: Updated to `--from-literal=private-key="$(jq -r '.private_key' sa-key.json)"` to extract and store only the private key, matching the corrected component YAML that references the `private-key` key via `secretKeyRef`.

## Review Notes
- The `maxConcurrentConnections`, `maxOutstandingMessages`, and `maxOutstandingBytes` metadata fields were verified as valid against the component's metadata.yaml in the dapr/components-contrib repository.
- All `gcloud` CLI commands (enable API, create topic, create service account, IAM binding, key creation) are syntactically correct.
- The GKE Workload Identity setup commands are correct, though the post omits the node pool update step (`gcloud container node-pools update --workload-metadata=GKE_METADATA`), which is acceptable since the post focuses on Dapr configuration rather than being a comprehensive GKE Workload Identity guide.
- The Dapr publish API URL (`/v1.0/publish/gcp-pubsub/order-events`) is correct.
- The Python Flask subscriber correctly accesses CloudEvents `data` field and returns HTTP 200 for acknowledgment.
- The declarative Subscription YAML uses the correct `v1alpha1` API version and field names.
