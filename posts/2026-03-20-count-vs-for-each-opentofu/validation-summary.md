# Validation Summary: How to Choose Between count and for_each in OpenTofu - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OpenTofu (Terraform-compatible IaC tool)
- HashiCorp Configuration Language (HCL)
- `count` and `for_each` meta-arguments
- AWS provider resources (`aws_instance`, `aws_eip`, `aws_s3_bucket`, `aws_subnet`)
- HCL functions: `toset`, `index`, `cidrsubnet`

## Sources Consulted
- OpenTofu official documentation — `count` meta-argument: https://opentofu.org/docs/language/meta-arguments/count/
- OpenTofu official documentation — `for_each` meta-argument: https://opentofu.org/docs/language/meta-arguments/for_each/
- Terraform AWS provider — `aws_eip` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eip
- AWS provider v5.0.0 release / PR #31567 deprecating `vpc` on `aws_eip`
- AWS provider v6.0.0 release / PR #42340 removing the `vpc` argument

## Issues Found
- **`aws_eip` `vpc = true` argument is deprecated/removed.** The conditional resource example used the legacy `vpc = true` attribute. This was deprecated in AWS provider v5.0.0 (May 2023) and fully removed in v6.0.0 (June 2025). As of the validation date the current AWS provider rejects it with an unsupported-argument error. Replaced `vpc = true` with `domain = "vpc"`, matching the current official `aws_eip` documentation example.

## Review Notes
- All other technical claims verified accurate: zero-based `count.index`, key-stable `for_each` behavior, the destroy/recreate re-indexing problem with `count`, the requirement that `for_each` accept a map or set (not a list), and the use of `toset()` to convert a list of strings.
- Resource address syntax (`aws_instance.web[0]` for `count`, `aws_instance.app["web"]` for `for_each`) is correct.
- The comparison table's "Conditional resource: No" row for `for_each` is a reasonable simplification — `for_each` can technically be conditional via `for_each = var.enabled ? toset(["x"]) : toset([])`, but `count = var.enabled ? 1 : 0` is the canonical idiom, so the post's framing is fine.
- The `cidrsubnet(aws_vpc.main.cidr_block, 8, index(var.availability_zones, each.key))` pattern works but is somewhat unusual — readers may want to consider passing the subnet bits explicitly via a map. Not a correctness issue.
