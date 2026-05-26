# Validation Summary: How to Create Config Aggregators in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- AWS Config
- AWS Config configuration aggregators
- AWS Organizations
- AWS Config managed rules
- AWS Config conformance packs
- AWS Systems Manager Automation remediation
- Amazon S3 and IAM policies

## Sources Consulted
- HashiCorp AWS Provider documentation: `aws_config_configuration_aggregator` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/config_configuration_aggregator
- HashiCorp AWS Provider documentation: `aws_config_aggregate_authorization` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/config_aggregate_authorization
- HashiCorp AWS Provider documentation: `aws_config_configuration_recorder` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/config_configuration_recorder
- HashiCorp AWS Provider documentation: `aws_config_organization_conformance_pack` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/config_organization_conformance_pack
- HashiCorp AWS Provider documentation: `aws_config_remediation_configuration` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/config_remediation_configuration
- AWS Config documentation: Authorizing aggregator accounts - https://docs.aws.amazon.com/config/latest/developerguide/aggregated-add-authorization.html
- AWS Config documentation: AWS managed policies for AWS Config - https://docs.aws.amazon.com/config/latest/developerguide/security-iam-awsmanpol.html
- AWS Config documentation: Conformance packs - https://docs.aws.amazon.com/config/latest/developerguide/conformance-packs.html
- AWS Config documentation: required-tags managed rule - https://docs.aws.amazon.com/config/latest/developerguide/required-tags.html
- AWS Config documentation: encrypted-volumes managed rule - https://docs.aws.amazon.com/config/latest/developerguide/encrypted-volumes.html
- AWS Config documentation: iam-password-policy managed rule - https://docs.aws.amazon.com/config/latest/developerguide/iam-password-policy.html
- AWS Systems Manager Automation runbook reference: `AWS-ConfigureS3BucketVersioning` - https://docs.aws.amazon.com/systems-manager-automation-runbooks/latest/userguide/automation-aws-configures3bucketversioning.html
- AWS Config documentation: S3 bucket policy for delivery channel - https://docs.aws.amazon.com/config/latest/developerguide/s3-bucket-policy.html

## Issues Found
- The organization aggregator section said it automatically collects Config data from all organization accounts. AWS Config aggregators collect data from accounts and regions where AWS Config is enabled, so the wording and code comment were updated to clarify that scope.
- The account aggregation authorization section described authorizing multiple regions as if those were source regions. The `aws_config_aggregate_authorization` region is the aggregator AWS Region, so the text, comment, and local variable name were updated to refer to aggregator regions.
- The organization conformance pack example said it used an AWS managed template, but the snippet defines an inline conformance pack template. The comment was corrected.

## Review Notes
- Terraform was not installed in the review environment, so `terraform validate` could not be run. The snippets were reviewed against official HashiCorp AWS Provider documentation and AWS service documentation.
- Organization conformance packs must be created from the AWS Organizations management account or a delegated administrator account, with all features enabled, and target accounts need properly configured AWS Config recorders unless excluded.
- The S3 bucket policy shown is structurally aligned with AWS Config delivery requirements, but production deployments should also consider AWS's recommended confused-deputy protections such as `AWS:SourceAccount` conditions.
