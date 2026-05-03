# Validation Summary: How to Create Security Groups with OpenTofu on AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (HCL configuration language)
- Terraform AWS Provider (`hashicorp/aws`)
- AWS Security Groups (EC2/VPC)
- AWS resources: `aws_security_group`, `aws_security_group_rule`
- HCL features: `dynamic` blocks, `lifecycle` meta-argument

## Sources Consulted
- Terraform AWS Provider docs — `aws_security_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Terraform AWS Provider docs — `aws_security_group_rule`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group_rule
- OpenTofu language docs — `dynamic` blocks: https://opentofu.org/docs/language/expressions/dynamic-blocks/
- OpenTofu language docs — `lifecycle` meta-argument: https://opentofu.org/docs/language/meta-arguments/lifecycle/
- AWS docs — Security groups for your VPC: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-security-groups.html

## Issues Found
No technical issues found.

All code examples are syntactically valid HCL and use correct AWS provider attributes:
- `aws_security_group` block attributes (`name`, `description`, `vpc_id`, `ingress`, `egress`, `tags`) are accurate.
- Ingress/egress attributes (`from_port`, `to_port`, `protocol`, `cidr_blocks`, `ipv6_cidr_blocks`, `security_groups`, `description`) are valid.
- `protocol = "-1"` correctly represents "all protocols" (requires `from_port = 0` and `to_port = 0`, which the examples honor).
- `aws_security_group_rule` attributes (`type`, `security_group_id`, etc.) are correct.
- The `lifecycle { ignore_changes = [ingress, egress] }` pattern is the recommended approach when combining the parent SG resource with separate rule resources, to avoid drift.
- The `dynamic "ingress"` block correctly uses `ingress.value` (the default iterator name matches the dynamic block label) over a `list(number)`.

## Review Notes
- The AWS provider also offers newer per-rule resources `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` (introduced in v5.x) that support tagging on individual rules. `aws_security_group_rule` is not deprecated and still fully supported, so the post's guidance remains correct, but a future revision could mention these as a more modern alternative.
- The `app` security group example references `aws_security_group.alb.id` which isn't defined in the snippet — this is acceptable in a focused example, but readers copy-pasting will need to define an `alb` security group separately.
- Allowing SSH (port 22) inbound is gated to `var.bastion_cidr` in the example, which is good practice; readers should still avoid `0.0.0.0/0` for SSH in production.
