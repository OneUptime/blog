# Validation Summary: How to Create RDS Instances with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS RDS (PostgreSQL)
- AWS VPC (subnets, security groups)
- AWS KMS (encryption)
- AWS Secrets Manager
- AWS CloudWatch Logs
- RDS Performance Insights

## Sources Consulted
- [HashiCorp HCL2 Syntax Specification](https://github.com/hashicorp/hcl/blob/main/hclsyntax/spec.md)
- [Terraform AWS Provider — aws_db_instance](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance)
- [Terraform AWS Provider — aws_db_subnet_group](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_subnet_group)
- [Terraform AWS Provider — aws_db_parameter_group](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_parameter_group)
- [Terraform AWS Provider — aws_security_group](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group)
- [Terraform AWS Provider — aws_secretsmanager_secret](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret)
- [Terraform AWS Provider — aws_secretsmanager_secret_version](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret_version)

## Issues Found
1. **Invalid HCL syntax in the Outputs section.** The original block used semicolons to separate multiple attributes on a single line:
   ```hcl
   output "db_endpoint"   { value = aws_db_instance.main.endpoint; sensitive = true }
   ```
   The HCL2 specification requires attributes within a block body to be separated by newlines. The "one-line block" form only supports a single attribute. Semicolons are not a valid separator in HCL and OpenTofu/Terraform would fail to parse this. **Fix:** Reformatted each output to use the standard multi-line block form with one attribute per line.

## Review Notes
- `engine_version = "14.10"` is correct and was a real PostgreSQL minor release. PostgreSQL 14 is still supported by RDS, though by 2026 readers may want to consider PostgreSQL 15 or 16 for new deployments. Not changed because the post is explicitly framed around PostgreSQL 14 (matching `family = "postgres14"` in the parameter group).
- `performance_insights_retention_period = 7` is valid (free tier value). Other valid values are 731 or any multiple of 31 between 1 and 23 months — the current value is the safest default.
- `recovery_window_in_days = 0` allows immediate deletion of the secret. The inline comment notes this is suitable for non-prod; in production a value between 7 and 30 is recommended. The post's current setting matches its commented intent.
- The post references `aws_security_group.app`, `aws_subnet.private`, `aws_vpc.main`, and `aws_kms_key.rds` without defining them. This is acceptable for a focused tutorial showing relevant snippets — readers are expected to wire these into their existing VPC/KMS setup.
- The inline `ingress`/`egress` blocks on `aws_security_group` are still supported, though HashiCorp recommends `aws_vpc_security_group_ingress_rule` / `aws_vpc_security_group_egress_rule` for better lifecycle handling. Not a correctness issue.
