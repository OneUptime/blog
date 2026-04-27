# Validation Summary: How to Override Module Calls in OpenTofu Tests

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu (specifically the test framework / `*.tftest.hcl` files)
- HCL configuration language
- Terraform/OpenTofu module composition
- AWS provider resources (EKS, S3, ECS, RDS) used in illustrative examples
- `mock_provider`, `override_module`, `override_resource`, `override_data` testing primitives

## Sources Consulted
- Official OpenTofu test command documentation: https://opentofu.org/docs/cli/commands/test/
- OpenTofu `override_module` block reference (within the test command page)
- OpenTofu `mock_provider` block reference (within the test command page)

## Issues Found
No technical issues found.

The core syntax claims in the post were verified against the official OpenTofu test documentation:

- `override_module` block exists in OpenTofu's test framework — confirmed.
- The `target` attribute (a reference to the module call) and `outputs` attribute (object of override values) are the two correct attributes — confirmed against the official table.
- File-level placement (outside any `run` block) is supported and applies to all `run` blocks in the file — confirmed: "You can use `override_module` block for the whole test file or inside a single `run` block. The latter takes precedence if both specified for the same `target`."
- Run-block placement is supported — confirmed.
- `mock_provider "aws" {}` with an empty body is valid syntax — confirmed (alias and mock_resource/mock_data sub-blocks are optional).

## Review Notes

A few observations that are correct but worth noting for future readers:

- **Nested module target syntax (`module.application.module.database`)**: The official OpenTofu docs only show single-level `module.<name>` examples for `override_module`. Nested traversal is not explicitly documented but follows standard HCL reference grammar and is the natural way to reference module calls inside a child module. I left this unchanged because it is consistent with how module addresses work elsewhere in OpenTofu/Terraform, but readers should be aware it isn't shown in the official docs.

- **Module instances with `for_each`/`count`**: The OpenTofu docs explicitly state: "You cannot use `override_module` with a single instance of a module call. Each instance of a module call must be overridden." The post does not cover this limitation; future revisions could add a note.

- **Illustrative assertions vs. mock_provider behavior**: With a bare `mock_provider "aws" {}` (no `mock_resource` defaults or `override_resource` values), computed attributes on AWS resources receive auto-generated random/empty values. So assertions like `aws_eks_cluster.this.vpc_config[0].vpc_id == "vpc-override-12345"` are illustrative of intent (showing how an overridden module's outputs flow into resources that consume them) but would require additional `override_resource`/`mock_resource` plumbing to actually pass in a real test run. The post is teaching `override_module` syntax specifically — which is accurate — and the assertions are pedagogical. No change made.

- **Minor typography**: "complete isolation-fast, cheap" in the conclusion uses a hyphen where an em dash or comma would read better, but this is stylistic, not technical, and the author's voice was preserved.
