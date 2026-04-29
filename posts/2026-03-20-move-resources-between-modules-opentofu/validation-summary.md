# Validation Summary: How to Move Resources Between Modules Using moved Blocks in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (`tofu` CLI)
- HCL (HashiCorp Configuration Language)
- `moved` blocks for state refactoring
- Terraform/OpenTofu module system (root, child, sibling, nested, `for_each` modules)
- AWS provider resources used as examples (`aws_security_group`, `aws_lb`, `aws_subnet`, `aws_s3_bucket`)

## Sources Consulted
- OpenTofu refactoring docs: https://opentofu.org/docs/language/modules/develop/refactoring/
- OpenTofu JSON plan output format: https://opentofu.org/docs/internals/json-format/
- Spacelift article on Terraform moved block (cross-reference for plan output wording): https://spacelift.io/blog/terraform-moved-block
- Scalr learning center article on moved blocks: https://scalr.com/learning-center/terraform-moved-blocks-refactoring-without-pain/

## Issues Found
- **Inconsistent plan output direction in the "Verifying the Move" section.** The post's primary example demonstrates moving a resource *INTO* `module.networking` (i.e., `from = aws_security_group.web` → `to = module.networking.aws_security_group.web`), but the example plan output showed `# module.networking.aws_security_group.web has moved to aws_security_group.web`, which describes the opposite direction (moving OUT of the module). Updated the example output to `# aws_security_group.web has moved to module.networking.aws_security_group.web` so it matches the move direction the reader is being shown.

## Review Notes
- The `moved` block syntax (no labels, only `from` and `to` arguments using bare resource addresses without quotes) is correct per the OpenTofu refactoring documentation.
- The address formats for root-level, single-module, nested-module, sibling-module, `for_each` resources (`name["key"]`), and `for_each` module instances (`module.name["key"].resource`) are all syntactically correct.
- Placement guidance (putting the `moved` block in the root configuration when moving a resource into a child module that is called from root) is consistent with OpenTofu's refactoring guidance — `moved` blocks live alongside the module call that contains the destination.
- `tofu plan`, `tofu state list`, and `tofu state show` are all valid OpenTofu CLI commands.
- The post does not mention OpenTofu version requirements — `moved` blocks have been supported since the OpenTofu 1.6 release (forked from Terraform 1.1+ behavior). Adding a version note could help readers but is not a technical error.
- The post does not warn about cross-state moves (e.g., when `from`/`to` are in different state files); this is out of scope for the topic but worth noting for future expansion.
