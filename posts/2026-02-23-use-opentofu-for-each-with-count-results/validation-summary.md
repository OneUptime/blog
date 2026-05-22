# Validation Summary: How to Use OpenTofu for_each with Count Results

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- Terraform
- HCL
- AWS provider resources
- OpenTofu/Terraform `for_each`, `count`, and `state mv`

## Sources Consulted
- OpenTofu `for_each` meta-argument documentation: https://opentofu.org/docs/language/meta-arguments/for_each/
- OpenTofu `count` meta-argument documentation: https://opentofu.org/docs/language/meta-arguments/count/
- OpenTofu references to named values documentation: https://opentofu.org/docs/language/expressions/references/
- OpenTofu `state mv` command documentation: https://opentofu.org/docs/cli/commands/state/mv/
- Terraform `for_each` meta-argument documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- Terraform `state mv` command documentation: https://developer.hashicorp.com/terraform/cli/commands/state/mv
- AWS provider `aws_vpc_security_group_ingress_rule` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_security_group_ingress_rule

## Issues Found
- The post incorrectly claimed Terraform cannot use `for_each` with resources created by `count` and that OpenTofu has a special improvement for this. Updated the explanation to state the accurate rule: OpenTofu and Terraform require `for_each` keys to be known at plan time, while unknown resource attributes can be used in normal arguments or map values.
- The initial failing example used index keys, which is a valid key-known pattern. Changed the failing example to use `subnet.id` as the `for_each` key, which accurately demonstrates the plan-time unknown key error.
- The "OpenTofu's Solution" section described a non-existent OpenTofu-only feature. Reworded it as the correct key-known pattern that works in both OpenTofu and Terraform.
- The security group rule example used `aws_security_group_rule`. Updated it to the current best-practice `aws_vpc_security_group_ingress_rule` syntax with `cidr_ipv4` and `ip_protocol`.
- The Route 53 example produced names like `app-app-0.internal.example.com` because `each.key` already included the `app-` prefix. Changed it to use `${each.key}.internal.example.com`.
- The "dynamic blocks" section did not use dynamic blocks. Renamed it to describe related resources instead.
- The key stability guidance overstated the safety of index-based keys. Clarified that numeric index keys are valid only when source ordering is stable and that meaningful keys are preferred when available.

## Review Notes
The local `tofu` and `terraform` CLIs were not installed in the review environment, so validation was performed against official documentation rather than local `validate` runs.
