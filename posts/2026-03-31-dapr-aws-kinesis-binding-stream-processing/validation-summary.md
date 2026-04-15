# Validation Summary: How to Use Dapr AWS Kinesis Binding for Stream Processing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- AWS Kinesis Data Streams
- Dapr AWS Kinesis binding (`bindings.aws.kinesis`)
- Node.js with `@dapr/dapr` SDK
- Express.js
- AWS CLI

## Sources Consulted
- Dapr official documentation for the AWS Kinesis binding component (https://docs.dapr.io/reference/components-reference/supported-bindings/kinesis/)
- Dapr components-contrib source code for the Kinesis binding (https://github.com/dapr/components-contrib/tree/master/bindings/aws/kinesis)
- Dapr components-contrib Kinesis metadata.yaml specification
- AWS CLI documentation for `aws kinesis` commands (https://docs.aws.amazon.com/cli/latest/reference/kinesis/)

## Issues Found

### Issue 1: Incorrect `mode` value `basic` (should be `shared`)
- **What was wrong:** The post listed the consumption mode values as `basic` and `extended`. The correct values are `shared` and `extended`, as confirmed by the Dapr source code (`SharedThroughput = "shared"`) and the metadata.yaml (`allowedValues: ["shared", "extended"]`).
- **Additional inaccuracy:** The description of the `basic` mode as "uses GetRecords polling" was misleading. The `shared` mode actually uses the Kinesis Client Library (KCL) via `vmware-go-kcl-v2`, which handles shard leasing and checkpointing via DynamoDB — not simple GetRecords polling.
- **What was changed:** Replaced `basic` with `shared` and updated the description to accurately reflect KCL-based consumption with DynamoDB checkpointing.

### Issue 2: Fabricated `x-kinesis-*` headers in input binding handler
- **What was wrong:** The consumer code example referenced custom headers `x-kinesis-sequence-number`, `x-kinesis-shard-id`, and `x-kinesis-partition-key`. These headers do not exist. The Dapr Kinesis binding's `ReadResponse` only includes the raw record `Data` with no metadata — confirmed by reviewing both the shared (KCL) and extended (Fan-Out) code paths in the source code.
- **What was changed:** Removed the fabricated header references and replaced with a simple `console.log` of the record body.

## Review Notes
- The YAML component configuration correctly uses `secretKeyRef` for AWS credentials, which is the recommended approach.
- The `@dapr/dapr` SDK usage with `client.binding.send()` and the four-argument signature (binding name, operation, data, metadata) is correct for the current JavaScript SDK.
- The AWS CLI commands (`create-stream`, `describe-stream-summary`, `list-shards`) are all valid and use correct flags.
- The partitioning strategy advice is sound — grouping by entity ID for ordering guarantees is a well-established Kinesis pattern.
- The default mode is `shared` (not `extended`), so the component YAML example intentionally overrides to `extended` mode, which is a valid configuration choice.
