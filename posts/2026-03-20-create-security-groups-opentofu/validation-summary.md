# Validation Summary: How to Create Security Groups with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC tool)
- Terraform HCL syntax
- AWS Security Groups (`aws_security_group`)
- AWS Security Group Rules (`aws_security_group_rule`)
- AWS VPC networking
- HCL dynamic blocks
- HCL lifecycle meta-arguments

## Sources Consulted
- Terraform AWS Provider documentation for `aws_security_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Terraform AWS Provider documentation for `aws_security_group_rule`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group_rule
- OpenTofu language documentation: https://opentofu.org/docs/language/
- HCL `dynamic` block reference: https://opentofu.org/docs/language/expressions/dynamic-blocks/
- HCL `lifecycle` meta-argument reference: https://opentofu.org/docs/language/meta-arguments/lifecycle/
- AWS VPC Security Groups documentation: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-security-groups.html

## Issues Found
No technical issues found.

All code examples are syntactically correct and use valid arguments per the Terraform AWS provider:
- Inline `ingress`/`egress` blocks within `aws_security_group` use the correct attribute names (`from_port`, `to_port`, `protocol`, `cidr_blocks`, `description`, `security_groups`, `self`).
- `aws_security_group_rule` correctly uses `type`, `security_group_id`, and `source_security_group_id`.
- `protocol = "-1"` (all protocols) with `from_port = 0` and `to_port = 0` is the canonical "all traffic" specification.
- The `lifecycle { ignore_changes = [ingress, egress] }` pattern is a recognized approach for combining a security group resource with separate `aws_security_group_rule` resources to avoid rule conflicts.
- The `dynamic "ingress"` block correctly uses the default iterator name (`ingress.value`) matching the block label.
- Self-reference via `self = true` is valid.
- The tiered ALB → App → DB pattern with `security_groups = [aws_security_group.X.id]` is correct.

## Review Notes
- The `aws_security_group_rule` resource is still fully supported, but the AWS provider also offers the newer `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` resources (introduced in provider v5.x) which are recommended for new code as they avoid some of the perpetual-diff issues of the older resource. This is not an error in the post — `aws_security_group_rule` remains valid — but a future revision could mention the newer resources as an alternative.
- The `cluster` security group example defines only an ingress rule and no egress rule. AWS creates a default "allow all egress" rule on new SGs, but Terraform/OpenTofu will remove that default rule on first apply when no `egress` block is declared. This is a deliberate behavior of the provider; the example is technically correct but readers may want to add an explicit egress block if they need outbound traffic from cluster nodes.
- The post does not show provider/version configuration, but that is consistent with other posts in this series and out of scope for a security-group-focused tutorial.
