# Validation Summary: How to Handle Terraform Knowledge Sharing in Teams

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform
- HashiCorp Configuration Language (HCL)
- AWS Provider for Terraform
- Amazon EKS managed node groups
- Amazon RDS
- Amazon S3
- Lambda@Edge and Amazon CloudFront
- AWS IAM
- AWS Systems Manager Parameter Store

## Sources Consulted
- Terraform lifecycle meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- Terraform string syntax documentation: https://developer.hashicorp.com/terraform/language/expressions/strings
- Terraform AWS provider `aws_eks_node_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_node_group
- Amazon EKS managed node update behavior documentation: https://docs.aws.amazon.com/eks/latest/userguide/managed-node-update-behavior.html
- Terraform AWS provider `aws_s3_bucket` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket
- Terraform AWS provider `aws_db_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Amazon RDS parameter group and reboot documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_RebootInstance.html
- Amazon RDS encryption guidance: https://docs.aws.amazon.com/prescriptive-guidance/latest/patterns/encrypt-an-existing-amazon-rds-for-postgresql-db-instance.html
- Lambda@Edge function and replica deletion documentation: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-edge-delete-replicas.html
- OneUptime linked article URL, checked with HTTP 200: https://oneuptime.com/blog/post/2026-02-23-how-to-create-terraform-runbooks-for-operations/view

## Issues Found
- The EKS node group guidance said Terraform may replace all nodes simultaneously and recommended `create_before_destroy`. Updated it to describe EKS managed node group updates through AWS node replacement behavior and to recommend `update_config.max_unavailable = 1`, matching the AWS provider and EKS documentation.
- The Lambda@Edge deletion section said there is a 30-minute delay. Updated it to say replica cleanup typically takes a few hours, matching AWS CloudFront documentation.
- The SSM Parameter Store data source example used single quotes, which are not valid Terraform quoted string delimiters. Updated the example to use double quotes for the data source labels and parameter name.
- The RDS incident example claimed an `engine_version` change from PostgreSQL 13.4 to 14.1 required replacement. Major engine upgrades are supported when configured correctly, so the example was changed to a `storage_encrypted` change from false to true, which requires creating an encrypted replacement or migration path for an existing unencrypted DB instance.
- The related lesson-learned checklist item still referenced engine upgrades after the RDS example changed. Updated it to reference storage encryption changes.

## Review Notes
Most examples are documentation and process templates rather than directly executable Terraform modules. The remaining Terraform-specific claims are accurate at the level of guidance intended by the post, but real production behavior can still vary by AWS provider version, resource arguments, database engine, and organization-specific CI/CD safeguards.
