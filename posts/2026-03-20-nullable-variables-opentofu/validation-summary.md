# Validation Summary: How to Use Nullable Variables in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (input variables, `nullable` attribute)
- HCL (HashiCorp Configuration Language)
- Terraform-compatible variable semantics
- AWS provider resources used as examples (`aws_s3_bucket_server_side_encryption_configuration`, `aws_instance`)
- OpenTofu built-in functions (`compact`, `coalesce`, `can`, `regex`)

## Sources Consulted
- OpenTofu — Input Variables / Disallowing Null Input Values: https://opentofu.org/docs/language/values/variables/#disallowing-null-input-values
- OpenTofu — Variables on the Command Line: https://opentofu.org/docs/language/values/variables/#variables-on-the-command-line
- OpenTofu — `compact` function: https://opentofu.org/docs/language/functions/compact/
- OpenTofu — `coalesce` function: https://opentofu.org/docs/language/functions/coalesce/
- Terraform mirrored docs (semantics are identical): https://developer.hashicorp.com/terraform/language/values/variables
- Terraform `compact`: https://developer.hashicorp.com/terraform/language/functions/compact

## Issues Found

1. **Misleading "OpenTofu rejects it" comment in the first nullable code block.** The example variable `required_tag` has a `default` set, so when a caller passes `null` with `nullable = false`, OpenTofu silently substitutes the default — it does not reject. Updated the inline comment to read: "If someone tries to set this to null, OpenTofu uses the default value instead."

2. **Incorrect / contradictory behavior description in the "nullable = false Behavior" section.** The original block listed an `Inappropriate value for attribute "value": null value is not allowed` error "OR" the default being used as if both could happen for the same variable. Per the docs, when `nullable = false` and a default exists, the default is always substituted — no error. The error case only occurs when there is *no* default. Rewrote the comment to clearly distinguish the two cases and corrected the error message wording to match OpenTofu's actual error (`Invalid value for variable: required variable may not be set to null`).

3. **Incorrect CLI example for passing `null` via `-var`.** The post claimed `tofu apply -var="optional_config=null"` would set the variable to actual `null`. Per the OpenTofu docs, `-var` values for primitive (string) types are treated as literal strings, so this would set the value to the four-character string `"null"`. To pass actual HCL `null` from the CLI for a string-typed variable, you must use a `.tfvars` file (or omit the variable). Updated the example to use a `.tfvars` file and added a note explaining the CLI gotcha.

## Review Notes

- The `compact()` example is technically accurate. OpenTofu's `compact` removes both empty strings AND null elements from a list of strings, which matches the post's claim.
- The `coalesce()` example is correct (returns the first non-null, non-empty argument).
- The validation block syntax (`condition` + `error_message`) and the use of `can(regex(...))` are current and correct.
- The AWS resource names used as examples (`aws_s3_bucket_server_side_encryption_configuration`, `apply_server_side_encryption_by_default`, `kms_master_key_id`) match the current AWS provider schema.
- The `default.postgres15` parameter group name is plausible but readers should note that AWS occasionally retires older PostgreSQL major versions; future readers may want to use a currently-supported family (e.g., `default.postgres16`).
- The post does not specify a minimum OpenTofu version. The `nullable` attribute was introduced in Terraform 1.1 and has been present in OpenTofu since its initial fork — no version caveat is strictly required, but a one-line note could help future readers.
