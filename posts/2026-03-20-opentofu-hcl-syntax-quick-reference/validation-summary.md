# Validation Summary: How to Use the OpenTofu HCL Syntax Quick Reference

## Status
validated

## Post Type
Reference / Quick Reference Guide

## Technologies Covered
- OpenTofu (1.11+)
- HCL (HashiCorp Configuration Language)
- Terraform AWS provider (resources used in examples: `aws_s3_bucket`, `aws_ami`, `aws_security_group_rule`, `aws_security_group`, `aws_instance`, `aws_subnet`)

## Sources Consulted
- [OpenTofu 1.11 — `enabled` meta-argument documentation](https://opentofu.org/docs/v1.11/language/meta-arguments/enabled/)
- [OpenTofu 1.11.0 release notes](https://opentofu.org/blog/opentofu-1-11-0/)
- [OpenTofu — `for_each` documentation](https://opentofu.org/docs/language/meta-arguments/for_each/)
- [OpenTofu — variable type constraints](https://opentofu.org/docs/language/expressions/type-constraints/)
- [Terraform AWS provider — `aws_security_group_rule`](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group_rule)
- [Terraform AWS provider — `aws_vpc_security_group_ingress_rule`](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_security_group_ingress_rule)

## Issues Found

1. **Incorrect placement of the `enabled` meta-argument.** The post showed `enabled = var.enable_feature` as a top-level resource argument. Per the OpenTofu 1.11 docs, `enabled` must be declared inside a `lifecycle` block. Replaced the snippet with a complete resource example showing `enabled` nested in `lifecycle { ... }`.

2. **Wrong argument name on `aws_security_group_rule`.** The post used `cidr_ipv4 = each.value`. The `aws_security_group_rule` resource does not accept `cidr_ipv4`; it takes `cidr_blocks` (a list of strings). The `cidr_ipv4` argument exists on the newer `aws_vpc_security_group_ingress_rule` resource, not on `aws_security_group_rule`. Changed to `cidr_blocks = [each.value]` and added the other required arguments (`security_group_id`, `from_port`, `to_port`, `protocol`) so the example would actually validate.

3. **Mislabeled `for_each` example.** A `for_each` example was commented "with a map" but the code used `toset(["dev", "staging", "prod"])` (a set). Updated the comment to "for_each with a set (converted from a list)" so it matches the code.

4. **Invalid HCL in the Type Constraints example.** The original `variable "examples"` block contained nine `type = ...` arguments. HCL allows only one `type` argument per `variable` block — the original snippet would fail to parse. Restructured the example into nine separate `variable` blocks, each demonstrating one valid type expression, while preserving the inline comments that name each type.

## Review Notes

- The placeholder syntax `backend "s3" { ... }` and `Statement = [...]` inside the JSON object are not strictly valid HCL but are clearly indicated as elision; they are conventional documentation shorthand and were left as-is.
- `var.app_name`, `var.region`, `var.vpc_cidr`, `var.aws_region`, `var.ingress_rules`, `var.allowed_cidrs`, `var.create_bucket`, `var.enable_feature`, etc. are referenced without definitions — acceptable for a syntax reference snippet.
- The post claims `required_version = ">= 1.8"` in the `terraform` block. This is valid syntax. OpenTofu 1.11 is the latest stable release as of the validation date; the minimum-version constraint is plausible.
- The `tofu fmt` command mentioned in the summary is correct (it is the OpenTofu equivalent of `terraform fmt`).
- Future-proofing: the post does not mention `aws_vpc_security_group_ingress_rule` / `aws_vpc_security_group_egress_rule`, which the AWS provider now recommends over the legacy `aws_security_group_rule`. This isn't an error, but readers writing new code should prefer the newer resources.
