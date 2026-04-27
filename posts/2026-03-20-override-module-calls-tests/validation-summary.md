# Validation Summary: How to Override Module Calls in OpenTofu Tests - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- OpenTofu (`tofu test` command and `.tftest.hcl` test files)
- HCL (HashiCorp Configuration Language)
- Infrastructure as Code testing
- AWS resources used in examples (VPC, EKS, RDS, SSM Parameter, Security Group)

## Sources Consulted
- OpenTofu Test Command documentation: https://opentofu.org/docs/cli/commands/test/
- OpenTofu test file syntax / `override_module` block reference

## Issues Found
No technical issues found. All code examples and CLI commands match the official OpenTofu documentation:
- The `override_module` block correctly uses `target` (a reference to the module call) and `outputs` (an object of mock output values) — these are the documented required arguments.
- The block is correctly placed inside `run` blocks (the documentation confirms `override_module` can appear at the file level or within `run` blocks, with run-level definitions taking precedence).
- `command = plan` is a valid `command` value in a `run` block.
- The `tofu test -filter=tests/unit.tftest.hcl` invocation matches the documented `-filter=testfile` flag, which accepts paths relative to the working directory.
- `outputs` containing mixed types (strings, lists, numbers) is valid HCL and supported by the `override_module` outputs schema.
- The HCL configuration examples (module blocks, locals, resource blocks, variable interpolation) are syntactically correct.

## Review Notes
- The post's note in the "Nested Module Overrides" section ("Overrides are for the root configuration's direct module calls") is a reasonable, conservative phrasing. The OpenTofu documentation does not explicitly describe nested-module addressing semantics for `override_module`, so the post sensibly avoids over-claiming.
- One documented limitation worth being aware of (not contradicted by this post but worth noting for readers): `override_module` cannot target a single instance of a module call when `count`/`for_each` is used — every instance must be overridden. The post's examples don't use `count`/`for_each`, so this is not an issue here.
- The author may consider mentioning that `override_module` blocks can also be placed at the test file (top) level for sharing across multiple `run` blocks, but this is a stylistic suggestion rather than a correctness issue.
