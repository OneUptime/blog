# Validation Summary: How to Deploy a Multi-AZ Architecture with OpenTofu on AWS - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (CLI: `tofu init`, `tofu plan`, `tofu apply`)
- AWS VPC, Subnets, Internet Gateway, NAT Gateway, EIP
- AWS RDS (PostgreSQL Multi-AZ)
- AWS Application Load Balancer (ALB)
- HCL (HashiCorp Configuration Language) / Terraform AWS provider resources

## Sources Consulted
- AWS provider documentation for `aws_eip` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eip) — confirms `domain = "vpc"` is the current attribute, replacing the deprecated `vpc = true`.
- AWS provider documentation for `aws_nat_gateway`, `aws_internet_gateway`, `aws_subnet`, `aws_vpc` — confirms argument names used in the post.
- AWS provider documentation for `aws_db_instance` — confirms `multi_az`, `engine_version`, `storage_type = "gp3"`, `deletion_protection`, `backup_retention_period` arguments.
- AWS provider documentation for `aws_lb` — confirms `load_balancer_type`, `drop_invalid_header_fields`, `enable_deletion_protection`, and the `access_logs` block (requiring `bucket`, with `enabled` optional).
- AWS RDS supported engine versions and instance classes — `postgres` 15.4 and `db.r7g.large` are valid.
- OpenTofu CLI documentation (https://opentofu.org/docs/cli/) — confirms `tofu init/plan/apply` commands.

## Issues Found
No technical issues found.

## Review Notes
- The Architecture Overview mentions "ElastiCache with replicas in separate AZs" and an "Auto Scaling Group", but the post does not include HCL for these resources. This is not a technical error, just an unfulfilled mention; readers may be surprised the snippets stop at ALB.
- `skip_final_snapshot = false` requires `final_snapshot_identifier` to be set when destroying the RDS instance. The post does not include this argument; users following the example would need to add it before running `tofu destroy`. The configuration itself is valid and `apply` will succeed; this is only a runtime concern at destroy time.
- PostgreSQL 15.4 was released in August 2023. By the publication date (2026), readers may want to use a more current minor version of PostgreSQL 15 (or PostgreSQL 16) for the latest patches, though 15.4 remains valid syntax for RDS.
- The conclusion's "99.99% availability" figure is aspirational. AWS publishes a 99.95% monthly uptime SLA for RDS Multi-AZ deployments and 99.99% for ALB; an end-to-end Multi-AZ stack typically lands closer to 99.95–99.99% depending on the weakest component. Not technically wrong as a target, but not a guarantee.
- The post references several resources (`aws_security_group.db`, `aws_security_group.alb`, variables like `var.db_name`, `var.log_bucket`) without showing their definitions. This is fine for a focused tutorial but worth flagging as not copy-paste-runnable end-to-end.
