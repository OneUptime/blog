# Validation Summary: How to Pass Variables via the CLI with -var in OpenTofu - Opentofu

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- OpenTofu (CLI: `tofu`)
- HCL input variables
- Bash scripting
- GitHub Actions (CI/CD example)
- Terraform-compatible `TF_VAR_` environment variable convention

## Sources Consulted
- OpenTofu — Input Variables: https://opentofu.org/docs/language/values/variables/
- OpenTofu — `tofu plan` (Input Variables on the Command Line): https://opentofu.org/docs/cli/commands/plan/
- OpenTofu — `tofu apply`: https://opentofu.org/docs/cli/commands/apply/
- OpenTofu — `tofu destroy`: https://opentofu.org/docs/cli/commands/destroy/
- OpenTofu — `tofu import`: https://opentofu.org/docs/cli/commands/import/
- OpenTofu — `tofu validate`: https://opentofu.org/docs/cli/commands/validate/
- OpenTofu — `tofu init`: https://opentofu.org/docs/cli/commands/init/

## Issues Found

1. **Incorrect variable precedence claim.** The post stated: `Precedence: -var > -var-file > .auto.tfvars > terraform.tfvars`. This is inaccurate — `-var` and `-var-file` have **equal** precedence, and when both are specified on the command line, the **last one specified wins** (left-to-right processing). The full precedence chain (highest to lowest) is also missing `TF_VAR_*` env vars at the bottom. Updated the comment to: `Precedence (highest to lowest): command-line -var/-var-file (last specified wins) > *.auto.tfvars > terraform.tfvars > TF_VAR_ env vars`. Also tweaked the inline comment for the example to read "later -var overrides…" since the override here is due to command-line order, not flag type.

2. **Incorrect claim that `-var` does not work with `tofu init` and `tofu validate`.** Unlike upstream Terraform, OpenTofu's `init` and `validate` commands **do** accept `-var` and `-var-file`, because OpenTofu supports variables in module sources and backend configurations. Replaced the "Does NOT work with" block with a note showing that OpenTofu accepts `-var` on `init` and `validate` for those cases, with example commands.

## Review Notes

- The `tofu import -var=… aws_instance.web i-123456` example is syntactically valid; the bracketed `import` form (`tofu import 'aws_instance.web[0]' …`) and the newer `import { ... }` block syntax are both available, but a plain resource address as shown is fine.
- The CI/CD example uses `TF_VAR_DB_PASSWORD`. On Linux this maps to a variable literally named `DB_PASSWORD`. By common Terraform/OpenTofu convention variables are snake_case (e.g., `db_password` → `TF_VAR_db_password`); the example is technically valid but unconventional. Left as-is since it is not incorrect.
- The post's reasoning for preferring `TF_VAR_` over `-var` for secrets (avoiding shell history and process listings) is accurate and matches official guidance.
- All complex-type examples (list, map, object) using JSON syntax inside single quotes are correct.
