# Validation Summary: How to Use Dapr with Amazon MSK (Managed Kafka)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pub/sub building block, Kafka component)
- Amazon MSK (Managed Streaming for Apache Kafka)
- Apache Kafka
- AWS IAM (authentication and authorization)
- AWS CLI (`aws kafka`, `aws iam`)
- Python (requests, Flask)

## Sources Consulted
- Dapr Kafka pub/sub component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/
- Dapr pub/sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr subscription methods: https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/
- AWS MSK port information: https://docs.aws.amazon.com/msk/latest/developerguide/port-info.html
- AWS MSK IAM access control: https://docs.aws.amazon.com/msk/latest/developerguide/iam-access-control.html
- AWS MSK IAM policy examples: https://docs.aws.amazon.com/msk/latest/developerguide/create-iam-access-control-policies.html
- AWS CLI `kafka create-cluster` reference: https://docs.aws.amazon.com/cli/latest/reference/kafka/create-cluster.html

## Issues Found

1. **Broker port incorrect for IAM auth (line 54):** The bootstrap broker URLs used port 9094 (TLS), but MSK IAM authentication requires port 9098. Port 9094 is for TLS-only connections, while 9098 is specifically for IAM-authenticated connections. Changed from `:9094` to `:9098`.

2. **Wrong `authType` value (line 58):** The Dapr Kafka component uses `authType: "awsiam"` for AWS IAM authentication, not `"iam"`. The valid values are: `none`, `password`, `certificate`, `mtls`, `oidc`, `awsiam`. Changed from `"iam"` to `"awsiam"`.

3. **Deprecated `awsRegion` field (line 59):** The `awsRegion` metadata field is deprecated as of Dapr 1.17. The current field name is `region`. Changed from `awsRegion` to `region`.

4. **Incorrect IAM authentication description (line 69):** The post stated "MSK supports IAM authentication (SASL/SCRAM-SHA-512)" which conflates two entirely different authentication mechanisms. IAM authentication uses the `AWS_MSK_IAM` SASL mechanism (port 9098), while SASL/SCRAM-SHA-512 is a separate username/password-based mechanism (port 9096). Corrected to reference the `AWS_MSK_IAM` SASL mechanism.

5. **Missing consumer group IAM actions (lines 86-91):** The IAM policy was missing `kafka-cluster:AlterGroup` and `kafka-cluster:DescribeGroup` actions, which are required for consumer group operations (subscribing). Also missing the group-level resource ARN (`arn:aws:kafka:...:group/dapr-events/*`). Without these, the Dapr subscriber would fail with authorization errors. Added both actions and the group resource ARN.

6. **Partition key passed incorrectly (lines 158-165):** The post passed the Kafka partition key as an HTTP header (`"partitionKey": "cust-456"`), but Dapr requires partition keys to be passed as URL query parameters using the `metadata.` prefix: `?metadata.partitionKey=cust-456`. HTTP headers are not how Dapr routes metadata to component-specific features. Rewrote the request to use the correct query parameter syntax.

## Review Notes
- The `aws kafka create-cluster` command syntax and parameters are correct. Kafka version 3.5.1 is valid for MSK.
- The Python publish and subscribe code patterns are correct (Dapr HTTP API, Flask subscriber with `/dapr/subscribe` endpoint).
- The subscriber returns `{"status": "SUCCESS"}` which is the correct Dapr response to acknowledge message processing.
- The `initialOffset: oldest` and `maxMessageBytes: "1048576"` settings are valid Kafka component metadata fields.
