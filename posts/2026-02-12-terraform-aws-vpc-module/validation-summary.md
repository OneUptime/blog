# Validation Summary: How to Use the Terraform AWS VPC Module

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS VPC
- Terraform
- terraform-aws-modules/vpc/aws
- VPC subnets, route tables, NAT gateways, VPC endpoints, and flow logs
- Amazon EKS subnet discovery tags
- Amazon RDS subnet groups

## Sources Consulted
- terraform-aws-modules/terraform-aws-vpc v5.5.0 README: https://github.com/terraform-aws-modules/terraform-aws-vpc/blob/v5.5.0/README.md
- terraform-aws-modules/terraform-aws-vpc v5.5.0 variables: https://github.com/terraform-aws-modules/terraform-aws-vpc/blob/v5.5.0/variables.tf
- terraform-aws-modules/terraform-aws-vpc v5.5.0 vpc-endpoints submodule: https://github.com/terraform-aws-modules/terraform-aws-vpc/tree/v5.5.0/modules/vpc-endpoints
- terraform-aws-modules/terraform-aws-rds subnet group documentation: https://terraform-aws-modules-terraform-aws-rds.mintlify.app/guides/subnet-groups
- AWS VPC gateway endpoints documentation: https://docs.aws.amazon.com/vpc/latest/privatelink/gateway-endpoints.html
- AWS NAT gateway pricing documentation: https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-pricing.html
- Amazon EKS subnet tagging documentation: https://docs.aws.amazon.com/eks/latest/userguide/tag-subnets-auto.html

## Issues Found
- The VPC endpoint example used `enable_s3_endpoint` and `enable_dynamodb_endpoint`, which are not root module inputs in `terraform-aws-modules/vpc/aws` v5.5.0. Replaced the snippet with the supported `vpc-endpoints` submodule and configured S3 and DynamoDB as gateway endpoints attached to the private route tables.
- The flow logs example used `create_flow_log_iam_role`, but v5.5.0 uses `create_flow_log_cloudwatch_iam_role`. Updated the variable name so the snippet matches the module inputs.
- The RDS handoff example passed `subnet_ids` without enabling DB subnet group creation in the RDS module. Added `create_db_subnet_group = true` so the example matches the documented RDS module behavior.

## Review Notes
The NAT gateway monthly cost statement is directionally correct for common US regions before data processing charges, but NAT gateway pricing is region-specific and also includes per-GB processing charges. Future updates could make that caveat explicit.
