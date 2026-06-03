# Validation Summary: How to Debug Terraform Plan and Apply Errors

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Terraform CLI
- Terraform configuration language
- Terraform AWS provider
- AWS IAM and STS
- Amazon RDS for PostgreSQL
- AWS VPC security groups

## Sources Consulted
- Terraform CLI environment variables reference: https://developer.hashicorp.com/terraform/cli/config/environment-variables
- Terraform logging/debugging documentation: https://developer.hashicorp.com/terraform/internals/debugging
- Terraform `for_each` meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- Terraform `plan` command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform `apply` command reference: https://developer.hashicorp.com/terraform/cli/commands/apply
- Terraform refresh command reference: https://developer.hashicorp.com/terraform/cli/commands/refresh
- Terraform state command reference: https://developer.hashicorp.com/terraform/cli/commands/state
- Terraform provider configuration reference: https://developer.hashicorp.com/terraform/language/providers/configuration
- Terraform providers within modules documentation: https://developer.hashicorp.com/terraform/language/modules/develop/providers
- Terraform moved resources documentation: https://developer.hashicorp.com/terraform/cli/state/move
- Terraform AWS provider documentation for `aws_vpc_security_group_ingress_rule`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_security_group_ingress_rule
- Terraform AWS provider documentation for `aws_vpc_security_group_egress_rule`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_security_group_egress_rule
- Terraform AWS provider documentation for provider retry arguments: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- Terraform AWS provider documentation for `aws_db_instance` timeouts: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- AWS CLI `sts get-caller-identity` command reference: https://docs.aws.amazon.com/cli/latest/reference/sts/get-caller-identity.html
- Amazon RDS for PostgreSQL major version upgrade documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_UpgradeDBInstance.PostgreSQL.MajorVersion.html
- Amazon RDS for PostgreSQL release notes: https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-versions.html

## Issues Found
- The security group cycle example used `aws_security_group_rule`. The current AWS provider documentation recommends `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` for new security group rule configuration, so the example was updated to those resources with `referenced_security_group_id` and `ip_protocol`.
- The rate limiting section said to add retry configuration, but the provider snippet only configured `default_tags`. The snippet was changed to use the AWS provider's `retry_mode` and `max_retries` arguments.
- The RDS upgrade guidance implied that intermediate versions are the only RDS-specific fix. The wording was adjusted to also mention choosing a supported target minor version, matching the RDS valid upgrade target documentation.

## Review Notes
Terraform was not installed in the local environment, so CLI flags were verified against official Terraform command documentation rather than local `terraform --help` output.
