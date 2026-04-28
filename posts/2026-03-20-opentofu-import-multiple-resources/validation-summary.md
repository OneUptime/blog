# Validation Summary: How to Import Multiple Resources at Once in OpenTofu - Opentofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (CLI: `tofu`)
- Terraform (referenced in tags; uses compatible HCL configuration language)
- HCL (HashiCorp Configuration Language)
- AWS provider resources (VPC, subnet, security group, EC2, S3, IAM, internet gateway, route table)
- `import` blocks (introduced in Terraform 1.5 / OpenTofu 1.6)
- `for_each` on `import` blocks (introduced in OpenTofu 1.7)
- `tofu plan -generate-config-out` for configuration generation

## Sources Consulted
- [OpenTofu Import documentation](https://opentofu.org/docs/language/import/)
- [OpenTofu apply command documentation](https://opentofu.org/docs/cli/commands/apply/)
- [OpenTofu plan command documentation](https://opentofu.org/docs/cli/commands/plan/)
- [OpenTofu 1.7 release notes](https://opentofu.org/blog/opentofu-1-7-0-beta1/) — confirms `for_each` on import blocks
- [OpenTofu issue #2307 — `--target-file` feature request](https://github.com/opentofu/opentofu/issues/2307) — confirms `-target-file` is NOT an implemented flag
- [HCL native syntax specification](https://github.com/hashicorp/hcl/blob/v2.8.0/hclsyntax/spec.md) — confirms grammar rules for blocks and attributes

## Issues Found

1. **Invalid HCL syntax in "Organizing Imports by Service" section**: The section used single-line `import` blocks containing two attributes (`import { to = X id = "Y" }`). According to the HCL native syntax specification, the `OneLineBlock` production rule allows at most one attribute on a single line; attributes within a block body must otherwise be terminated by newlines. The single-line blocks with both `to` and `id` would produce a parse error. **Fix:** Rewrote each import block in the standard multi-line form.

2. **Non-existent `-target-file` flag in "Phased Import Strategy" section**: The post used `tofu apply -target-file=...txt`. This flag does not exist in OpenTofu — it is an unimplemented feature request (opentofu/opentofu#2307). The supported flag is `-target=ADDRESS`, which can be repeated. **Fix:** Replaced each `-target-file=...txt` invocation with explicit `-target=<resource_address>` flags appropriate for the phase being described.

## Review Notes
- The `for_each` example in "Batch Import with for_each" is correct for OpenTofu 1.7+. Note that as of OpenTofu 1.7, `-generate-config-out` is not supported in combination with `for_each` on import blocks; readers should still write the `resource` blocks themselves when using `for_each` (as the example demonstrates).
- The `// resources-to-import.json` line at the top of the JSON snippet is a documentation-style filename comment; standard JSON does not allow comments, but `jsondecode()` would only ever read the actual file contents, so this is a documentation convention rather than a technical error.
- The post does not specify a minimum OpenTofu version. Since `for_each` on `import` blocks requires OpenTofu 1.7+, mentioning version requirements in a future revision would help readers avoid confusion.
- The `-target` flag is a valid mechanism for phased imports, but the OpenTofu docs explicitly recommend it only for exceptional/recovery situations. The phased-import use case is reasonable, but readers should be aware of this guidance.
