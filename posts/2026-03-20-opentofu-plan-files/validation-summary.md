# Validation Summary: How to Save and Apply Plan Files in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (CLI: `tofu plan`, `tofu apply`, `tofu show`, `tofu init`)
- OpenTofu state/plan encryption (key_provider pbkdf2, method aes_gcm)
- HCL configuration language
- GitHub Actions (workflows, upload-artifact@v4, download-artifact@v4)
- Bash / shell

## Sources Consulted
- OpenTofu `tofu plan` docs: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `tofu apply` (saved plan mode): https://opentofu.org/docs/cli/commands/apply/#saved-plan-mode
- OpenTofu `tofu show` docs: https://opentofu.org/docs/cli/commands/show/
- OpenTofu state/plan encryption: https://opentofu.org/docs/language/state/encryption/
- OpenTofu source for stale plan error message (`internal/backend/local/backend_local.go`)
- GitHub Actions: actions/upload-artifact and actions/download-artifact release pages

## Issues Found
No technical issues found.

All commands (`tofu plan -out=<file>`, `tofu apply <planfile>`, `tofu show [-json] <planfile>`, `tofu init -input=false`, `tofu plan -out=tfplan -input=false`) match the official CLI documentation. The claim that `tofu apply <planfile>` skips confirmation and that `-auto-approve` is ignored in saved-plan mode is documented behavior. The encryption HCL example (key_provider "pbkdf2", method "aes_gcm", `plan { method = ... }` block, `keys = key_provider.pbkdf2.main`) matches the official OpenTofu encryption documentation example. The stale-plan error wording is a fair paraphrase of OpenTofu's actual error ("Saved plan is stale" + "The given plan file can no longer be applied because the state was changed by another operation after the plan was created."). The GitHub Actions `@v4` tags for upload-artifact and download-artifact are valid, supported versions.

## Review Notes
- The official docs prefer `tofu show -plan=<file>` flag form for `tofu show`, but the positional form `tofu show <file>` shown in the post also works and is widely used. No change needed.
- Plan files are technically opaque archives (described as "opaque file format" in docs); calling them "binary" is accurate enough for the audience.
- `actions/upload-artifact@v4` and `actions/download-artifact@v4` are current and supported, though newer majors exist for upload-artifact. `@v4` remains a stable, recommended version.
- The encryption example uses `var.encryption_passphrase` without showing the variable declaration; readers will need to define this variable themselves, but this is a reasonable abbreviation for a focused tutorial.
