# Validation Summary: How to Create IAM Roles and Policies with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Identity and Access Management (IAM)
- AWS IAM roles, trust policies, managed policies, inline policies, and instance profiles
- Amazon S3 IAM permissions
- AWS Lambda execution roles
- Amazon EC2 instance profiles
- AWS Security Token Service (STS) AssumeRole
- Terraform AWS provider
- Terraform HCL and `jsonencode`

## Sources Consulted
- AWS IAM User Guide: IAM roles: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles.html
- AWS IAM User Guide: IAM and AWS STS quotas: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_iam-quotas.html
- AWS IAM User Guide: The confused deputy problem: https://docs.aws.amazon.com/IAM/latest/UserGuide/confused-deputy.html
- Amazon EC2 User Guide: IAM roles for Amazon EC2: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/iam-roles-for-amazon-ec2.html
- Terraform Registry: `aws_iam_instance_profile`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_instance_profile
- Terraform Registry: `aws_iam_policy_document`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document
- HashiCorp Developer tutorial: Create IAM policies: https://developer.hashicorp.com/terraform/tutorials/aws/aws-iam-policy
- HashiCorp Developer tutorial: Provision AWS resources across accounts using AssumeRole: https://developer.hashicorp.com/terraform/tutorials/aws/aws-assumerole

## Issues Found
- The IAM policy size limits in the "Common Mistakes" section were incorrect. The post said inline policies have a 6,144 character limit and managed policies have a 10,240 character limit. AWS documents role inline policies as having a 10,240 character aggregate size limit per role and customer managed policies as having a 6,144 character limit per policy. Updated the sentence to reflect the correct limits.

## Review Notes
- Terraform CLI was not installed in the review environment, so I could not run `terraform fmt` or `terraform validate` locally. The HCL snippets were reviewed manually against Terraform AWS provider documentation and HashiCorp examples.
- The examples intentionally use placeholder ARNs, account IDs, bucket names, queue names, and external IDs. These must be replaced with real values before use.
