# Validation Summary: How to Use Set Variables in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- HCL
- OpenTofu input variables and type constraints
- OpenTofu `for_each`
- OpenTofu collection and set functions
- AWS provider IAM policies
- AWS provider VPC security group ingress rules

## Sources Consulted
- OpenTofu `for_each` meta-argument documentation: https://opentofu.org/docs/v1.11/language/meta-arguments/for_each/
- OpenTofu type constraints documentation: https://opentofu.org/docs/language/expressions/type-constraints/
- OpenTofu input variables documentation: https://opentofu.org/docs/language/values/variables/
- OpenTofu `toset` function documentation: https://opentofu.org/docs/language/functions/toset/
- OpenTofu `tolist` function documentation: https://opentofu.org/docs/language/functions/tolist/
- OpenTofu `contains` function documentation: https://opentofu.org/docs/language/functions/contains/
- OpenTofu set function documentation: https://opentofu.org/docs/language/functions/setintersection/, https://opentofu.org/docs/language/functions/setsubtract/, https://opentofu.org/docs/language/functions/setunion/
- OpenTofu `sort` function documentation: https://opentofu.org/docs/language/functions/sort/
- AWS provider `aws_iam_policy` documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/iam_policy.html.markdown
- AWS provider VPC security group ingress rule documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/vpc_security_group_ingress_rule.html.markdown

## Issues Found
- The post implied that any set can be used directly with resource `for_each`. OpenTofu documents `for_each` as accepting a map or a set of strings, so I narrowed the direct claim to sets of strings.
- The security group example used `for_each = var.allowed_ports` with `var.allowed_ports` declared as `set(number)`. This is invalid for direct `for_each`, so I changed it to a map expression with string keys: `{ for port in var.allowed_ports : tostring(port) => port }`.
- The security group example used `aws_security_group_rule`. The AWS provider documentation recommends `aws_vpc_security_group_ingress_rule` as the current best practice for ingress rules, so I updated the example to use that resource and its `ip_protocol` and `cidr_ipv4` arguments.
- A comment described the set operations as "using for expressions" even though the code used built-in set functions. I corrected the comment to "using built-in functions."

## Review Notes
The OpenTofu and Terraform CLIs were not installed in this workspace, so the review was performed against official OpenTofu documentation and AWS provider documentation rather than local CLI validation. The example CIDR `0.0.0.0/0` is syntactically valid, but production configurations should restrict inbound traffic to the smallest practical source range.
