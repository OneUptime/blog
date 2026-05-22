# Validation Summary: How to Write Sentinel Policies to Restrict Public Access

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp Sentinel
- HCP Terraform `tfplan/v2` Sentinel import
- AWS S3
- AWS security groups
- AWS RDS and Aurora cluster instances
- AWS OpenSearch / Elasticsearch domains
- AWS EC2

## Sources Consulted
- HashiCorp Sentinel language specification: https://developer.hashicorp.com/sentinel/docs/language/spec
- HashiCorp Sentinel collection operations: https://developer.hashicorp.com/sentinel/docs/language/collection-operations
- HCP Terraform `tfplan/v2` Sentinel import reference: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/import-reference/tfplan-v2
- Terraform AWS provider `aws_s3_bucket_public_access_block`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_public_access_block
- Terraform AWS provider `aws_s3_bucket_acl`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_acl
- Terraform AWS provider `aws_security_group_rule`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group_rule
- Terraform AWS provider `aws_vpc_security_group_ingress_rule`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_security_group_ingress_rule
- Terraform AWS provider `aws_db_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS provider `aws_rds_cluster_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster_instance
- Terraform AWS provider `aws_opensearch_domain`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/opensearch_domain
- Terraform AWS provider `aws_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance

## Issues Found
- The code blocks were marked as `python`, but the snippets are Sentinel policies. Changed the code fences to `sentinel`.
- The introduction said the post would address every listed public access risk, but the examples do not include ECS or Redshift policies. Adjusted the sentence to say the post addresses several of the risks.
- The S3 public access block policy only compared counts of buckets and public access block resources, which could pass even when a bucket did not have its own matching `aws_s3_bucket_public_access_block`. Updated the example to match public access blocks to bucket names.
- The security group policy did not cover the current best-practice `aws_vpc_security_group_ingress_rule` resource documented by the AWS provider. Added checks for that resource while retaining coverage for inline rules and `aws_security_group_rule`.
- The security group all-ports checks did not catch all-protocol rules represented with `protocol = "-1"` or `protocol = "all"` in older rule shapes. Updated the checks accordingly.
- The RDS policy filtered `aws_rds_cluster` resources but did not use them, and `publicly_accessible` is controlled on RDS DB instances and RDS cluster instances. Replaced the unused cluster filter with `aws_rds_cluster_instance` checks.
- Some generic public-access checks directly accessed optional attributes that may not exist on every filtered resource. Added `else false` guards where the policy intentionally checks broad resource sets.

## Review Notes
The examples are technically valid policy examples, but they are still illustrative rather than exhaustive. Future improvements could include IPv6 public CIDR checks (`::/0`), additional modern AWS resources, subnet route table analysis, S3 bucket policy document inspection, ECS service/network configuration checks, and Redshift public accessibility checks.
