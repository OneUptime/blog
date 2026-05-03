# Validation Summary: How to Create VPC Security Groups for IPv4 with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC)
- AWS VPC
- AWS Security Groups
- AWS Provider for Terraform/OpenTofu (`hashicorp/aws`)
- IPv4 networking / CIDR blocks

## Sources Consulted
- Terraform AWS provider docs: `aws_security_group` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group)
- Terraform AWS provider docs: `aws_vpc_security_group_ingress_rule` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_security_group_ingress_rule)
- Terraform AWS provider docs: `aws_vpc_security_group_egress_rule` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_security_group_egress_rule)
- AWS docs: Security groups for your VPC (https://docs.aws.amazon.com/vpc/latest/userguide/vpc-security-groups.html)
- OpenTofu documentation (https://opentofu.org/docs/)

## Issues Found
No technical issues found.

- The `aws_security_group` block uses correct attributes (`name`, `description`, `vpc_id`, inline `ingress`/`egress`, `tags`).
- Inline rule attribute names (`from_port`, `to_port`, `protocol`, `cidr_blocks`, `security_groups`) are correct.
- The newer per-rule resources (`aws_vpc_security_group_ingress_rule` / `aws_vpc_security_group_egress_rule`) correctly use `ip_protocol` and `cidr_ipv4` (note: these are intentionally different from the inline-block argument names — the post's snippets reflect the actual API).
- `protocol = "-1"` (or `ip_protocol = "-1"`) for "all protocols" is correct, and omitting `from_port`/`to_port` is allowed for the egress rule when the protocol is `-1`.
- The stateful behavior claim is accurate: AWS security groups are stateful, so return traffic for allowed connections is automatically permitted.
- Referencing another security group via `security_groups = [aws_security_group.web.id]` in an inline ingress block is the correct pattern.

## Review Notes
- The first snippet uses inline `ingress`/`egress` blocks while the second uses the newer per-rule resources. AWS / HashiCorp generally recommend the per-rule resources for new code because they avoid full-rule replacement on plan diffs and let multiple modules manage rules on a shared SG. The post mentions this benefit ("can be managed independently") but does not flag it as the preferred approach — worth highlighting in a future revision.
- Mixing inline rule blocks and `aws_vpc_security_group_*_rule` resources on the same security group is not supported and will cause perpetual diffs; not done in this post, but worth a future caveat.
- `var.admin_cidr` is referenced but not declared in the snippet — readers will need a corresponding `variable "admin_cidr"` block. This is conventional for tutorial brevity and not a technical error.
