# Validation Summary: How to Refactor Monolithic Configurations into Modules in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- OpenTofu modules
- OpenTofu `moved` refactoring blocks
- OpenTofu CLI (`tofu init`, `tofu plan`, `tofu apply`)
- HCL configuration

## Sources Consulted
- OpenTofu Refactoring docs: https://opentofu.org/docs/language/modules/develop/refactoring/
- OpenTofu Module Blocks docs: https://opentofu.org/docs/language/modules/syntax/
- OpenTofu Modules docs: https://opentofu.org/docs/language/modules/
- OpenTofu Resource Addressing docs: https://opentofu.org/docs/cli/state/resource-addressing/
- OpenTofu `state mv` command docs: https://opentofu.org/docs/cli/commands/state/mv/
- OpenTofu Standard Module Structure docs: https://opentofu.org/docs/language/modules/develop/structure/

## Issues Found
- The post moved resources into child modules and then proceeded directly to `tofu plan`/`tofu apply`. OpenTofu's module block documentation requires re-running `tofu init` after adding, removing, or modifying `module` blocks, so I added that instruction.
- The comment `# ... one moved block per resource` was too broad. OpenTofu allows a `moved` block to address a whole resource, which can cover all instances, or a specific resource instance when keys or indexes are involved. I corrected the wording to `resource or resource instance whose address changes`.

## Review Notes
- The overall migration approach is technically sound: moving resources into local child modules and mapping old root addresses to `module.<name>.<resource>` addresses with `moved` blocks is supported by OpenTofu.
- The example resource addresses such as `module.networking.aws_vpc.main` and `aws_subnet.public["us-east-1a"]` are consistent with OpenTofu's resource-addressing rules.
- OpenTofu CLI was not installed in this workspace, so command validation relied on official OpenTofu documentation rather than local `tofu --help` output.
