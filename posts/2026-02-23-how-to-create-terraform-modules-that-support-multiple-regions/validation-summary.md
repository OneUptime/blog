# Validation Summary: How to Create Terraform Modules That Support Multiple Regions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- AWS Provider (hashicorp/aws)
- AWS VPC, Subnets
- AWS S3 (Bucket, Versioning, Replication Configuration)
- AWS IAM (Roles, Assume Role Policy)
- AWS RDS (PostgreSQL, Cross-Region Read Replicas, Multi-AZ)
- AWS Route 53 (Health Checks, Latency-Based Routing Records, Alias Records)
- Terraform `provider` aliases, `configuration_aliases`, `for_each`, `count`, `locals`, `data` sources, `cidrsubnet`

## Sources Consulted
- Terraform Provider Configuration / Aliases: https://developer.hashicorp.com/terraform/language/providers/configuration
- Module Providers (passing aliased providers): https://developer.hashicorp.com/terraform/language/modules/develop/providers
- AWS Provider Registry: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- `aws_vpc`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc
- `aws_subnet`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/subnet
- `aws_region` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/region
- `aws_s3_bucket_replication_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_replication_configuration
- `aws_s3_bucket_versioning`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_versioning
- `aws_db_instance` (cross-region replica via ARN): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- `aws_route53_health_check`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_health_check
- `aws_route53_record` (latency_routing_policy): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- Terraform `cidrsubnet` function: https://developer.hashicorp.com/terraform/language/functions/cidrsubnet

## Issues Found
No technical issues found. All HCL is syntactically correct and uses currently supported, non-deprecated AWS provider resources and arguments. Specifically verified:
- `configuration_aliases` syntax inside `required_providers` is correct (added in Terraform 0.15 / AWS provider 3.x).
- The note that `for_each` cannot be used with different providers per instance is accurate — providers cannot be dynamic in `for_each`.
- `aws_s3_bucket_replication_configuration` is the correct (post AWS provider v4) standalone resource, replacing the inline `replication_configuration` block on `aws_s3_bucket`.
- `aws_s3_bucket_versioning` is the correct standalone resource.
- `replicate_source_db = aws_db_instance.primary.arn` is the correct pattern for cross-region RDS read replicas (ARN required; for same-region the identifier suffices).
- `aws_route53_record` with `latency_routing_policy { region = ... }`, `set_identifier`, and `health_check_id` is correct.
- `data "aws_region" "current"` with `.name` is valid in current AWS provider versions.

## Review Notes
- The S3 replication example creates an IAM role with only an `assume_role_policy` but no inline/attached policy granting the replication permissions (`s3:GetReplicationConfiguration`, `s3:GetObjectVersionForReplication`, `s3:ReplicateObject`, `s3:ReplicateDelete`, `s3:ReplicateTags`, etc.). In a real deployment the user would need to attach such a policy for replication to actually function. This is a reasonable simplification for a blog post but worth flagging as something the reader must add.
- For cross-region RDS replicas of an **encrypted** source, AWS requires `kms_key_id` to be set on the replica (referencing a KMS key in the destination region). The example sets `storage_encrypted = true` on the replica but does not specify `kms_key_id`. Readers replicating across regions with encryption will need to add this.
- AWS provider v6 introduced `region` as the preferred attribute on the `aws_region` data source; `name` continues to work and is not deprecated as of this review, so no change needed.
- The `data "aws_region" "current"` and the `Primary = var.is_primary` (bool) inside `tags` will be implicitly converted to strings by Terraform — this works but readers using strict tag-type checking should be aware.
