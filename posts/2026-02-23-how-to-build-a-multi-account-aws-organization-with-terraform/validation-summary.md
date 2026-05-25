# Validation Summary: How to Build a Multi-Account AWS Organization with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS Organizations
- AWS Service Control Policies
- AWS CloudTrail
- AWS Config
- AWS IAM
- AWS Organizations account provisioning

## Sources Consulted
- Terraform AWS Provider documentation for `aws_organizations_organization`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/organizations_organization
- Terraform AWS Provider documentation for `aws_organizations_account`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/organizations_account
- Terraform AWS Provider documentation for `aws_organizations_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/organizations_policy
- Terraform AWS Provider documentation for `aws_organizations_policy_attachment`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/organizations_policy_attachment
- Terraform AWS Provider documentation for `aws_cloudtrail`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudtrail
- Terraform AWS Provider documentation for `aws_config_configuration_aggregator`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/config_configuration_aggregator
- Terraform AWS Provider documentation for `aws_iam_role`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role
- AWS Organizations documentation for service control policies: https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html
- AWS Organizations documentation for SCP syntax: https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps_syntax.html
- AWS IAM documentation for denying access by requested Region: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_examples_aws_deny-requested-region.html
- AWS CloudTrail documentation for creating organization trails: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/creating-trail-organization.html
- AWS CloudTrail documentation for organization trail preparation: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/creating-an-organizational-trail-prepare.html
- AWS CloudTrail documentation for S3 bucket policies: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/create-s3-bucket-policy-for-cloudtrail.html

## Issues Found
- The architecture overview said the tutorial would build shared networking with AWS Transit Gateway, but no Transit Gateway implementation was included. I removed that bullet so the post accurately describes what it builds.
- The region restriction SCP claimed to allow global services, but the policy used `Action = "*"` with a principal ARN exception for `OrganizationAccountAccessRole`. That bypasses the restriction for that role rather than excluding global services. I changed the SCP to use the AWS-documented `Deny` plus `NotAction` pattern for common global services.
- The CloudTrail example referenced an S3 bucket name derived from an Organizations account ID and an undefined KMS key resource. It also did not make the required organization-trail bucket policy prerequisite clear. I changed the snippet to use explicit variables for the log bucket and KMS key ARN and added a short note that the bucket must already exist with the required CloudTrail organization-trail bucket policy.

## Review Notes
- The Terraform snippets are illustrative and still assume normal surrounding configuration, such as provider aliases for managing resources in different AWS accounts, IAM permissions to create organization resources, and the IAM role used by the AWS Config organization aggregator.
- Organization CloudTrail must be created from the AWS Organizations management account or a delegated administrator account, and the log bucket policy must allow organization trail delivery.
