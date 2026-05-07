# Validation Summary: How to Avoid Overly Complex Expressions in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS provider examples for OpenTofu/Terraform-compatible configuration

## Sources Consulted
- OpenTofu Local Values: https://opentofu.org/docs/language/values/locals/
- OpenTofu For Expressions: https://opentofu.org/docs/language/expressions/for/
- OpenTofu `one` function: https://opentofu.org/docs/language/functions/one/
- OpenTofu `element` function: https://opentofu.org/docs/language/functions/element/
- OpenTofu `formatdate` function: https://opentofu.org/docs/language/functions/formatdate/
- OpenTofu `timestamp` function: https://opentofu.org/docs/language/functions/timestamp/
- OpenTofu `enabled` meta-argument (v1.11): https://opentofu.org/docs/v1.11/language/meta-arguments/enabled/
- Terraform Registry `aws_subnets` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/subnets
- Terraform Registry `aws_security_group_rule` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group_rule
- Terraform Registry `aws_shield_protection` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/shield_protection
- AWS security group rule documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/security-group-rules.html
- AWS `SecurityGroupRuleDescription` API reference: https://docs.aws.amazon.com/fms/2018-01-01/APIReference/API_SecurityGroupRuleDescription.html

## Issues Found
- The OpenTofu 1.11 `enabled` example used the wrong syntax. The post showed `enabled = local.should_enable_shield` directly in the resource block, but OpenTofu 1.11 documents `enabled` as a meta-argument inside a `lifecycle` block. I corrected the commented example to:

```hcl
# lifecycle {
#   enabled = local.should_enable_shield
# }
```

- The port-validation examples incorrectly excluded port `65535`. AWS documentation allows port values up to `65535`, so I changed both filters from `< 65535` to `<= 65535`.

## Review Notes
- The post is technically sound after the fixes above.
- The `timestamp()` call in the intentionally "bad" tag example is valid syntax, but OpenTofu documents that using `timestamp()` directly in resource attributes causes a new diff on every run. In this post that is acceptable because the example is explicitly presented as an anti-pattern.
- The `enabled` alternative is version-specific to OpenTofu 1.11 and later. Earlier versions should continue using `count` or `for_each`.
