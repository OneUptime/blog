# Validation Summary: How to Create and Manage KMS Customer Managed Keys

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Key Management Service (AWS KMS)
- AWS CLI
- AWS CloudTrail
- Amazon CloudWatch
- Terraform AWS provider
- IAM and KMS key policies

## Sources Consulted
- AWS CLI Command Reference: kms create-key - https://docs.aws.amazon.com/cli/latest/reference/kms/create-key.html
- AWS KMS Developer Guide: Key policies in AWS KMS - https://docs.aws.amazon.com/kms/latest/developerguide/key-policies.html
- AWS KMS Developer Guide: Monitor KMS keys with Amazon CloudWatch - https://docs.aws.amazon.com/kms/latest/developerguide/monitoring-cloudwatch.html
- AWS CLI Command Reference: cloudtrail lookup-events - https://docs.aws.amazon.com/cli/latest/reference/cloudtrail/lookup-events.html
- AWS KMS Developer Guide: Rotate AWS KMS keys - https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html
- AWS KMS Cryptographic Details: Deleting keys - https://docs.aws.amazon.com/kms/latest/cryptographic-details/key-deletion.html
- Terraform Registry: aws_kms_key resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/kms_key.html

## Issues Found
- The opening paragraph used the older "CMK" terminology without qualification and said customer managed keys let you "control everything." AWS has replaced "customer master key (CMK)" terminology with "KMS key," and customer managed keys still have AWS KMS constraints. Updated the text to say "previously called CMKs" and describe the specific controls available.
- The Terraform example referenced `data.aws_caller_identity.current.account_id` but did not declare the data source. Added `data "aws_caller_identity" "current" {}` so the snippet can plan correctly.
- The CloudTrail lookup example claimed to find recent `Decrypt` calls for a specific key, but it filtered by `ResourceType=AWS::KMS::Key` and used `--max-results`, which is not the current AWS CLI pagination option for `lookup-events`. Updated it to filter by `EventName=Decrypt` and use `--max-items 20`.
- The CloudWatch alarm example used a non-existent AWS KMS metric name, `NumberOfDecryptOps`, and a `KeyId` dimension. Updated it to use the documented `SuccessfulRequest` metric with `KeyArn` and `Operation=Decrypt` dimensions.

## Review Notes
The post is technically relevant and the remaining AWS KMS CLI examples align with current AWS documentation. Automatic key rotation is correctly described for the symmetric AWS_KMS-origin customer managed key shown in the Terraform example; asymmetric keys require manual rotation by creating replacement keys.
