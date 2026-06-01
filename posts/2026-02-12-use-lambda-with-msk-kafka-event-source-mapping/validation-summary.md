# Validation Summary: How to Use Lambda with MSK (Kafka) Event Source Mapping

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Lambda
- Amazon MSK
- Apache Kafka
- AWS IAM
- Amazon VPC networking
- AWS CLI
- Python

## Sources Consulted
- AWS Lambda Developer Guide: Using Lambda with Amazon MSK - https://docs.aws.amazon.com/lambda/latest/dg/with-msk.html
- AWS Lambda Developer Guide: Configuring Amazon MSK event sources for Lambda - https://docs.aws.amazon.com/lambda/latest/dg/with-msk-configure.html
- AWS Lambda Developer Guide: Creating a Lambda event source mapping for an Amazon MSK event source - https://docs.aws.amazon.com/lambda/latest/dg/msk-esm-create.html
- AWS Lambda Developer Guide: Configuring your Amazon MSK cluster and Amazon VPC network for Lambda - https://docs.aws.amazon.com/lambda/latest/dg/with-msk-cluster-network.html
- AWS Lambda Developer Guide: Configuring Lambda permissions for Amazon MSK event source mappings - https://docs.aws.amazon.com/lambda/latest/dg/with-msk-permissions.html
- AWS Lambda Developer Guide: Configuring error handling controls for Kafka event sources - https://docs.aws.amazon.com/lambda/latest/dg/kafka-retry-configurations.html
- AWS Lambda Developer Guide: Apache Kafka event poller scaling modes in Lambda - https://docs.aws.amazon.com/lambda/latest/dg/kafka-scaling-modes.html
- AWS Lambda API Reference: SourceAccessConfiguration - https://docs.aws.amazon.com/lambda/latest/api/API_SourceAccessConfiguration.html
- AWS CLI Command Reference: lambda create-event-source-mapping - https://docs.aws.amazon.com/cli/latest/reference/lambda/create-event-source-mapping.html
- Amazon MSK Developer Guide: Semantics of IAM authorization policy actions and resources - https://docs.aws.amazon.com/msk/latest/developerguide/kafka-actions.html

## Issues Found
- The post incorrectly said the Lambda function must be deployed in the same VPC or peered VPC as the MSK cluster. Updated it to explain that the MSK event source mapping creates or reuses a Hyperplane ENI in the MSK cluster subnet, and the function only needs VPC attachment if its own code must reach VPC resources.
- The network example used a Lambda consumer security group and port 9094 as the general path to MSK. Updated it to describe the current MSK broker ports by authentication mode and changed the example to a self-referencing MSK security group rule for IAM authentication on port 9098.
- The IAM resource ARNs for topic and consumer group resources omitted the cluster UUID segment. Updated the example ARNs to use the documented `cluster-name/cluster-uuid/resource-name` format.
- The Python handler decoded Kafka headers as base64 strings. AWS's MSK Lambda event format provides header values as byte arrays, so the helper now converts the array to bytes before decoding.
- The Python handler returned partial batch failures using a string identifier. Kafka partial batch response requires `itemIdentifier` to contain a `partition` value and an `offset` value, so the response shape was corrected.
- The post presented `VPC_SUBNET` and `VPC_SECURITY_GROUP` source access configurations for Amazon MSK IAM authentication. Those source access configuration types apply to self-managed Kafka, so the IAM example now omits them.
- The SASL/SCRAM section did not mention the role permission needed to read the Secrets Manager secret. Added a note about `secretsmanager:GetSecretValue` and `kms:Decrypt` when a customer managed KMS key is used.
- The scaling section incorrectly used `--parallelization-factor` for Amazon MSK and implied more concurrent processing within a partition. Replaced it with Kafka event poller scaling and the `--provisioned-poller-config` CLI option.
- The lag and pitfalls sections still reflected the incorrect parallelization and function-VPC assumptions. Updated them to refer to provisioned pollers, event source mapping ENIs, optional function VPC attachment, and the 14-minute maximum timeout for MSK event source mappings.

## Review Notes
The AWS CLI was not installed in the local environment, so CLI flags were verified against the official AWS CLI command reference rather than local `aws --help` output. The embedded Python handler was syntax-checked locally with Python 3.
