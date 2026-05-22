# Validation Summary: How to Handle Test Cleanup in Terraform

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform
- Terratest
- Go testing package
- cloud-nuke
- AWS EC2 and VPC cleanup
- boto3
- GitHub Actions
- AWS Budgets with the Terraform AWS provider
- AWS CLI

## Sources Consulted
- Terratest cleanup best practices: https://terratest.gruntwork.io/docs/testing-best-practices/cleanup/
- Terratest Terraform package docs: https://pkg.go.dev/github.com/gruntwork-io/terratest/modules/terraform
- Go language specification for defer statements: https://go.dev/ref/spec#Defer_statements
- Go testing package docs for T.Cleanup: https://pkg.go.dev/testing#T.Cleanup
- cloud-nuke README and CLI usage docs: https://github.com/gruntwork-io/cloud-nuke and https://github.com/gruntwork-io/cloud-nuke/blob/master/docs/cli-usage.md
- AWS VPC deletion documentation: https://docs.aws.amazon.com/vpc/latest/userguide/delete-vpc.html
- AWS EC2 DeleteVpc API documentation: https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_DeleteVpc.html
- boto3 EC2 describe_vpcs documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/ec2/client/describe_vpcs.html
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- aws-actions/configure-aws-credentials documentation: https://github.com/aws-actions/configure-aws-credentials
- Terraform AWS provider aws_budgets_budget documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/budgets_budget

## Issues Found
- The custom boto3 VPC cleanup example claimed to delete a VPC and all dependencies, but AWS requires instances and other VPC resources to be terminated or detached before VPC deletion, and the sample attempted subnet and security group deletion before terminating instances. I changed the helper name and docstring to cover common dependencies, added termination and waiting for instances in the VPC before deleting dependent resources, and added deletion of custom route tables before deleting the VPC.
- The GitHub Actions workflow used `role-to-assume` with `aws-actions/configure-aws-credentials` but did not grant `id-token: write`, which is required for the recommended OIDC flow when no static AWS access keys are supplied. I added top-level `permissions` with `id-token: write` and `contents: read`.

## Review Notes
- The Terratest examples correctly register cleanup before apply, and Terratest documentation confirms apply helpers do not call destroy automatically.
- The `t.Cleanup` discussion is accurate for Go 1.14 and later.
- The cloud-nuke commands use documented flags. Because cloud-nuke is intentionally broad, production use should rely on tightly scoped accounts, regions, resource types, or config filters.
