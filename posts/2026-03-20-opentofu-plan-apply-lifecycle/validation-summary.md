# Validation Summary: How to Explain OpenTofu Plan and Apply Lifecycle

## Status
validated

## Post Type
Tutorial / Conceptual Guide

## Technologies Covered
- OpenTofu (CLI)
- HCL (HashiCorp Configuration Language)
- Infrastructure as Code (IaC)
- AWS resources (used as examples in plan output and dependency graph)

## Sources Consulted
- OpenTofu CLI commands documentation: https://opentofu.org/docs/cli/commands/
- OpenTofu plan command: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu apply command: https://opentofu.org/docs/cli/commands/apply/
- OpenTofu destroy command: https://opentofu.org/docs/cli/commands/destroy/
- OpenTofu show command: https://opentofu.org/docs/cli/commands/show/
- OpenTofu language files documentation: https://opentofu.org/docs/language/files/
- OpenTofu JSON output format (for action symbol mapping): https://opentofu.org/docs/internals/json-format/

## Issues Found

1. **`-chdir` flag placement was incorrect.** The original post showed `tofu plan -chdir=environments/prod`, but `-chdir` is a global option that must be placed BEFORE the subcommand. Per the OpenTofu CLI docs ("Global options (use these before the subcommand, if any): `-chdir=DIR`"), the correct form is `tofu -chdir=environments/prod plan`. Fixed the example and added a brief inline note explaining that `-chdir` is a global flag.

## Review Notes

- The lifecycle stages described (Load Configuration → Initialize Providers → Refresh State → Build Dependency Graph → Calculate Diff → Output Plan) accurately reflect OpenTofu's plan/apply behavior.
- The plan output symbols (`+`, `-`, `~`, `-/+`, `<=`) match OpenTofu's human-readable diff output (inherited from Terraform-compatible behavior; underlying actions are documented in the JSON format reference).
- The `-parallelism` default of 10 is correct per the apply command documentation.
- `tofu apply -refresh-only` and `tofu plan -refresh=false` are both valid and behave as described.
- `tofu destroy -target=...` is valid; the official docs warn that `-target` should be used in exceptional circumstances only — the post does mention "use with caution" generally for destroy, which is reasonable.
- Minor caveat (not corrected, since the post's claim is still accurate): when both `.tf` and `.tofu` files share a base name in a directory, OpenTofu prioritizes the `.tofu` file and ignores the `.tf` file. The post does not need to call this out for a lifecycle overview, but readers mixing both extensions should be aware.
- The aws_s3_bucket example output uses `region = (known after apply)`, which is consistent with `region` being a computed attribute on the resource.
