# Validation Summary: How to Prevent Secrets from Appearing in Plan Output in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu language features for sensitive values
- OpenTofu write-only attributes and ephemerality
- HCL configuration
- AWS provider examples

## Sources Consulted
- OpenTofu Docs: Input Variables — https://opentofu.org/docs/language/values/variables/
- OpenTofu Docs: Output Values — https://opentofu.org/docs/language/values/outputs/
- OpenTofu Docs: `sensitive` Function — https://opentofu.org/docs/language/functions/sensitive/
- OpenTofu Docs: `nonsensitive` Function — https://opentofu.org/docs/language/functions/nonsensitive/
- OpenTofu Docs: Write-only attributes — https://opentofu.org/docs/v1.11/language/ephemerality/write-only-attributes/
- OpenTofu Docs: Ephemerality — https://opentofu.org/docs/v1.11/language/ephemerality/
- OpenTofu Docs: Command: plan — https://opentofu.org/docs/cli/commands/plan/
- OpenTofu Docs: Command: output — https://opentofu.org/docs/cli/commands/output/
- OpenTofu Docs: Command: show — https://opentofu.org/docs/v1.10/cli/commands/show/
- OpenTofu Docs: Sensitive Data in State — https://opentofu.org/docs/language/state/sensitive-data/
- AWS Provider Docs: `aws_iam_user_login_profile` — https://registry.terraform.io/providers/-/aws/latest/docs/resources/iam_user_login_profile

## Issues Found

1. **The write-only attributes section used the wrong OpenTofu version and an invalid resource example.** The post claimed write-only attributes were available in OpenTofu 1.10+ and used `aws_iam_user_login_profile` fields as if they were write-only. Official OpenTofu docs state write-only attributes are available from OpenTofu 1.11 onward, and the documented AWS example is `aws_secretsmanager_secret_version.secret_string_wo` with a companion version field. I replaced the section with a correct 1.11+ example.

2. **The `nonsensitive()` example did not actually demonstrate a value derived from sensitive data.** The original output only referenced `aws_db_instance.main.address` and `.port`, which are already non-sensitive in that snippet, so `nonsensitive()` was redundant and misleading. I changed the example to derive host and port from a sensitive JSON value, which matches the documented use case for `nonsensitive()`.

3. **Several statements overstated what `sensitive` guarantees.** The original text implied `sensitive = true` fully prevents disclosure in all plan/apply contexts and that the overall approach "ensures" secrets stay out of artifacts. OpenTofu docs explicitly note exceptions such as provider errors, provider-defined IDs, state, saved plans, and machine-readable output. I narrowed those claims to match the documented behavior.

4. **The CI example description overstated what the grep check validates.** The script only detects one pattern of unredacted password assignment in human-readable plan output; it does not prove that no secret leaked anywhere. I updated the description to reflect the actual behavior without changing the author's approach.

## Review Notes
- The `tofu output` example using `<sensitive>` is accurate for the `tofu output` command, while `tofu plan` and `tofu apply` commonly render sensitive values as `(sensitive value)`.
- Sensitive values are still stored in state unless you use ephemerality and provider-supported write-only attributes. If teams save plan files or use `tofu show -json`, those artifacts should also be treated as sensitive.
