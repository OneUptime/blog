# Validation Summary: How to Handle CIDR Block Conflicts in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL, built-in functions, input variable validation)
- AWS VPC
- AWS VPC IPAM (IP Address Manager) — hierarchical pools, allocation constraints
- CIDR / IP address math (RFC 1918 private ranges, subnet sizing)

## Sources Consulted
- [Terraform built-in functions index](https://developer.hashicorp.com/terraform/language/functions)
- [Terraform `cidrsubnet` function](https://developer.hashicorp.com/terraform/language/functions/cidrsubnet)
- [Terraform `cidrhost` function](https://developer.hashicorp.com/terraform/language/functions/cidrhost)
- [Terraform CHANGELOG (main)](https://github.com/hashicorp/terraform/blob/main/CHANGELOG.md)
- [HashiCorp GitHub issue #33111 — feature request for `cidrcontains`](https://github.com/hashicorp/terraform/issues/33111)
- [Yantrio/tfutils provider — provider-defined `cidrcontains`](https://registry.terraform.io/providers/Yantrio/tfutils/latest/docs/functions/cidrcontains)
- [AWS IPAM quotas](https://docs.aws.amazon.com/vpc/latest/ipam/quotas-ipam.html)
- [AWS `IpamPool` API reference](https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_IpamPool.html)
- [AWS — Allocate CIDRs from an IPAM pool](https://docs.aws.amazon.com/vpc/latest/ipam/allocate-cidrs-ipam.html)
- Terraform AWS provider docs for `aws_vpc_ipam`, `aws_vpc_ipam_pool`, `aws_vpc_ipam_pool_cidr`, `aws_vpc`, and `aws_vpc_ipv4_cidr_block_association`

## Issues Found
1. **`cidrcontains` is not a built-in Terraform function.** The original post included a code block annotated `# Verify no conflicts with cidrcontains (Terraform 1.7+)` and called `cidrcontains(...)` to detect overlap between a proposed VPC CIDR and on-premises ranges. Terraform core only ships four CIDR functions (`cidrhost`, `cidrnetmask`, `cidrsubnet`, `cidrsubnets`). `cidrcontains` was proposed as a feature request (hashicorp/terraform#33111) but has not been added to core. It only exists as a provider-defined function in third-party providers such as Yantrio/tfutils, which require Terraform 1.8+ and a provider declaration. Wrapping the call in `can(...)` does not rescue it either — an unknown top-level function fails at parse/evaluation time before `can()` runs. The example as written would error on `terraform plan`. **Fix:** Replaced the broken example with a workable first-octet comparison and an explicit note that Terraform core does not include a CIDR-overlap function, pointing readers toward provider-defined functions or upfront planning.

## Review Notes
- All `cidrsubnet(...)` examples were verified by hand. The signature `cidrsubnet(prefix, newbits, netnum)` and every commented result (e.g., `cidrsubnet("10.0.0.0/16", 8, 0) == "10.0.0.0/24"`, `... 8, 10 == "10.0.10.0/24"`, `... 8, 22 == "10.0.22.0/24"`) are correct.
- The hierarchical IPAM allocation (root `10.0.0.0/8` → regional `10.0.0.0/12` → production `10.0.0.0/14`) is valid even though the regional pool has `allocation_min_netmask_length = 16`. AWS IPAM allocation rules apply to resource allocations from a pool, not to CIDRs provisioned into child pools — confirmed via AWS IPAM documentation.
- The `aws_vpc_ipam_pool_cidr` `depends_on` chain is needed because Terraform cannot otherwise infer that the parent pool must have its CIDR provisioned before a child pool's CIDR can be sourced from it.
- The `aws_vpc` `ipv4_ipam_pool_id` / `ipv4_netmask_length` argument names are correct (current AWS provider).
- The default VPC CIDR `172.31.0.0/16` claim is correct.
- Math sanity checks: `/12` = 2^20 = 1,048,576 IPs; `/20` = 2^12 = 4,096 IPs — both as stated.
- `startswith(...)` (used in the variable validation block) was promoted from `try`/string-functions to a first-class built-in in Terraform 1.5, well within the post's stated "Terraform 1.0 or later" prerequisite range — readers on the oldest supported version may need to upgrade to use that specific check. Minor caveat, not worth changing.
- Multiple `locals` blocks in the same module are merged, so referencing `local.onprem_cidrs` across blocks (as the example does) is valid.
