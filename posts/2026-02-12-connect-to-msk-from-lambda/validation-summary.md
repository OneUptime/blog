# Validation Summary: How to Connect to MSK from Lambda

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Lambda
- Amazon Managed Streaming for Apache Kafka (Amazon MSK)
- Apache Kafka
- AWS CLI
- IAM authentication
- SASL/SCRAM authentication
- Python 3.12
- kafka-python
- aws-msk-iam-sasl-signer

## Sources Consulted
- AWS Lambda Developer Guide: Using Lambda with Amazon MSK - https://docs.aws.amazon.com/lambda/latest/dg/with-msk.html
- AWS Lambda Developer Guide: Creating a Lambda event source mapping for an Amazon MSK event source - https://docs.aws.amazon.com/lambda/latest/dg/msk-esm-create.html
- AWS Lambda Developer Guide: Configuring Amazon MSK cluster authentication methods in Lambda - https://docs.aws.amazon.com/lambda/latest/dg/msk-cluster-auth.html
- AWS Lambda Developer Guide: Configuring your Amazon MSK cluster and Amazon VPC network for Lambda - https://docs.aws.amazon.com/lambda/latest/dg/with-msk-cluster-network.html
- AWS Lambda Developer Guide: Configuring error handling controls for Kafka event sources - https://docs.aws.amazon.com/lambda/latest/dg/kafka-retry-configurations.html
- AWS Lambda Developer Guide: How Lambda processes records from stream and queue-based event sources - https://docs.aws.amazon.com/lambda/latest/dg/invocation-eventsourcemapping.html
- AWS CLI Command Reference: create-event-source-mapping - https://docs.aws.amazon.com/cli/latest/reference/lambda/create-event-source-mapping.html
- AWS CLI Command Reference: update-event-source-mapping - https://docs.aws.amazon.com/cli/latest/reference/lambda/update-event-source-mapping.html
- AWS Lambda Developer Guide: Configuring provisioned concurrency for a function - https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html
- Amazon MSK Developer Guide: Configure clients for IAM access control - https://docs.aws.amazon.com/msk/latest/developerguide/configure-clients-for-iam-access-control.html
- AWS aws-msk-iam-sasl-signer-python repository - https://github.com/aws/aws-msk-iam-sasl-signer-python

## Issues Found
- The post implied an MSK consumer Lambda must be configured in the same VPC as the MSK cluster. Updated the wording to reflect that the MSK event source mapping uses its own Hyperplane ENI and the MSK cluster subnet/security group configuration, while producer Lambdas that open direct Kafka connections do need VPC reachability.
- The security group egress example used an invalid `--destination-group` AWS CLI option. Replaced the ingress and egress examples with valid `--ip-permissions` syntax using `UserIdGroupPairs`.
- The IAM authentication event source mapping example incorrectly used `CLIENT_CERTIFICATE_TLS_AUTH`, which is for mTLS. Updated the IAM example to omit `--source-access-configurations`, matching Lambda's IAM-auth behavior for MSK.
- The MSK Lambda handler decoded Kafka headers as base64 `key`/`value` objects. Updated it to match the AWS event shape, where headers are objects whose values are byte arrays.
- The partial batch response returned a bare offset string. Updated it to return the Kafka partial batch response schema with `itemIdentifier.partition` and `itemIdentifier.offset`.
- The producer example passed an OAuth token provider object that did not inherit from kafka-python's `AbstractTokenProvider`. Added the required import and base class.
- The provisioned concurrency example used `$LATEST`, which Lambda does not support for provisioned concurrency. Changed it to use a function alias.
- The consumer scaling section used `--parallelization-factor`, which is not the appropriate scaling control for MSK event source mappings. Replaced it with `--provisioned-poller-config` and updated the explanation to use Lambda event pollers.
- The monitoring section listed `IteratorAge`, which is not the Lambda lag metric for MSK/Kafka sources. Replaced it with `OffsetLag`.
- The cold start claim gave a fixed 5-10 second VPC penalty. Updated the wording to avoid a stale fixed latency claim.

## Review Notes
The examples still use placeholder ARNs, subnet IDs, security group IDs, and a broad IAM policy for readability. In a production guide, the IAM policy should be scoped to specific cluster, topic, and group resources.
