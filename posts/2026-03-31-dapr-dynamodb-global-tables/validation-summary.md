# Validation Summary: How to Use DynamoDB Global Tables with Dapr State Store

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (state store component)
- AWS DynamoDB (Global Tables v2)
- AWS CLI
- AWS IAM (IRSA - IAM Roles for Service Accounts)
- Dapr Python SDK
- Kubernetes

## Sources Consulted
- Dapr DynamoDB state store component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-dynamodb/
- Dapr Python SDK documentation: https://docs.dapr.io/developing-applications/sdks/python/
- Dapr Python SDK source (dapr/clients/grpc/_state.py) for StateOptions and Concurrency enum definitions
- AWS DynamoDB Global Tables documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GlobalTables.html
- AWS IAM ARN format reference: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference-arns.html
- AWS CLI DynamoDB reference: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/

## Issues Found

1. **Incorrect Python SDK imports** — `import dapr.clients as dapr` was used, then `dapr.StateOptions` and `dapr.Concurrency` were referenced. Neither `StateOptions` nor `Concurrency` is exported from `dapr.clients`. Fixed to use `from dapr.clients import DaprClient` and `from dapr.clients.grpc._state import StateOptions, Concurrency`.

2. **Wrong Concurrency enum value casing** — `Concurrency.FirstWrite` (PascalCase) was used, but the Dapr Python SDK defines the enum with snake_case values. Fixed to `Concurrency.first_write`.

3. **Invalid AWS account ID in IRSA ARN** — The example ARN `arn:aws:iam::123456789:role/DaprDynamoDBRole` had a 9-digit account ID. AWS account IDs are always 12 digits. Fixed to `arn:aws:iam::123456789012:role/DaprDynamoDBRole`.

4. **Unnecessary DynamoDB Streams enable step** — The post included an explicit `update-table --stream-specification` step labeled "required for Global Tables." For Global Tables v2 (2019.11.21+), DynamoDB Streams are automatically enabled when replicas are added via `--replica-updates`. Removed the redundant step and added a clarifying comment.

## Review Notes
- The IAM policy lists basic DynamoDB actions (GetItem, PutItem, DeleteItem, UpdateItem, Query, DescribeTable). For Dapr bulk state operations, `BatchWriteItem` and `BatchGetItem` permissions may also be needed. This is not incorrect for basic usage but could be noted for production deployments.
- The `endpoint` metadata field is set to an empty string in the Dapr component YAML. This is unnecessary (omitting it entirely would be cleaner) but not technically wrong.
- The tutorial does not include `aws dynamodb wait table-exists` between table creation and replica addition. In practice, the table must be ACTIVE before replicas can be added. This is a common omission in documentation-style examples.
- The `dapr.clients.grpc._state` import path is technically a private module (underscore prefix), but it is the standard import path used in Dapr Python SDK examples and documentation.
