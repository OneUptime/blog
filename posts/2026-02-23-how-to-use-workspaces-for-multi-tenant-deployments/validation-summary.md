# Validation Summary: How to Use Workspaces for Multi-Tenant Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform workspaces
- Terraform HCL input variables, locals, data sources, and resources
- AWS VPC, subnets, RDS, KMS, Secrets Manager, ALB, and ECS
- Bash automation scripts

## Sources Consulted
- Terraform workspaces documentation: https://developer.hashicorp.com/terraform/language/state/workspaces
- Terraform workspace CLI command reference: https://developer.hashicorp.com/terraform/cli/commands/workspace
- Terraform workspace new command reference: https://developer.hashicorp.com/terraform/cli/commands/workspace/new
- Terraform workspace delete command reference: https://developer.hashicorp.com/terraform/cli/commands/workspace/delete
- Terraform plan command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform apply command reference: https://developer.hashicorp.com/terraform/cli/commands/apply
- Terraform destroy command reference: https://developer.hashicorp.com/terraform/cli/commands/destroy
- Terraform state pull command reference: https://developer.hashicorp.com/terraform/cli/commands/state/pull
- Terraform AWS provider aws_db_instance documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS provider aws_ecs_service documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- Terraform Random provider random_password documentation: https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/password
- Amazon RDS quotas and naming constraints: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Limits.html
- Amazon RDS for PostgreSQL release notes and version guidance: https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-versions.html
- Referenced OneUptime blog URL: https://oneuptime.com/blog/post/2026-02-23-how-to-handle-workspace-naming-in-terraform-workspace/view

## Issues Found
- The post described workspaces as providing "complete isolation" between tenants. HashiCorp documents workspaces as separate state instances under one backend, and explicitly notes they are not suitable for deployments requiring separate credentials or access controls. Updated the wording to describe separate state and added the shared-backend/credentials caveat in the summary.
- The Terraform snippet referenced `var.environment` but did not declare an `environment` input variable. Added the missing variable declaration.
- The offboarding script passed `-var="deletion_protection=false"`, but the configuration hardcoded `deletion_protection = true` and did not declare a matching variable. Added a `deletion_protection` variable and wired the RDS instance to it.
- The subnet resources used `data.aws_availability_zones.available` without declaring the data source. Added the `aws_availability_zones` data source.
- The tenant `region` variable was shown in the tfvars files but not used by the Terraform configuration. Added an AWS provider block using `region = var.region`.
- The RDS example pinned PostgreSQL `engine_version = "15.4"`, which Amazon RDS now marks as having reached the end of standard support. Changed it to the PostgreSQL major version `"15"` so RDS can select a current supported minor release for that major version.
- The `random_password` resource allowed the default special character set, which includes `@`; Amazon RDS master passwords cannot include `/`, `'`, `"`, `@`, or a space. Added `override_special` with an RDS-compatible special character set.
- The onboarding script checked workspace existence with an unanchored grep that could match a different workspace with a similar name. Changed it to normalize `terraform workspace list` output and use an exact match.
- The offboarding script wrote a state backup into `backups/` without ensuring the directory exists. Added `mkdir -p backups`.

## Review Notes
Terraform was not installed in the local workspace, so CLI behavior was verified against official HashiCorp command documentation rather than local `terraform --help` output. The AWS examples still omit surrounding resources such as security groups, target groups, ECS task definitions, NAT routing, and IAM permissions; this is acceptable for a focused article, but those resources would be required in a complete deployable module.
