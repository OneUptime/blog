# Validation Summary: How to Use Dapr with AWS DynamoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (state management building block)
- AWS DynamoDB
- AWS CLI
- Python (requests library)
- YAML (Dapr component configuration)

## Sources Consulted
- Dapr DynamoDB state store component documentation: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-dynamodb/
- Dapr State Management API reference: https://docs.dapr.io/reference/api/state_api/
- AWS CLI DynamoDB create-table reference: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/create-table.html

## Issues Found
1. **Incorrect component type**: The Dapr component `spec.type` was set to `state.dynamodb`. The correct type is `state.aws.dynamodb`. This would cause Dapr to fail to load the component at runtime. Fixed by changing `state.dynamodb` to `state.aws.dynamodb`.
2. **Unused import**: The TTL section included `import time` which was never used in the code block. Removed the unnecessary import.

## Review Notes
- The DynamoDB table creation command correctly uses `key` as the partition key name, which matches the Dapr DynamoDB component's default `partitionKey` value.
- The component configuration correctly uses `secretKeyRef` for AWS credentials rather than hardcoding them, which is a good security practice.
- The ETag-based optimistic concurrency section correctly demonstrates the `first-write` concurrency pattern and the 409 conflict response handling.
- The bulk get endpoint `/v1.0/state/statestore/bulk` is correct for the Dapr state API.
- The TTL configuration with `ttlAttributeName` in the component and `ttlInSeconds` in state metadata is correct. Note that DynamoDB TTL must also be enabled on the table itself via `aws dynamodb update-time-to-live` for the `expiresAt` attribute — the post does not mention this prerequisite.
