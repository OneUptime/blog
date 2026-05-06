# Validation Summary: How to Use Conditionals for Environment-Specific Configuration in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS provider for Terraform/OpenTofu
- Amazon EC2 Auto Scaling
- Amazon RDS
- Amazon VPC security groups
- Amazon S3

## Sources Consulted
- OpenTofu conditional expressions docs: https://opentofu.org/docs/language/expressions/conditionals/
- OpenTofu input variables docs: https://opentofu.org/docs/language/values/variables/
- OpenTofu local values docs: https://opentofu.org/docs/language/values/locals/
- OpenTofu `count` meta-argument docs: https://opentofu.org/docs/language/meta-arguments/count/
- OpenTofu CLI `plan` docs for `-var-file`: https://opentofu.org/docs/cli/commands/plan/
- Terraform AWS Provider `aws_db_instance` upgrade guidance: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/guides/version-5-upgrade
- HashiCorp RDS tutorial showing `replicate_source_db = aws_db_instance.<name>.identifier`: https://developer.hashicorp.com/terraform/tutorials/aws/aws-rds
- Terraform AWS Provider security group docs recommending `aws_vpc_security_group_ingress_rule` / `aws_vpc_security_group_egress_rule`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group

## Issues Found
- The read replica example used `aws_db_instance.app.id` for `replicate_source_db`. In AWS provider v5+, `aws_db_instance.id` is no longer the DB identifier; it is the DBI resource ID. I changed it to `aws_db_instance.app.identifier` so the example matches current provider behavior and the expected argument type.
- The "dev SSH access" example used `local.is_nonprod ? 1 : 0`, which would also create the rule in staging even though the text says the rule is only for dev. I changed the logic to `local.is_dev ? 1 : 0` so the code matches the explanation.
- The SSH rule example used `aws_security_group_rule`. Current AWS provider guidance recommends `aws_vpc_security_group_ingress_rule` / `aws_vpc_security_group_egress_rule` as the best-practice resources for VPC security group rules. I updated the example to `aws_vpc_security_group_ingress_rule` and adjusted the argument names accordingly (`cidr_ipv4`, `ip_protocol`).

## Review Notes
- The OpenTofu syntax used for variable validation, locals, conditionals, maps, and `-var-file` usage is correct per current OpenTofu documentation.
- OpenTofu 1.11 introduces `lifecycle { enabled = ... }` as a cleaner alternative to `count = condition ? 1 : 0` for single-resource toggles, but the `count` pattern shown in the post remains valid.
- The `tofu` binary was not available in the local workspace during review, so CLI verification was done against the official OpenTofu documentation.
