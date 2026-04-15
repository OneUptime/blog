# Validation Summary: How to Use Dapr Component Auth Profiles

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Component YAML specifications
- Dapr secret store references (`auth.secretStore`)
- Redis state store (`state.redis`)
- Azure Service Bus Topics (`pubsub.azure.servicebus.topics`) with Entra ID / Managed Identity
- AWS SNS/SQS (`pubsub.aws.snssqs`) with IAM and IRSA
- GCP Pub/Sub (`pubsub.gcp.pubsub`) with service account credentials
- Kubernetes secrets (`kubectl create secret`)

## Sources Consulted
- Dapr Component spec schema: https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr secret references in components: https://docs.dapr.io/operations/components/component-secrets/
- Dapr Redis state store reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr Azure Service Bus Topics reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-azure-servicebus-topics/
- Dapr AWS SNS/SQS reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-aws-snssqs/
- Dapr GCP Pub/Sub reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-gcp-pubsub/
- Dapr AWS authentication: https://docs.dapr.io/developing-applications/integrations/aws/authenticating-aws/

## Issues Found
- **GCP secret creation command used `--from-file` instead of `--from-literal` for individual fields.** The component YAML references individual secret keys (`private_key_id`, `private_key`, `client_email`) via `secretKeyRef`, but the original `kubectl create secret generic --from-file=./sa-key.json` command creates a single key named `sa-key.json` containing the entire file. This mismatch would cause the component to fail at runtime because the referenced keys would not exist in the secret. Fixed by extracting individual fields from the JSON file using `jq` and creating them as separate `--from-literal` entries.

## Review Notes
- All component type names (`state.redis`, `pubsub.azure.servicebus.topics`, `pubsub.aws.snssqs`, `pubsub.gcp.pubsub`) are correct per official Dapr documentation.
- All metadata field names for each component are accurate and match the official component reference docs.
- The `auth.secretStore` block is correctly placed at the top level of the component YAML (sibling to `spec`), which is the documented structure.
- The `secretKeyRef` structure with `name` and `key` fields is correct.
- The Azure managed identity example correctly uses `azureClientId` without an `auth.secretStore` block, since no secrets are needed.
- The IRSA claim for AWS is accurate: omitting `accessKey`/`secretKey` allows the AWS SDK to use the pod's IAM role via IRSA on EKS.
- The AWS secret creation command uses `-n production` but the AWS component YAML does not specify a namespace. This is a minor inconsistency but not an error, as namespace placement depends on deployment strategy.
