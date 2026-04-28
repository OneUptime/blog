# Validation Summary: How to Validate IP Addresses with cidrcontains in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- OpenTofu (`cidrcontains` function, variable validation, lifecycle preconditions, `terraform_data`)
- HCL (HashiCorp Configuration Language)
- AWS provider resources (`aws_vpc`, `aws_subnet`, `aws_security_group_rule`, `aws_vpc_peering_connection`)
- CIDR notation / RFC 1918 private address space
- Networking concepts (VPCs, subnets, NAT gateways, security groups, VPC peering)

## Sources Consulted
- [OpenTofu cidrcontains Function documentation](https://opentofu.org/docs/language/functions/cidrcontains/)
- [OpenTofu Functions index](https://opentofu.org/docs/language/functions/)
- [OpenTofu Input Variables documentation](https://opentofu.org/docs/language/values/variables/)
- [OpenTofu Custom Conditions documentation](https://opentofu.org/docs/language/expressions/custom-conditions/)
- [OpenTofu Issue #1336 — Cross-variable references in validation blocks](https://github.com/opentofu/opentofu/issues/1336)
- [RFC 1918 — Private IPv4 address ranges](https://datatracker.ietf.org/doc/html/rfc1918)

## Issues Found
No technical issues found.

The post correctly uses the `cidrcontains` function with the documented argument order `cidrcontains(prefix, address)`. All IP arithmetic claims were verified:

- `10.0.5.42` is within `10.0.0.0/16` → true ✓
- `192.168.1.1` is not within `10.0.0.0/16` → false ✓
- `172.31.0.0/16` is within `172.16.0.0/12` → true ✓ (RFC 1918)
- `172.31.5.0/24` is within `172.31.0.0/16` → true ✓
- `192.168.0.100/32` is within `192.168.0.0/24` → true ✓
- `203.0.113.0/24` (TEST-NET-3) is not within any RFC 1918 range → correctly flagged as untrusted ✓
- All four `10.100.x.0/24` subnets are contained in `10.100.0.0/16` ✓

The function correctly accepts both plain IP addresses and CIDR prefixes as the second argument, matching the official documentation. The use of `anytrue([...])` for membership-in-multiple-ranges is idiomatic and correct.

## Review Notes
- **Cross-variable references in validation blocks**: The `nat_gateway_ip` variable's validation references `var.vpc_cidr` (a different variable). This pattern was not allowed in early OpenTofu versions but was implemented per OpenTofu issue #1336 and is supported in OpenTofu 1.9+. Readers on older versions of OpenTofu (or older Terraform OSS) may see "Variable validation conditions cannot refer to other variables" errors and would need to use `check` blocks or `precondition` blocks as an alternative.
- **`terraform_data` resource**: Available in OpenTofu from its initial release and Terraform 1.4+. The `precondition` lifecycle block usage for fail-early validation is idiomatic.
- **Function availability**: `cidrcontains` is documented as available across OpenTofu v1.6.x through v1.11.x in the docs sidebar, so the post's examples will work on any reasonably current OpenTofu install. (Note: this function is not available in HashiCorp Terraform — it is OpenTofu-specific. The post's title/tags include both, but readers using upstream Terraform will not have access to this function.)
- The example resources reference `aws_security_group.app` and `aws_vpc.main` / `aws_vpc.peer` without showing their declarations, but this is normal for tutorial snippets focused on a specific function.
