# Validation Summary: How to Handle Terraform for Greenfield Projects

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform
- Terraform S3 backend
- HashiCorp AWS provider
- AWS S3
- AWS VPC, subnets, route tables, NAT Gateway, VPC Flow Logs, IAM, CloudWatch Logs
- GitHub Actions

## Sources Consulted
- HashiCorp Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform AWS provider documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- Terraform AWS provider aws_s3_bucket_server_side_encryption_configuration documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_server_side_encryption_configuration
- Terraform AWS provider aws_flow_log documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/flow_log
- HashiCorp setup-terraform GitHub Action documentation: https://github.com/marketplace/actions/hashicorp-setup-terraform
- GitHub Actions deployments and environments documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments

## Issues Found
- The post used DynamoDB for S3 backend state locking. Terraform's S3 backend documentation now marks DynamoDB-based locking as deprecated, so the example was updated to use S3 lock files with `use_lockfile = true`, and the minimum Terraform version was raised to `>= 1.10.0`.
- The project structure and backend bootstrap example referenced a DynamoDB lock table. These were updated to describe and create only the S3 state bucket used with S3 lock files.
- The networking module described public subnets, private subnet internet access through NAT, and isolated database subnets, but the snippet did not include the route tables, internet gateway, or route table associations required for that behavior. Those resources were added to make the example consistent with the explanation.
- The VPC Flow Logs example referenced an IAM role and CloudWatch log group that were not defined in the snippet. The missing CloudWatch log group, assume-role policy, IAM role, and inline IAM policy were added.
- The GitHub Actions workflow installed Terraform only in the `plan` job. Because each job runs in a fresh runner environment, the apply jobs were updated to include `hashicorp/setup-terraform`, and the action version was updated to the current documented major version.

## Review Notes
- The examples remain illustrative and still assume supporting variables, module outputs, AWS authentication, and environment protection rules are configured elsewhere.
