# Validation Summary: How to Explain OpenTofu Module Design Principles

## Status
validated

## Post Type
Guide / Best Practices

## Technologies Covered
- OpenTofu (Terraform-compatible IaC tool)
- HCL (HashiCorp Configuration Language)
- AWS resources used as examples (aws_db_instance / RDS PostgreSQL, VPC, EKS, S3)
- OpenTofu Public Registry (registry.opentofu.org)
- Git-sourced modules

## Sources Consulted
- OpenTofu module documentation: https://opentofu.org/docs/language/modules/
- OpenTofu module sources: https://opentofu.org/docs/language/modules/sources/
- OpenTofu input variables and validation: https://opentofu.org/docs/language/values/variables/
- OpenTofu outputs: https://opentofu.org/docs/language/values/outputs/
- AWS RDS DB Instance documentation (allocated_storage limits, backup_retention_period range): https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Limits.html
- Terraform AWS provider — aws_db_instance resource argument reference (used to verify valid arguments)
- OpenTofu Public Registry: https://registry.opentofu.org/

## Issues Found
No technical issues found.

## Review Notes
- The "BAD" example under Principle 4 includes `region = "us-east-1"` as an argument on `aws_db_instance`. Strictly speaking, `region` is not a valid argument for the `aws_db_instance` resource — region is configured at the provider level. The author addresses this correctly in the "GOOD" example with the comment "region is set via the provider, not in the resource", so the teaching point is preserved. The contrast is intentional and pedagogically useful, so no change was made.
- The terraform-aws-modules/vpc module version `5.1.2` shown in the registry pinning example is illustrative only; the current latest version is significantly higher, but the example is meant to demonstrate pinning syntax rather than recommend a specific version.
- The RDS `allocated_storage` validation range (20–65536 GiB) is correct for PostgreSQL. For other engines (e.g., Oracle, SQL Server), maximum storage limits differ — readers should consult AWS RDS documentation for engine-specific limits if adapting this module.
- The `backup_retention_days` validation lower bound of 1 (rather than AWS's 0) is an opinionated choice that effectively requires backups, which the author flags as a sensible default; this is correct OpenTofu validation behavior.
