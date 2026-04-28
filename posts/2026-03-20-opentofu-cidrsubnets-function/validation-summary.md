# Validation Summary: How to Use the cidrsubnets Function in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- OpenTofu (cidrsubnets function)
- HCL (HashiCorp Configuration Language)
- Terraform (compatible function)
- CIDR / IP subnetting
- VPC / network design patterns (AWS-style public/private subnets, Kubernetes cluster networks)

## Sources Consulted
- Official OpenTofu documentation for `cidrsubnets`: https://opentofu.org/docs/language/functions/cidrsubnets/
- Manual verification of CIDR arithmetic for each example (subnet base addresses, prefix length, and packing/alignment)

## Issues Found
No technical issues found.

Verified examples:
- `cidrsubnets("10.0.0.0/16", 8, 8, 8)` → `["10.0.0.0/24", "10.0.1.0/24", "10.0.2.0/24"]` — correct.
- `cidrsubnets("10.0.0.0/16", 4, 4, 8, 8)` → `["10.0.0.0/20", "10.0.16.0/20", "10.0.32.0/24", "10.0.33.0/24"]` — correct (the /24 starts at 10.0.32.0 because the previous /20 ended at 10.0.31.255).
- `cidrsubnets("10.0.0.0/16", 8, 8, 8, 8, 8, 8)` slicing yields the listed public/private /24s — correct.
- Tiered network with `4, 4, 4, 8, 8` yields `/20` at 10.0.0.0, 10.0.16.0, 10.0.32.0, then `/24` at 10.0.48.0 and 10.0.49.0 — correct (the /24 must align after the third /20 which ends at 10.0.47.255).
- `cidrsubnets("192.168.0.0/24", 2, 2)` → `["192.168.0.0/26", "192.168.0.64/26"]` — correct.
- Kubernetes example with parent `/14` and `2, 2, 4` → `10.0.0.0/16`, `10.1.0.0/16`, `10.2.0.0/18` — correct (each /16 occupies 65,536 addresses; the third subnet aligns at the /18 boundary 10.2.0.0).
- Syntax description (`prefix`, `newbits...`, returns list of CIDR strings) matches the official documentation.
- Use of the splat-expansion `local.newbits...` to pass a dynamic list as variadic args is valid HCL.
- `slice(list, start, end)` semantics (start inclusive, end exclusive) used in the public/private split are correct.
- The `tofu console` REPL command is valid OpenTofu CLI usage.

## Review Notes
- The post is concise and the comparison with `cidrsubnet` (single subnet) vs `cidrsubnets` (multiple subnets) is accurate.
- All examples use IPv4. The function also supports IPv6, which is not mentioned but is outside the stated scope of the post.
- The function will return an error if the requested newbits would exceed the parent prefix capacity; this edge case is not called out, but the post does not claim to be exhaustive.
