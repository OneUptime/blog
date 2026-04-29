# Validation Summary: How to Use Map Variables in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS provider resources used in examples

## Sources Consulted
- OpenTofu input variables documentation: https://opentofu.org/docs/language/values/variables/
- OpenTofu type constraints documentation: https://opentofu.org/docs/language/expressions/type-constraints/
- OpenTofu `lookup` function documentation: https://opentofu.org/docs/language/functions/lookup/
- OpenTofu `keys` function documentation: https://opentofu.org/docs/language/functions/keys/
- OpenTofu `values` function documentation: https://opentofu.org/docs/language/functions/values/
- OpenTofu `merge` function documentation: https://opentofu.org/docs/language/functions/merge/
- OpenTofu `contains` function documentation: https://opentofu.org/docs/language/functions/contains/
- OpenTofu `for` expressions documentation: https://opentofu.org/docs/language/expressions/for/
- OpenTofu `for_each` meta-argument documentation: https://opentofu.org/docs/v1.11/language/meta-arguments/for_each/
- OpenTofu custom conditions documentation: https://opentofu.org/docs/language/expressions/custom-conditions/
- AWS provider `aws_vpc` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc
- AWS provider `aws_security_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- AWS provider `aws_security_group_rule` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group_rule
- AWS provider `aws_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance

## Issues Found
- The `Lookup Pattern` example assigned `instance_type` twice inside the same `aws_instance` resource. That is invalid HCL because an argument can only be set once. I changed the direct index example into a commented alternative and left the `lookup()` example as the active configuration.
- The `Using for_each with Maps` example referenced `aws_security_group.main.id` without defining `aws_security_group.main` anywhere in the post. I added a minimal `aws_security_group` resource so the example is internally consistent.

## Review Notes
- The `aws_security_group_rule` example is still valid, but current AWS provider guidance recommends `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` for new security group rule configurations.
- The AMI value in the `aws_instance` example is illustrative and real AMI IDs are region-specific.
