# Validation Summary: How to Calculate Subnet CIDR Blocks Programmatically in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (CIDR functions: `cidrsubnet`, `cidrhost`, `cidrcontains`)
- HCL (HashiCorp Configuration Language)
- AWS provider resources (`aws_vpc`, `aws_subnet`, `aws_vpc_security_group_ingress_rule`)
- `null_resource` with `lifecycle.postcondition`
- CIDR / IP addressing (RFC 4632)

## Sources Consulted
- [OpenTofu cidrsubnet function](https://opentofu.org/docs/language/functions/cidrsubnet/)
- [OpenTofu cidrhost function](https://opentofu.org/docs/language/functions/cidrhost/)
- [OpenTofu cidrcontains function](https://opentofu.org/docs/language/functions/cidrcontains/)
- [Terraform cidrhost - HashiCorp Developer](https://developer.hashicorp.com/terraform/language/functions/cidrhost)
- [Terraform cidrsubnet - HashiCorp Developer](https://developer.hashicorp.com/terraform/language/functions/cidrsubnet)
- [Terraform PR #13765 — adds negative hostnum support to cidrhost](https://github.com/hashicorp/terraform/pull/13765/files)

## Issues Found

### Issue 1 — Incorrect comments on hierarchical CIDR allocation in Step 2
**What was wrong:** The comments next to the environment subnet expressions claimed:

```hcl
production    = cidrsubnet(cidr, 4, 1)   # .1.0/20
staging       = cidrsubnet(cidr, 4, 2)   # .2.0/20
development   = cidrsubnet(cidr, 4, 3)   # .3.0/20
```

These results are mathematically impossible. When extending a /16 by `newbits = 4` to produce a /20, the 4 new bits populate the high-order 4 bits of the 3rd octet. So `netnum = 1` (binary `0001`) places `0001 0000` in the 3rd octet (= 16), `netnum = 2` produces 32, and `netnum = 3` produces 48. Additionally, `10.X.1.0/20`, `10.X.2.0/20`, and `10.X.3.0/20` are not even on valid /20 boundaries (the 3rd octet must be a multiple of 16 for a /20).

**What I changed:** Updated the inline comments to the correct CIDRs:

```hcl
production    = cidrsubnet(cidr, 4, 1)   # 10.X.16.0/20
staging       = cidrsubnet(cidr, 4, 2)   # 10.X.32.0/20
development   = cidrsubnet(cidr, 4, 3)   # 10.X.48.0/20
```

**Why:** The corrected values match the actual output of `cidrsubnet` per the OpenTofu specification of how `newbits` and `netnum` populate the new prefix bits.

## Review Notes
- All other code samples were verified against the OpenTofu function reference and produce the correct results:
  - `cidrsubnet("10.0.0.0/16", 8, i)` for `i` in 0..2 yields `10.0.0.0/24`, `10.0.1.0/24`, `10.0.2.0/24`.
  - `cidrsubnet("10.0.0.0/16", 8, i+10)` and `i+20` and `100` produce the documented `10.0.10/24`, `10.0.20/24`, `10.0.100/24` series.
  - `cidrsubnet("10.0.0.0/8", 8, n)` for n=1..3 yields the documented `10.1.0.0/16`, `10.2.0.0/16`, `10.3.0.0/16`.
- `cidrhost` with negative `hostnum` is documented behavior in both Terraform and OpenTofu (e.g., `cidrhost("10.0.1.0/24", -2)` returns `10.0.1.254`), so the example is correct.
- `cidrcontains` is a valid OpenTofu built-in function and the argument order (`prefix`, `ip-or-cidr`) is correct.
- The `aws_vpc_security_group_ingress_rule` resource and its `cidr_ipv4` / `ip_protocol` / `from_port` / `to_port` attributes are correct.
- Style note (not an error): `null_resource` with a `lifecycle.postcondition` works, but newer OpenTofu code typically uses the built-in `terraform_data` resource for the same purpose. Either is acceptable; I left the original because it's a stylistic preference, not a correctness issue.
