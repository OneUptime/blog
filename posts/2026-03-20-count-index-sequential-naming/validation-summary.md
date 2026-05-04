# Validation Summary: How to Use count.index for Sequential Naming in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu / Terraform
- HCL (HashiCorp Configuration Language)
- `count` meta-argument and `count.index`
- AWS provider resources (`aws_subnet`, `aws_instance`, `aws_availability_zones`)
- HCL built-in functions (`cidrsubnet`, `tostring`, `format`)
- Splat operator (`[*]`)

## Sources Consulted
- OpenTofu language docs — count meta-argument: https://opentofu.org/docs/language/meta-arguments/count/
- Terraform/OpenTofu `cidrsubnet` function reference: https://opentofu.org/docs/language/functions/cidrsubnet/
- Terraform/OpenTofu `format` function reference: https://opentofu.org/docs/language/functions/format/
- Terraform/OpenTofu `tostring` function reference: https://opentofu.org/docs/language/functions/tostring/
- Terraform/OpenTofu splat expressions: https://opentofu.org/docs/language/expressions/splat/
- AWS provider `aws_availability_zones` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/availability_zones
- AWS provider `aws_subnet` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/subnet
- AWS provider `aws_instance` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance

## Issues Found
No technical issues found.

All examples are syntactically valid HCL:
- `count.index` is correctly described as 0-based.
- `cidrsubnet(prefix, newbits, netnum)` arguments are used correctly.
- `format("node-%03d", count.index + 1)` correctly produces zero-padded 3-digit names (`node-001`, `node-002`, ... `node-010`).
- Splat operator `aws_instance.web[*].private_ip` and indexed access `aws_instance.web[0].private_ip` are valid for `count`-based resources (which produce a list).
- The `data.aws_availability_zones.available.names[count.index]` indexing pattern is correct.
- The `count` vs `for_each` guidance (use `for_each` for resources keyed by stable identifiers, `count` for identical N copies) aligns with HashiCorp/OpenTofu best practices.

## Review Notes
- The post correctly notes that splat works on `count`-based resources. Worth keeping in mind that splat is not suitable for `for_each` resources (which produce a map, not a list) — a future enhancement could mention `values()` for the map case, but this is out of scope for this post.
- When using `count` with `data.aws_availability_zones.available.names[count.index]`, callers should be aware the AZ list length depends on the region; if `count` exceeds the available AZs, the apply will fail. The post’s example uses `count = 3` which is safe in most AWS regions but could be worth flagging for completeness.
- No version-specific caveats — `count`, `count.index`, splat, `cidrsubnet`, `format`, and `tostring` have been stable across both Terraform and OpenTofu releases.
