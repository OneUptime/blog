# Validation Summary: How to Import Existing AWS Resources into Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform import blocks
- Terraform CLI
- HashiCorp AWS provider
- AWS EC2
- AWS S3
- AWS VPC networking
- AWS RDS
- AWS IAM
- Amazon Route 53
- AWS Lambda

## Sources Consulted
- HashiCorp Terraform CLI `import` command reference: https://developer.hashicorp.com/terraform/cli/commands/import
- HashiCorp Terraform import workflow documentation: https://developer.hashicorp.com/terraform/language/import
- HashiCorp AWS provider `aws_instance` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/instance.html.markdown
- HashiCorp AWS provider `aws_s3_bucket` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/s3_bucket.html.markdown
- HashiCorp AWS provider `aws_s3_bucket_versioning` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/s3_bucket_versioning.html.markdown
- HashiCorp AWS provider `aws_vpc` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/vpc.html.markdown
- HashiCorp AWS provider `aws_subnet` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/subnet.html.markdown
- HashiCorp AWS provider `aws_security_group` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/security_group.html.markdown
- HashiCorp AWS provider `aws_db_instance` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/db_instance.html.markdown
- HashiCorp AWS provider `aws_iam_role` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/iam_role.html.markdown
- HashiCorp AWS provider `aws_iam_policy` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/iam_policy.html.markdown
- HashiCorp AWS provider `aws_route53_record` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/route53_record.html.markdown
- HashiCorp AWS provider `aws_lambda_function` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/lambda_function.html.markdown

## Issues Found
- The VPC, subnet, and security group import examples used placeholder IDs containing `g` and `h` characters. AWS EC2-style IDs use hexadecimal characters after the resource prefix, so those placeholders were changed to valid hexadecimal examples.

## Review Notes
- The import IDs shown for EC2 instances, S3 buckets, S3 bucket versioning, VPCs, subnets, security groups, RDS DB instances, IAM roles, IAM policies, Route 53 records, and Lambda functions match the AWS provider documentation for Terraform 1.5+ import blocks and `terraform import`.
- Terraform 1.12 and later also supports provider-defined `identity` objects for some resources, but the `id` examples used in the post remain valid for the Terraform 1.5+ workflow described.
- The Azure and GCP guide links in the conclusion resolve to the intended OneUptime blog posts.
