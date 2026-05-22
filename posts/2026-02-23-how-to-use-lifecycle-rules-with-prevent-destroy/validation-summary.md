# Validation Summary: How to Use Lifecycle Rules with prevent_destroy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCL
- Terraform lifecycle meta-arguments
- Terraform CLI
- AWS Provider for Terraform
- Amazon RDS
- Amazon S3
- AWS KMS
- Amazon Route 53
- Amazon OpenSearch Service
- Amazon VPC

## Sources Consulted
- Terraform lifecycle meta-argument reference: https://docs.hashicorp.com/terraform/language/meta-arguments/lifecycle
- Terraform destroy command reference: https://developer.hashicorp.com/terraform/cli/commands/destroy
- Terraform state rm command reference: https://developer.hashicorp.com/terraform/cli/commands/state/rm
- AWS Provider aws_db_instance resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- AWS Provider aws_rds_cluster resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster
- AWS Provider aws_s3_bucket resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket
- AWS Provider aws_s3_bucket_object_lock_configuration resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_object_lock_configuration
- AWS Provider aws_kms_key resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/kms_key
- AWS Provider aws_opensearch_domain resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/opensearch_domain
- AWS S3 Object Lock documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html

## Issues Found
- Corrected the description of `prevent_destroy` so it states that the rule only protects a resource while the lifecycle rule remains present in the Terraform configuration. Terraform does not record `prevent_destroy` in state, and removing the resource block also removes the rule.
- Removed the claim that deleting a resource block or module block from configuration is blocked by `prevent_destroy`. Replaced it with the accurate distinction that replacement/destroy plans are blocked only when the protected resource is still declared.
- Added required AWS RDS DB instance arguments to the `aws_db_instance` examples, including `allocated_storage`, `username`, and `manage_master_user_password`, so the snippets use valid current provider arguments without showing plaintext passwords.
- Added required master user configuration to the `aws_rds_cluster` example using `master_username` and `manage_master_user_password`.
- Clarified the S3 Object Lock comment. Object Lock protects retained object versions from permanent deletion or overwrite during the retention period; a simple delete against a versioned bucket can still create a delete marker.

## Review Notes
- Terraform CLI was not installed in the local environment, so snippets were reviewed against official Terraform language/CLI documentation and AWS Provider resource documentation rather than by running `terraform validate`.
- The post uses illustrative snippets and does not include provider configuration, variables, regions, networking, or full production RDS/OpenSearch hardening. That is acceptable for this focused lifecycle tutorial.
