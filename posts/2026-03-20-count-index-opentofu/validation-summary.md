# Validation Summary: How to Use count and count.index in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (HCL)
- Terraform-compatible AWS provider (`aws_instance`, `aws_subnet`, `aws_vpc`, `aws_eip`, `aws_nat_gateway`, `aws_ecs_service`, `aws_availability_zones`)
- HCL built-in functions (`cidrsubnet`, `length`, `toset`)
- Meta-arguments: `count`, `count.index`, `for_each`, `each.value`
- Splat expressions (`[*]`) and `for` expressions

## Sources Consulted
- OpenTofu docs — `count` meta-argument: https://opentofu.org/docs/language/meta-arguments/count/
- OpenTofu docs — `for_each` meta-argument: https://opentofu.org/docs/language/meta-arguments/for_each/
- OpenTofu docs — `cidrsubnet` function: https://opentofu.org/docs/language/functions/cidrsubnet/
- OpenTofu docs — splat expressions: https://opentofu.org/docs/language/expressions/splat/
- AWS provider — `aws_eip`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eip (current `domain` attribute, deprecated `vpc`)
- AWS provider — `aws_subnet`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/subnet
- AWS provider — `aws_nat_gateway`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/nat_gateway
- AWS provider — `aws_availability_zones` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/availability_zones

## Issues Found
No technical issues found.

## Review Notes
- The `aws_eip` resource correctly uses `domain = "vpc"`, which is the current attribute (the older `vpc = true` is deprecated).
- The `cidrsubnet(prefix, newbits, netnum)` calls and the resulting CIDR comments (e.g., `10.0.1.0/24` from `cidrsubnet("10.0.0.0/16", 8, 1)`) are accurate.
- The cascading-replacement behavior described for `count` when removing a middle list item is correct: state addresses are index-keyed, so removing `"api"` shifts `"db"` from index 2 to 1, which would change the `name` (a force-new attribute on `aws_ecs_service`) and trigger replacement.
- The minimal `aws_ecs_service` examples omit normally-required arguments like `cluster` and `task_definition`. This is acceptable here because the snippets illustrate `count` vs `for_each` semantics, not a runnable ECS configuration.
- `output "first_instance_ip" { value = aws_instance.web[0].private_ip }` is valid; readers should remember that index access requires the resource to actually have that index (i.e., `count >= 1`).
