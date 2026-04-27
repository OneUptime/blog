# Validation Summary: How to Use tofu show to Display State or Plan

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu (CLI: `tofu show`, `tofu plan`, `tofu state show`)
- Terraform (compatible CLI semantics)
- jq (JSON parsing in shell)
- AWS provider (used in example resources)

## Sources Consulted
- OpenTofu `tofu show` documentation: https://opentofu.org/docs/cli/commands/show/
- OpenTofu source docs on GitHub: https://github.com/opentofu/opentofu/blob/main/website/docs/cli/commands/show.mdx
- OpenTofu `tofu state show` documentation: https://opentofu.org/docs/cli/commands/state/show/
- OpenTofu `tofu plan` documentation: https://opentofu.org/docs/cli/commands/plan/
- Terraform JSON output format reference (compatible with OpenTofu): https://developer.hashicorp.com/terraform/internals/json-format

## Issues Found
- **Incorrect `-state=path` flag usage**: The post originally included `tofu show -state=backup.tfstate` to show a specific state file. In current OpenTofu, `-state` is a boolean target-selection flag (with no path argument); it selects the latest state snapshot rather than accepting a file path. The correct way to inspect a specific state file is to pass it as a positional argument. Fixed by changing the line to `tofu show backup.tfstate`, which uses OpenTofu's supported (legacy) positional-argument form that auto-detects whether the file is a state snapshot or saved plan.

## Review Notes
- The `region` attribute shown on `aws_s3_bucket.data` in the first example is valid for newer versions of the AWS Terraform/OpenTofu provider (v5.x+), where it became an exported attribute. Older provider versions may not surface this. This is fine for a current-day tutorial but is a version-specific detail worth being aware of.
- OpenTofu also supports newer explicit target-selection flags like `-plan=FILENAME` for showing saved plans (in addition to the positional-argument form used in the post). Both are valid; the post uses the simpler positional form, which remains supported.
- The JSON structure described (`.format_version`, `.resource_changes[]`, `.values.root_module.resources[]`, `.change.actions`, `.change.before`, `.change.after`) matches the documented Terraform/OpenTofu plan and state JSON format.
- All `jq` filters are syntactically valid and will work against the documented JSON output structure.
