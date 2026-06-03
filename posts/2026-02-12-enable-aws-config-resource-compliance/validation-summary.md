# Validation Summary: How to Enable AWS Config for Resource Compliance Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Config
- AWS CLI
- Amazon S3 bucket policies
- AWS IAM roles and managed policies
- Terraform AWS provider
- AWS Config advanced queries
- AWS Config managed rules

## Sources Consulted
- AWS Config Developer Guide: Permissions for the Amazon S3 Bucket for the AWS Config Delivery Channel: https://docs.aws.amazon.com/config/latest/developerguide/s3-bucket-policy.html
- AWS Config Developer Guide: Permissions for the IAM Role Assigned to AWS Config: https://docs.aws.amazon.com/config/latest/developerguide/iamrole-permissions.html
- AWS CLI Command Reference: put-configuration-recorder: https://docs.aws.amazon.com/cli/latest/reference/configservice/put-configuration-recorder.html
- AWS Config Developer Guide: Querying the Current Configuration State of AWS Resources with AWS Config: https://docs.aws.amazon.com/config/latest/developerguide/querying-AWS-resources.html
- AWS Config Developer Guide: Query Components for AWS Config: https://docs.aws.amazon.com/config/latest/developerguide/query-components.html
- AWS Config Developer Guide: Example Queries for AWS Config: https://docs.aws.amazon.com/config/latest/developerguide/example-query.html
- AWS Config API Reference: ConfigSnapshotDeliveryProperties: https://docs.aws.amazon.com/config/latest/APIReference/API_ConfigSnapshotDeliveryProperties.html
- Terraform AWS Provider: aws_config_configuration_recorder: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/config_configuration_recorder
- Terraform AWS Provider: aws_config_delivery_channel: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/config_delivery_channel
- AWS Config Pricing: https://aws.amazon.com/config/pricing/

## Issues Found
- The S3 bucket policy example omitted the current AWS Config bucket existence check permission. Added the `AWSConfigBucketExistenceCheck` statement with `s3:ListBucket`, matching AWS documentation for AWS Config delivery channel bucket access.
- The Terraform "full setup" created the S3 bucket but did not grant AWS Config access to deliver configuration history and snapshots. Added an `aws_s3_bucket_policy` using the documented AWS Config service principal permissions and added an explicit delivery channel dependency on that policy.
- The recorder example enabled global IAM resource recording without noting the current regional limitation. Added a caveat that IAM users, groups, roles, and customer managed policies can only be recorded in Regions where AWS Config supported them before February 2022.
- An advanced query example used `IS NULL` and `tags.tag('Environment')`, which is not supported by AWS Config advanced queries. Replaced it with a documented-style EBS volume query using `configuration.state.value`.
- The S3 advanced query label said it found public buckets, but the query only selected public access block settings. Updated the label to describe the actual query output.

## Review Notes
The local environment did not have the AWS CLI or Terraform installed, so command and configuration validation was performed against official AWS and Terraform documentation rather than local `--help` or `terraform validate` output.
