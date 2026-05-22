# Validation Summary: How to Implement Data Protection Policies with Terraform

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Terraform
- HashiCorp AWS provider
- Amazon S3 bucket encryption, bucket policies, public access block, versioning, and lifecycle configuration
- Amazon RDS for PostgreSQL encryption, backups, SSL enforcement, enhanced monitoring, and Performance Insights
- Amazon EBS encryption by default and encrypted volumes
- Amazon OpenSearch Service HTTPS, encryption at rest, and node-to-node encryption
- AWS KMS key policies, aliases, key rotation, and `kms:ViaService`
- AWS Backup plans, backup vaults, copy actions, lifecycle rules, and tag-based backup selection

## Sources Consulted
- Terraform Registry: `aws_s3_bucket_policy` resource, including the warning that only one policy resource should manage a bucket policy: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_policy
- Terraform Registry: `aws_s3_bucket_server_side_encryption_configuration` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_server_side_encryption_configuration
- Terraform Registry: `aws_s3_bucket_public_access_block` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_public_access_block
- Terraform Registry: `aws_s3_bucket_versioning` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_versioning
- Terraform Registry: `aws_s3_bucket_lifecycle_configuration` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration
- Terraform Registry: `aws_db_instance` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform Registry: `aws_db_parameter_group` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_parameter_group
- AWS RDS documentation for requiring SSL on PostgreSQL with `rds.force_ssl`: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.SSL.html
- Terraform Registry: `aws_ebs_encryption_by_default`, `aws_ebs_default_kms_key`, and `aws_ebs_volume` resources: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ebs_encryption_by_default, https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ebs_default_kms_key, https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ebs_volume
- Terraform Registry: `aws_opensearch_domain` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/opensearch_domain
- AWS OpenSearch Service API documentation for `DomainEndpointOptions` and TLS policy values: https://docs.aws.amazon.com/opensearch-service/latest/APIReference/API_DomainEndpointOptions.html
- Terraform Registry: `aws_kms_key` and `aws_kms_alias` resources: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/kms_key, https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/kms_alias
- AWS KMS documentation for `kms:ViaService`, `kms:CallerAccount`, and supported service names: https://docs.aws.amazon.com/kms/latest/developerguide/conditions-kms.html
- Terraform Registry: `aws_backup_plan`, `aws_backup_vault`, and `aws_backup_selection` resources: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/backup_plan, https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/backup_vault, https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/backup_selection

## Issues Found
- The post defined two separate `aws_s3_bucket_policy` resources for the same S3 bucket: one for upload encryption enforcement and another for TLS enforcement. The Terraform AWS provider documents that only one `aws_s3_bucket_policy` resource should manage a given bucket policy because each resource replaces the whole policy. I merged the TLS deny statement into the existing bucket policy example and changed the later TLS section to show the statement as part of the same policy.
- The KMS key policy allowed service usage only through `s3.${var.region}.amazonaws.com`, but the same key was used in examples for RDS, EBS, AWS Backup, and OpenSearch. I changed `kms:ViaService` to include S3, RDS, EC2/EBS, AWS Backup, and OpenSearch service endpoints so the policy matches the services shown in the post.

## Review Notes
- Terraform CLI is not installed in the review environment, so I could not run `terraform fmt` or `terraform validate`. The snippets were reviewed against current official provider schemas and AWS documentation instead.
- The examples intentionally omit surrounding resources such as variables, providers, IAM roles, subnet/security group configuration, and the DR-region backup vault/provider setup. That is acceptable for a focused blog snippet, but a complete working module would need those pieces.
- The RDS example uses PostgreSQL `15.4`, which is version-specific. The `rds.force_ssl` parameter and `postgres15` parameter group family are valid for the shown major version.
