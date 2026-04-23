# Validation Summary: How to Reference Local Values in OpenTofu Resources

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- OpenTofu language
- HCL configuration syntax
- AWS provider resources for OpenTofu/Terraform-compatible configurations
- Infrastructure as Code

## Sources Consulted
- OpenTofu Docs: Local Values — https://opentofu.org/docs/language/values/locals/
- OpenTofu Docs: References to Named Values — https://opentofu.org/docs/language/expressions/references/
- OpenTofu Docs: Dynamic Blocks — https://opentofu.org/docs/v1.9/language/expressions/dynamic-blocks/
- Terraform AWS Provider Docs: `aws_db_instance` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS Provider source docs: `aws_db_instance` — https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/db_instance.html.markdown
- Terraform AWS Provider source docs: `aws_autoscaling_group` — https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/autoscaling_group.html.markdown
- Terraform AWS Provider source docs: `aws_security_group` — https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/security_group.html.markdown
- Terraform AWS Provider source docs: `aws_instance` — https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/instance.html.markdown
- Terraform AWS Provider source docs: `aws_vpc` — https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/vpc.html.markdown

## Issues Found
1. The `aws_db_instance` example was incomplete. It only set `instance_class`, `multi_az`, and `tags`, which is not enough for a working RDS instance. Added the missing required database settings (`allocated_storage`, `engine`, `db_name`, `username`, `password`, and `skip_final_snapshot`) so the example is technically valid.

2. The `aws_autoscaling_group` example was incomplete. AWS Auto Scaling groups require a launch configuration, launch template, or mixed instances policy, and the example did not provide one. Added a minimal `aws_launch_template` resource plus `availability_zones` and a `launch_template` block on the Auto Scaling group.

3. The dynamic block example referenced undeclared values. `local.name_prefix` and `aws_vpc.main.id` were used without being declared in that snippet. Added `name_prefix` to the `locals` block and a minimal `aws_vpc` resource.

4. The module example referenced `local.environment` without defining it. Added `environment = var.environment` to the `locals` block and used that local consistently in `common_tags`.

5. The conclusion said to use locals "aggressively," which overstates OpenTofu's guidance. OpenTofu recommends using locals in moderation to avoid hurting readability. Updated that sentence to recommend using locals thoughtfully instead.

## Review Notes
- No remaining technical inaccuracies were found after the fixes above.
- The `aws_security_group` example uses inline `ingress`/`egress` blocks. This is still supported and works for demonstrating `dynamic` blocks, but current AWS provider guidance prefers `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` resources for new configurations.
