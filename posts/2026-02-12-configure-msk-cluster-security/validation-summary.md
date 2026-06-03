# Validation Summary: How to Configure MSK Cluster Security

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon MSK
- Apache Kafka
- AWS CLI
- AWS IAM access control for MSK
- SASL/SCRAM
- Kafka ACLs
- AWS KMS
- AWS Secrets Manager
- Amazon VPC security groups and private connectivity
- Python Kafka clients

## Sources Consulted
- Amazon MSK encryption: https://docs.aws.amazon.com/msk/latest/developerguide/msk-encryption.html
- AWS CLI `create-cluster` command reference: https://docs.aws.amazon.com/cli/latest/reference/kafka/create-cluster.html
- AWS CLI `update-security` command reference: https://docs.aws.amazon.com/cli/latest/reference/kafka/update-security.html
- Amazon MSK IAM access control: https://docs.aws.amazon.com/msk/latest/developerguide/iam-access-control.html
- Configure clients for IAM access control: https://docs.aws.amazon.com/msk/latest/developerguide/configure-clients-for-iam-access-control.html
- IAM authorization policy actions and resources for Amazon MSK: https://docs.aws.amazon.com/msk/latest/developerguide/kafka-actions.html
- Set up SASL/SCRAM authentication for an Amazon MSK cluster: https://docs.aws.amazon.com/msk/latest/developerguide/msk-password-tutorial.html
- Amazon MSK port information: https://docs.aws.amazon.com/msk/latest/developerguide/port-info.html
- Get bootstrap brokers using the AWS CLI: https://docs.aws.amazon.com/msk/latest/developerguide/get-bootstrap-cli.html
- AWS MSK IAM SASL signer for Python: https://github.com/aws/aws-msk-iam-sasl-signer-python

## Issues Found
- The post claimed it covered every MSK security option, but it does not cover TLS client authentication with ACM private CAs. Changed the wording to "the main security options" to avoid an overbroad technical claim without adding a new section.
- The Secrets Manager SCRAM secret example omitted `--kms-key-id`. Amazon MSK requires SCRAM secrets to use a customer-managed KMS key; secrets encrypted with the default Secrets Manager KMS key cannot be associated with an MSK cluster. Added `--kms-key-id` and a short note.
- The `aws kafka update-security` example omitted the required `--current-version` parameter. Added a `<current-cluster-version>` placeholder so the command matches the AWS CLI contract.

## Review Notes
- The AWS CLI was not installed in the local environment, so command validation was performed against the official AWS CLI command reference.
- The Python IAM example matches the AWS-documented SASL/OAUTHBEARER pattern for `kafka-python` and the AWS MSK IAM SASL signer library.
- The port references for plaintext, TLS, SASL/SCRAM, and IAM are correct for private in-AWS MSK broker access. Public access uses separate 919x ports, which is outside the private-only examples in the post.
