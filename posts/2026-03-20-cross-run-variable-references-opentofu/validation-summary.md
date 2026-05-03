# Validation Summary: How to Use Cross-Run Variable References in OpenTofu Tests - Opentofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (tofu test framework)
- HCL `.tftest.hcl` test files
- Terraform testing concepts (inherited by OpenTofu from Terraform 1.6+)
- AWS provider resources used as illustrative examples (VPC, EC2, RDS, ECS, Route53, S3)

## Sources Consulted
- OpenTofu CLI test command docs: https://opentofu.org/docs/cli/commands/test/
- OpenTofu language tests reference: https://opentofu.org/docs/language/tests/
- Terraform testing documentation (since OpenTofu inherited the framework): https://developer.hashicorp.com/terraform/language/tests

## Issues Found
- **Misleading section intro fixed.** The original section "Referencing Outputs vs Attributes" began with the line "You can reference both `output` values and plan-time resource attributes," which contradicted the post's own (correct) Limitations note that cross-run references only work for outputs. Per the official docs, you cannot reach into another run's state for raw resource attributes — you must declare an output. The code example itself was already correct (both references in it were outputs), so the fix was renaming the section to "Exposing Resource Attributes Through Outputs" and replacing the intro sentence with an accurate description: outputs are the only cross-run reference path, and a module output can itself expose a resource attribute.

## Review Notes
- The `run.<run_name>.<output_name>` syntax, the `module { source = ... }` block inside a run, the label-less `variables { }` block, the use of `output.<name>` in same-run asserts, and the use of direct resource references (e.g., `aws_instance.web.subnet_id`) inside same-run asserts are all valid per official documentation.
- State persistence between runs is correctly described for the common case. A subtle nuance not covered by the post: when a run uses an alternate `module { source = ... }` block, that run executes against a *separate* state from runs without a module override. The post's examples show every run with its own `module` block, which would in fact mean each run has its own state — but the post's narrative still works because cross-run *output* references function across these separate states. Not an error, but a reader-facing nuance worth mentioning in a future revision.
- The first example mixes a `module`-overridden run (`create_vpc` against `./modules/networking`) with a non-overridden run (`create_ec2_in_vpc` referencing `aws_instance.web` in the root module). This is syntactically valid but slightly awkward as an introductory example.
- Tags include "Opentofu" in the title with the unusual capitalization preserved from the source — left untouched as it is stylistic.
