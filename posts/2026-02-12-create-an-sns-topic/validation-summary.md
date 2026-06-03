# Validation Summary: How to Create an SNS Topic

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon SNS
- AWS CLI
- Boto3
- AWS CDK
- AWS CloudFormation
- Terraform AWS Provider
- AWS KMS

## Sources Consulted
- AWS CLI `sns create-topic` command reference: https://docs.aws.amazon.com/cli/latest/reference/sns/create-topic.html
- AWS CLI `sns set-topic-attributes` command reference: https://docs.aws.amazon.com/cli/latest/reference/sns/set-topic-attributes.html
- Boto3 SNS `create_topic` client documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/sns/client/create_topic.html
- AWS CDK `aws_sns.Topic` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sns.Topic.html
- AWS CloudFormation `AWS::SNS::Topic` reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-sns-topic.html
- Terraform AWS Provider `aws_sns_topic` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic
- Amazon SNS FIFO topic message ordering documentation: https://docs.aws.amazon.com/sns/latest/dg/fifo-topic-message-ordering.html
- Amazon SNS FIFO message deduplication documentation: https://docs.aws.amazon.com/sns/latest/dg/fifo-message-dedup.html

## Issues Found
- The post stated that FIFO topics have a throughput limit of 300 messages per second, or 3,000 with batching. Current Amazon SNS documentation lists the default FIFO topic throughput scope as 3,000 messages per second or 20 MB per second, whichever comes first. Updated the text and Mermaid diagram to use the current default limit.
- The post described FIFO topics as guaranteeing strict ordering and exactly-once delivery without qualifiers. AWS documents FIFO ordering in the context of message groups and exactly-once behavior under deduplication and subscriber conditions. Updated the wording to say FIFO topics preserve ordering within each message group and support exactly-once delivery when deduplication conditions are met.

## Review Notes
The AWS CLI, Boto3, CDK, CloudFormation, Terraform, tagging, encryption, FIFO topic naming, content-based deduplication, topic policy, listing, attribute retrieval, deletion, and subscription listing examples are consistent with the referenced official documentation. The local environment did not have the AWS CLI installed, so CLI syntax was verified against the official AWS CLI command reference rather than local `--help` output.
