# Validation Summary: How to Use Conditional Expressions for Resource Attributes in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS provider for Terraform/OpenTofu
- Amazon RDS
- Amazon EC2
- Amazon VPC security groups
- Amazon S3 server-side encryption
- AWS KMS

## Sources Consulted
- OpenTofu conditional expressions documentation: https://opentofu.org/docs/language/expressions/conditionals/
- OpenTofu input variables documentation (`nullable` behavior): https://opentofu.org/docs/language/values/variables/
- OpenTofu `enabled` meta-argument documentation: https://opentofu.org/docs/v1.11/language/meta-arguments/enabled/
- AWS provider `aws_db_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- AWS provider `aws_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- AWS provider `aws_security_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- AWS provider `aws_vpc_security_group_ingress_rule` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_security_group_ingress_rule
- AWS provider `aws_s3_bucket_server_side_encryption_configuration` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_server_side_encryption_configuration
- Amazon RDS for PostgreSQL versioning documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.DBVersions.html

## Issues Found
- The RDS example pinned `engine_version = "15.4"`, which is unnecessarily brittle for a general guide and can age out as minor versions roll forward. I changed it to `engine_version = "15"` to match current RDS versioning guidance, where a major version is valid and resolves to a recent minor release.
- The security group example used inline `ingress` rules inside `aws_security_group`. That syntax still exists, but the current AWS provider documentation recommends `aws_vpc_security_group_ingress_rule`/`aws_vpc_security_group_egress_rule` as the best-practice pattern. I updated the example to use `aws_vpc_security_group_ingress_rule` while preserving the conditional attribute example.
- The S3 encryption example claimed to fall back to the AWS-managed KMS key, but the code actually switched the algorithm to `AES256`, which is S3-managed encryption and does not use KMS. I corrected the snippet to keep `sse_algorithm = "aws:kms"` and omit `kms_master_key_id` unless a custom key is requested, which correctly falls back to the default `aws/s3` KMS key.
- The conclusion said `count`-based conditional resources should be used when the whole resource is optional. That guidance is outdated for current OpenTofu, which now has the `enabled` meta-argument for conditional single resources. I updated the conclusion to mention `enabled` for OpenTofu v1.11+ and `count` only for older configurations.

## Review Notes
- The remaining conditional-expression examples are technically valid and align with OpenTofu’s expression rules, including use of `null` to omit optional provider arguments.
- The EC2 example’s `iops = ... ? 3000 : null` pattern is valid because the AWS provider only allows `iops` for `gp3`, `io1`, or `io2`, and `null` cleanly omits the argument outside production.
- `ebs_optimized` on some newer EC2 families can be enabled by default, so the example is illustrative rather than a universal tuning recommendation.
