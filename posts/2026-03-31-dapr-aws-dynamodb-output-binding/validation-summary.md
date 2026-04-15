# Validation Summary: How to Use Dapr AWS DynamoDB Output Binding

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (output bindings)
- AWS DynamoDB
- Dapr JavaScript SDK (`@dapr/dapr`)
- LocalStack (local DynamoDB emulation)
- AWS CLI (DynamoDB table creation)
- Docker (LocalStack container)

## Sources Consulted
- Dapr DynamoDB binding component reference: https://docs.dapr.io/reference/components-reference/supported-bindings/dynamodb/
- Dapr components-contrib DynamoDB binding source code: https://github.com/dapr/components-contrib/blob/master/bindings/aws/dynamodb/dynamodb.go
- Dapr JavaScript SDK client documentation: https://docs.dapr.io/developing-applications/sdks/js/js-client/
- Dapr component secrets reference: https://docs.dapr.io/operations/components/component-secrets/
- Dapr bindings API reference: https://docs.dapr.io/reference/api/bindings_api/

## Issues Found

### 1. "Using Conditional Writes" section was entirely incorrect (removed)
- **What was wrong:** The post included a full section claiming the DynamoDB binding supports conditional expressions via request metadata (`condition-expression`, `expression-attribute-names`, `expression-attribute-values`). This is false — the Dapr DynamoDB binding's `Invoke` method ignores request metadata entirely and performs an unconditional `PutItem` call. Verified by reading the Go source code in components-contrib, which shows the `PutItem` call has no `ConditionExpression` parameter.
- **What was changed:** Removed the entire "Using Conditional Writes" section.
- **Why:** Presenting unsupported functionality as a working feature would mislead readers into writing code that silently ignores the conditional logic, creating a false sense of data safety.

### 2. `ConditionalCheckFailedException` error handling was incorrect (removed)
- **What was wrong:** The error handling section included a branch for `ConditionalCheckFailedException`, which is only relevant when using conditional writes — a feature the binding does not support.
- **What was changed:** Removed the `ConditionalCheckFailedException` branch from the error handling example.
- **Why:** Since conditional writes are not supported, this error would never occur through the binding, and including it reinforced the incorrect claim from the removed section.

## Review Notes
- The component YAML, metadata field names (`table`, `region`, `accessKey`, `secretKey`, `endpoint`), component type (`bindings.aws.dynamodb`), and the `create` operation are all correct per official Dapr docs.
- The `secretKeyRef` usage is valid for Kubernetes deployments with the default Kubernetes secret store. The post could mention that an `auth.secretStore` field may be needed for non-Kubernetes secret stores, but this omission is acceptable for a tutorial scoped to common deployments.
- The JS SDK `client.binding.send(bindingName, operation, data)` 3-parameter signature is correct per official SDK documentation.
- The LocalStack setup and AWS CLI commands are correct.
- The `DaprClient` constructor with no arguments is correct (uses default localhost:3500).
